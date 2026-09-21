import {
  DRAFT_FIELD_ORDER,
  EMPTY_DRAFT,
  EMPTY_FILTERS,
  HYDRATION_DELAY_MS,
} from '../constants';
import {
  addFragrance,
  applyFilters,
  createFragrance,
  findFragrance,
  hasActiveFilters,
  removeFragrance,
  summarize,
  toDraft,
  updateFragrance,
  validateFragranceDraft,
} from '../features/fragrances/logic';
import { loadCollection, saveCollection } from '../services/storage';
import type { LoadResult } from '../services/storage';
import type {
  CollectionSummary,
  DraftField,
  Filters,
  Fragrance,
  FragranceDraft,
  FragranceStatus,
  ScentFamily,
  ValidationErrors,
} from '../types/fragrance';

export type PanelMode = 'closed' | 'create' | 'detail' | 'edit';
export type BannerKind = 'success' | 'error' | 'warning' | 'info';

export interface Banner {
  kind: BannerKind;
  message: string;
}

export interface PanelState {
  mode: PanelMode;
  id: string | null;
  draft: FragranceDraft | null;
  confirmingDelete: boolean;
  errors: ValidationErrors;
}

export interface AppState {
  phase: 'hydrating' | 'ready';
  entries: Fragrance[];
  filters: Filters;
  visible: Fragrance[];
  summary: CollectionSummary;
  panel: PanelState;
  banner: Banner | null;
  storageNotice: string | null;
  focus: string | null;
}

export type Listener = (state: AppState) => void;

const CLOSED_PANEL: PanelState = {
  mode: 'closed',
  id: null,
  draft: null,
  confirmingDelete: false,
  errors: {},
};

function firstInvalidFocus(errors: ValidationErrors): string | null {
  for (const field of DRAFT_FIELD_ORDER) {
    if (errors[field] !== undefined) return `field:${field}`;
  }
  return null;
}

export interface Store {
  getState(): AppState;
  subscribe(listener: Listener): () => void;
  hydrate(): Promise<void>;
  addFromDraft(draft: FragranceDraft): void;
  saveEditedDraft(draft: FragranceDraft): void;
  setDraftField(field: DraftField, value: string): void;
  openDetail(id: string): void;
  closePanel(): void;
  startCreate(): void;
  startEdit(): void;
  cancelEdit(): void;
  requestDelete(): void;
  cancelDelete(): void;
  confirmDelete(): void;
  setQuery(query: string): void;
  setFamilyFilter(family: ScentFamily | 'all'): void;
  setStatusFilter(status: FragranceStatus | 'all'): void;
  clearCriteria(): void;
  dismissBanner(): void;
  dismissStorageNotice(): void;
}

async function loadInitialState(): Promise<LoadResult> {
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, HYDRATION_DELAY_MS);
  });

  return loadCollection();
}

