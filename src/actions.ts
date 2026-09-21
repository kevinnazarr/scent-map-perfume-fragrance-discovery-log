import { EMPTY_FILTERS } from './state';
import type { Bank } from './state';
import {
  addEntry,
  applyFilters,
  createEntry,
  findEntry,
  hasFilters,
  removeEntry,
  updateEntry,
  validate,
  type Draft,
  type Filters,
} from './logic';
import { load, save } from './store';

export interface Actions {
  add(d: Draft): void;
  save(d: Draft): void;
  open(id: string): void;
  close(): void;
  create(): void;
  edit(): void;
  unedit(): void;
  ask(): void;
  unask(): void;
  drop(): void;
  q(v: string): void;
  fam(f: Filters['family']): void;
  sts(f: Filters['status']): void;
  clear(): void;
  hide(): void;
  hideWarn(): void;
}

export interface Hub {
  get(): Bank;
  on(fn: (b: Bank) => void): () => void;
  ready(entries: Bank['entries'], warn: string | null): void;
  act(): Actions;
}

const FIELDS: (keyof Draft)[] = [
  'name',
  'brand',
  'family',
  'rating',
  'description',
  'status',
];

const firstBad = (e: Partial<Record<keyof Draft, string>>): string => {
  for (const f of FIELDS) {
    if (e[f] !== undefined) return `f-${f}`;
  }
  return 'p-title';
};

export const OFF = {
  mode: 'off',
  id: null,
  draft: null,
  del: false,
  errors: {},
} as const;

