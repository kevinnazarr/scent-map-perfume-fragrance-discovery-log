import type { Draft, Errors, Filters, Fragrance } from './logic';

export type PanelMode = 'off' | 'new' | 'view' | 'edit';
export type BannerKind = 'ok' | 'err' | 'warn' | 'info';

export interface Banner {
  kind: BannerKind;
  text: string;
}

export interface Panel {
  mode: PanelMode;
  id: string | null;
  draft: Draft | null;
  del: boolean;
  errors: Errors;
}

export interface Bank {
  entries: Fragrance[];
  filters: Filters;
  panel: Panel;
  banner: Banner | null;
  warn: string | null;
  focus: string | null;
}

export interface State {
  phase: 'load' | 'ready';
  bank: Bank;
  visible: Fragrance[];
  sum: { total: number; own: number; want: number };
}

export const EMPTY_FILTERS: Filters = { q: '', family: 'all', status: 'all' };

export const EMPTY_PANEL: Panel = {
  mode: 'off',
  id: null,
  draft: null,
  del: false,
  errors: {},
};

export function emptyBank(): Bank {
  return {
    entries: [],
    filters: { ...EMPTY_FILTERS },
    panel: { ...EMPTY_PANEL },
    banner: null,
    warn: null,
    focus: null,
  };
}