export function createStore(): Store {
  let state: AppState = {
    phase: 'hydrating',
    entries: [],
    filters: { ...EMPTY_FILTERS },
    visible: [],
    summary: summarize([]),
    panel: CLOSED_PANEL,
    banner: null,
    storageNotice: null,
    focus: null,
  };

  const listeners = new Set<Listener>();

  function derive(next: AppState): AppState {
    return {
      ...next,
      visible: applyFilters(next.entries, next.filters),
      summary: summarize(next.entries),
    };
  }

  function commit(patch: Partial<AppState> & { focus?: string | null }): void {
    state = derive({ ...state, ...patch, focus: patch.focus ?? null });
    for (const listener of listeners) {
      listener(state);
    }
  }

  function persist(entries: Fragrance[]): Banner | null {
    const result = saveCollection(entries);
    if (result.ok) return null;

    return {
      kind: 'error',
      message: result.message ?? 'Scent Map could not save your change.',
    };
  }

  function ensureVisible(
    entries: Fragrance[],
    filters: Filters,
    id: string,
  ): { filters: Filters; cleared: boolean } {
    const stillVisible = applyFilters(entries, filters).some(
      (entry) => entry.id === id,
    );

    if (stillVisible) return { filters, cleared: false };

    return { filters: { ...EMPTY_FILTERS }, cleared: hasActiveFilters(filters) };
  }

  function withCriteria(filters: Filters): Partial<AppState> {
    const openEntry = findFragrance(state.entries, state.panel.id);
    const visible = applyFilters(state.entries, filters);

    if (openEntry !== null && !visible.some((entry) => entry.id === openEntry.id)) {
      return {
        filters,
        panel: CLOSED_PANEL,
        banner: {
          kind: 'info',
          message: `Closed the details for “${openEntry.name}” because it no longer matches your search and filters.`,
        },
        focus: null,
      };
    }

    return { filters };
  }

  async function hydrate(): Promise<void> {
    const result = await loadInitialState();

    commit({
      phase: 'ready',
      entries: result.entries,
      storageNotice: result.message,
    });
  }

  function addFromDraft(draft: FragranceDraft): void {
    const result = validateFragranceDraft(draft);

    if (!result.valid) {
      commit({
        panel: {
          mode: 'create',
          id: null,
          draft: { ...draft },
          confirmingDelete: false,
          errors: result.errors,
        },
        banner: {
          kind: 'error',
          message:
            'That entry needs a little more information — check the highlighted fields.',
        },
        focus: firstInvalidFocus(result.errors) ?? 'panel-heading',
      });
      return;
    }

    const created = createFragrance(result.value);
    const entries = addFragrance(state.entries, created);
    const { filters, cleared } = ensureVisible(entries, state.filters, created.id);
    const storageBanner = persist(entries);

    commit({
      entries,
      filters,
      panel: CLOSED_PANEL,
      banner: storageBanner ?? {
        kind: 'success',
        message: cleared
          ? `Added “${created.name}”. Cleared your search and filters so you can see it.`
          : `Added “${created.name}” to your log.`,
      },
      focus: `card:${created.id}`,
    });
  }

  function saveEditedDraft(draft: FragranceDraft): void {
    const entry = findFragrance(state.entries, state.panel.id);

    if (entry === null) {
      commit({
        panel: CLOSED_PANEL,
        banner: {
          kind: 'error',
          message: 'That fragrance is no longer in your log, so nothing was saved.',
        },
      });
      return;
    }

    const result = validateFragranceDraft(draft);

    if (!result.valid) {
      commit({
        panel: {
          mode: 'edit',
          id: entry.id,
          draft: { ...draft },
          confirmingDelete: false,
          errors: result.errors,
        },
        banner: {
          kind: 'error',
          message:
            'Those changes need a little more information — check the highlighted fields.',
        },
        focus: firstInvalidFocus(result.errors) ?? 'panel-heading',
      });
      return;
    }

    const entries = updateFragrance(state.entries, entry.id, result.value);
    const { filters, cleared } = ensureVisible(entries, state.filters, entry.id);
    const storageBanner = persist(entries);

    commit({
      entries,
      filters,
      panel: { mode: 'detail', id: entry.id, draft: null, confirmingDelete: false, errors: {} },
      banner: storageBanner ?? {
        kind: 'success',
        message: cleared
          ? `Saved “${result.value.name}”. Cleared your search and filters so you can see it.`
          : `Saved your changes to “${result.value.name}”.`,
      },
      focus: `card:${entry.id}`,
    });
  }

  function openDetail(id: string): void {
    const entry = findFragrance(state.entries, id);

    if (entry === null) {
      commit({
        panel: CLOSED_PANEL,
        banner: { kind: 'error', message: 'That fragrance is no longer in your log.' },
      });
      return;
    }

    commit({
      panel: { mode: 'detail', id: entry.id, draft: null, confirmingDelete: false, errors: {} },
      banner: null,
      focus: 'panel-heading',
    });
  }

  function closePanel(): void {
    if (state.panel.mode === 'closed') return;

    commit({
      panel: CLOSED_PANEL,
      focus: state.panel.id !== null ? `card:${state.panel.id}` : 'add',
    });
  }

  function startCreate(): void {
    commit({
      panel: {
        mode: 'create',
        id: null,
        draft: { ...EMPTY_DRAFT },
        confirmingDelete: false,
        errors: {},
      },
      banner: null,
      focus: 'field:name',
    });
  }

  function startEdit(): void {
    const entry = findFragrance(state.entries, state.panel.id);

    if (entry === null) {
      commit({
        panel: CLOSED_PANEL,
        banner: { kind: 'error', message: 'That fragrance is no longer in your log.' },
      });
      return;
    }

    commit({
      panel: {
        mode: 'edit',
        id: entry.id,
        draft: toDraft(entry),
        confirmingDelete: false,
        errors: {},
      },
      focus: 'field:name',
    });
  }

  function cancelEdit(): void {
    commit({
      panel: {
        mode: 'detail',
        id: state.panel.id,
        draft: null,
        confirmingDelete: false,
        errors: {},
      },
      focus: 'panel-edit',
    });
  }

  function setDraftField(field: DraftField, value: string): void {
    const draft = state.panel.draft;
    if (draft === null) return;

    state = { ...state, panel: { ...state.panel, draft: { ...draft, [field]: value } } };
  }

  function requestDelete(): void {
    commit({
      panel: { ...state.panel, confirmingDelete: true },
      focus: 'confirm-delete',
    });
  }

  function cancelDelete(): void {
    commit({
      panel: { ...state.panel, confirmingDelete: false },
      focus: 'panel-delete',
    });
  }

  function confirmDelete(): void {
    const entry = findFragrance(state.entries, state.panel.id);

    if (entry === null) {
      commit({
        panel: CLOSED_PANEL,
        banner: { kind: 'error', message: 'That fragrance is no longer in your log.' },
      });
      return;
    }

    const position = state.visible.findIndex((item) => item.id === entry.id);
    const remaining = state.visible.filter((item) => item.id !== entry.id);
    const next = remaining[Math.max(position, 0)] ?? remaining[0] ?? null;

    const entries = removeFragrance(state.entries, entry.id);
    const storageBanner = persist(entries);

    commit({
      entries,
      panel: CLOSED_PANEL,
      banner: storageBanner ?? {
        kind: 'success',
        message: `Removed “${entry.name}” from your log.`,
      },
      focus: next !== null ? `card:${next.id}` : 'add',
    });
  }

  function setQuery(query: string): void {
    commit(withCriteria({ ...state.filters, query }));
  }

  function setFamilyFilter(family: ScentFamily | 'all'): void {
    commit(withCriteria({ ...state.filters, family }));
  }

  function setStatusFilter(status: FragranceStatus | 'all'): void {
    commit(withCriteria({ ...state.filters, status }));
  }

  function clearCriteria(): void {
    commit(withCriteria({ ...EMPTY_FILTERS }));
  }

  function dismissBanner(): void {
    commit({ banner: null });
  }

  function dismissStorageNotice(): void {
    commit({ storageNotice: null });
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate,
    addFromDraft,
    saveEditedDraft,
    setDraftField,
    openDetail,
    closePanel,
    startCreate,
    startEdit,
    cancelEdit,
    requestDelete,
    cancelDelete,
    confirmDelete,
    setQuery,
    setFamilyFilter,
    setStatusFilter,
    clearCriteria,
    dismissBanner,
    dismissStorageNotice,
  };
}