export function hub(): Hub {
  let b: Bank = {
    entries: [],
    filters: { ...EMPTY_FILTERS },
    panel: { ...OFF, errors: {} },
    banner: null,
    warn: null,
    focus: null,
  };
  const ls = new Set<(b: Bank) => void>();

  const put = (p: Partial<Bank>): void => {
    b = { ...b, ...p };
    if (p.focus === undefined) b.focus = null;
    for (const fn of ls) fn(b);
  };

  const kept = (
    entries: Bank['entries'],
    filters: Filters,
    id: string,
  ): { filters: Filters; cut: boolean } => {
    if (applyFilters(entries, filters).some((e) => e.id === id)) {
      return { filters, cut: false };
    }
    return { filters: { ...EMPTY_FILTERS }, cut: hasFilters(filters) };
  };

  const dropWhenHidden = (filters: Filters): Partial<Bank> => {
    const open = findEntry(b.entries, b.panel.id);
    if (
      open !== null &&
      !applyFilters(b.entries, filters).some((e) => e.id === open.id)
    ) {
      return {
        filters,
        panel: { ...OFF, errors: {} },
        banner: {
          kind: 'info',
          text: `Closed “${open.name}” — it no longer matches the filters.`,
        },
        focus: null,
      };
    }
    return { filters };
  };

  const fail = (id: string | null): void => {
    put({
      panel: { ...OFF, errors: {} },
      banner: { kind: 'err', text: 'That fragrance is no longer in the log.' },
      focus: id === null ? 'add' : `c-${id}`,
    });
  };

  const act = (): Actions => ({
    add: (d) => {
      const v = validate(d);
      if (!v.ok) {
        put({
          panel: { mode: 'new', id: null, draft: { ...d }, del: false, errors: v.errors },
          banner: { kind: 'err', text: 'Check the highlighted fields.' },
          focus: firstBad(v.errors),
        });
        return;
      }
      const m = createEntry(v.value, `t${Date.now().toString(36)}`);
      const entries = addEntry(b.entries, v.value, m.id);
      const k = kept(entries, b.filters, m.id);
      const err = save(entries);
      put({
        entries,
        filters: k.filters,
        panel: { ...OFF, errors: {} },
        banner: err
          ? { kind: 'err', text: err }
          : {
              kind: 'ok',
              text: k.cut
                ? `Added “${m.name}”. Cleared the filters so it is visible.`
                : `Added “${m.name}” to the log.`,
            },
        focus: `c-${m.id}`,
      });
    },
    save: (d) => {
      const open = findEntry(b.entries, b.panel.id);
      if (open === null) {
        fail(null);
        return;
      }
      const v = validate(d);
      if (!v.ok) {
        put({
          panel: { mode: 'edit', id: open.id, draft: { ...d }, del: false, errors: v.errors },
          banner: { kind: 'err', text: 'Check the highlighted fields.' },
          focus: firstBad(v.errors),
        });
        return;
      }
      const entries = updateEntry(b.entries, open.id, v.value);
      const k = kept(entries, b.filters, open.id);
      const err = save(entries);
      put({
        entries,
        filters: k.filters,
        panel: { mode: 'view', id: open.id, draft: null, del: false, errors: {} },
        banner: err
          ? { kind: 'err', text: err }
          : {
              kind: 'ok',
              text: k.cut
                ? `Saved “${v.value.name}”. Cleared the filters so it is visible.`
                : `Saved “${v.value.name}”.`,
            },
        focus: `c-${open.id}`,
      });
    },
    open: (id) => {
      const e = findEntry(b.entries, id);
      if (e === null) {
        fail(null);
        return;
      }
      put({
        panel: { mode: 'view', id, draft: null, del: false, errors: {} },
        banner: null,
        focus: 'p-title',
      });
    },
    close: () => {
      if (b.panel.mode === 'off') return;
      const id = b.panel.id;
      put({
        panel: { ...OFF, errors: {} },
        focus: id === null ? 'add' : `c-${id}`,
      });
    },
    create: () => {
      put({
        panel: {
          mode: 'new',
          id: null,
          draft: { name: '', brand: '', family: '', rating: '', description: '', status: '' },
          del: false,
          errors: {},
        },
        banner: null,
        focus: 'f-name',
      });
    },
    edit: () => {
      const e = findEntry(b.entries, b.panel.id);
      if (e === null) {
        fail(null);
        return;
      }
      put({
        panel: {
          mode: 'edit',
          id: e.id,
          draft: {
            name: e.name,
            brand: e.brand,
            family: e.family,
            rating: String(e.rating),
            description: e.description,
            status: e.status,
          },
          del: false,
          errors: {},
        },
        focus: 'f-name',
      });
    },
    unedit: () => {
      put({
        panel: { mode: 'view', id: b.panel.id, draft: null, del: false, errors: {} },
        focus: 'p-edit',
      });
    },
    ask: () => {
      put({ panel: { ...b.panel, del: true }, focus: 'p-yes' });
    },
    unask: () => {
      put({ panel: { ...b.panel, del: false }, focus: 'p-del' });
    },
    drop: () => {
      const e = findEntry(b.entries, b.panel.id);
      if (e === null) {
        fail(null);
        return;
      }
      const vis = applyFilters(b.entries, b.filters);
      const at = vis.findIndex((x) => x.id === e.id);
      const rest = vis.filter((x) => x.id !== e.id);
      const next = rest[Math.max(at, 0)] ?? rest[0] ?? null;
      const entries = removeEntry(b.entries, e.id);
      const err = save(entries);
      put({
        entries,
        panel: { ...OFF, errors: {} },
        banner: err
          ? { kind: 'err', text: err }
          : { kind: 'ok', text: `Removed “${e.name}” from the log.` },
        focus: next === null ? 'add' : `c-${next.id}`,
      });
    },
    q: (v) => {
      put(dropWhenHidden({ ...b.filters, q: v }));
    },
    fam: (f) => {
      put(dropWhenHidden({ ...b.filters, family: f }));
    },
    sts: (f) => {
      put(dropWhenHidden({ ...b.filters, status: f }));
    },
    clear: () => {
      put(dropWhenHidden({ ...EMPTY_FILTERS }));
    },
    hide: () => {
      put({ banner: null });
    },
    hideWarn: () => {
      put({ warn: null });
    },
  });

  return {
    get: () => b,
    on: (fn) => {
      ls.add(fn);
      return () => {
        ls.delete(fn);
      };
    },
    ready: (entries, warn) => {
      put({ entries, warn });
    },
    act: () => act(),
  };
}

export function boot(h: Hub): void {
  globalThis.setTimeout(() => {
    const r = load();
    h.ready(r.entries, r.message);
  }, 160);
}
