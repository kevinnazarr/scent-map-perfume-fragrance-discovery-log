import type { Filters, FragranceDraft, FragranceStatus, Rating, ScentFamily, DraftField } from './types/fragrance';

export const STORAGE_KEY = 'scent-map.fragrance-log.v1';
export const STORAGE_VERSION = 1;

export const HYDRATION_DELAY_MS = 160;

export const FILTER_ALL = 'all' as const;

export const EMPTY_FILTERS: Filters = {
  query: '',
  family: FILTER_ALL,
  status: FILTER_ALL,
};

/** A blank form, before the user has typed anything. */
export const EMPTY_DRAFT: FragranceDraft = {
  name: '',
  brand: '',
  family: '',
  rating: '',
  description: '',
  status: '',
};

/** Field order drives both validation focus and the error summary. */
export const DRAFT_FIELD_ORDER: readonly DraftField[] = [
  'name',
  'brand',
  'family',
  'rating',
  'description',
  'status',
];

/** Stable id for the inline detail/edit panel, referenced by card buttons. */
export const PANEL_ID = 'fragrance-panel';

export const FIELD_LIMITS = {
  name: { max: 64 },
  brand: { max: 64 },
  description: { min: 4, max: 180 },
} as const;

export const NOSE_EMOJI = '👃';

export const RATING_DESCRIPTIONS: Record<Rating, string> = {
  1: 'Not for me',
  2: 'Pleasant, not personal',
  3: 'I enjoy it',
  4: 'I love it',
  5: 'Signature scent',
};

export interface FamilyMeta {
  readonly value: ScentFamily;
  readonly label: string;
  readonly cssKey: string;
  readonly notes: string;
}

export const FAMILY_META: readonly FamilyMeta[] = [
  { value: 'Floral', label: 'Floral', cssKey: 'floral', notes: 'rose, jasmine, peony' },
  { value: 'Woody', label: 'Woody', cssKey: 'woody', notes: 'cedar, sandalwood, oud' },
  { value: 'Citrus', label: 'Citrus', cssKey: 'citrus', notes: 'bergamot, neroli, yuzu' },
  { value: 'Oriental', label: 'Oriental', cssKey: 'oriental', notes: 'amber, vanilla, incense' },
  { value: 'Fresh', label: 'Fresh', cssKey: 'fresh', notes: 'sea salt, mint, green tea' },
  { value: 'Aromatic', label: 'Aromatic', cssKey: 'aromatic', notes: 'lavender, sage, vetiver' },
];

const FAMILY_BY_VALUE = new Map<ScentFamily, FamilyMeta>(
  FAMILY_META.map((meta) => [meta.value, meta]),
);

export function familyMeta(family: ScentFamily): FamilyMeta {
  const meta = FAMILY_BY_VALUE.get(family);
  if (meta === undefined) {
    return { value: family, label: family, cssKey: 'aromatic', notes: '' };
  }
  return meta;
}

export interface StatusMeta {
  readonly value: FragranceStatus;
  readonly label: string;
  readonly cssKey: string;
  readonly hint: string;
}

export const STATUS_META: readonly StatusMeta[] = [
  { value: 'Tried', label: 'Tried', cssKey: 'tried', hint: 'sampled it at least once' },
  { value: 'Own It', label: 'Own It', cssKey: 'own', hint: 'a bottle lives with you' },
  { value: 'Want It', label: 'Want It', cssKey: 'want', hint: 'on your wishlist' },
];

const STATUS_BY_VALUE = new Map<FragranceStatus, StatusMeta>(
  STATUS_META.map((meta) => [meta.value, meta]),
);

export function statusMeta(status: FragranceStatus): StatusMeta {
  const meta = STATUS_BY_VALUE.get(status);
  if (meta === undefined) {
    return { value: status, label: status, cssKey: 'tried', hint: '' };
  }
  return meta;
}
