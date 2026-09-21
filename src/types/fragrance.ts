export const SCENT_FAMILIES = [
  'Floral',
  'Woody',
  'Citrus',
  'Oriental',
  'Fresh',
  'Aromatic',
] as const;

export type ScentFamily = (typeof SCENT_FAMILIES)[number];

export const FRAGRANCE_STATUSES = ['Tried', 'Own It', 'Want It'] as const;

export type FragranceStatus = (typeof FRAGRANCE_STATUSES)[number];

export const RATINGS = [1, 2, 3, 4, 5] as const;

export type Rating = (typeof RATINGS)[number];

export interface Fragrance {
  id: string;
  name: string;
  brand: string;
  family: ScentFamily;
  rating: Rating;
  description: string;
  status: FragranceStatus;
}

export type FragranceInput = Omit<Fragrance, 'id'>;

export interface FragranceDraft {
  name: string;
  brand: string;
  family: string;
  rating: string;
  description: string;
  status: string;
}

export type DraftField = keyof FragranceDraft;

export type ValidationErrors = Partial<Record<DraftField, string>>;

export type ValidationResult =
  | { valid: true; value: FragranceInput }
  | { valid: false; errors: ValidationErrors };

export interface Filters {
  query: string;
  family: ScentFamily | 'all';
  status: FragranceStatus | 'all';
}

export interface CollectionSummary {
  total: number;
  owned: number;
  wanted: number;
  tried: number;
}

export function isScentFamily(value: unknown): value is ScentFamily {
  return (
    typeof value === 'string' &&
    (SCENT_FAMILIES as readonly string[]).includes(value)
  );
}

export function isFragranceStatus(value: unknown): value is FragranceStatus {
  return (
    typeof value === 'string' &&
    (FRAGRANCE_STATUSES as readonly string[]).includes(value)
  );
}

export function isRating(value: unknown): value is Rating {
  return (
    typeof value === 'number' &&
    (RATINGS as readonly number[]).includes(value)
  );
}
