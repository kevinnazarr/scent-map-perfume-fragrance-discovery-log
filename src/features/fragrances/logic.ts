import { FIELD_LIMITS, NOSE_EMOJI, RATING_DESCRIPTIONS } from '../../constants';
import {
  isFragranceStatus,
  isRating,
  isScentFamily,
  type CollectionSummary,
  type Filters,
  type Fragrance,
  type FragranceDraft,
  type FragranceInput,
  type FragranceStatus,
  type Rating,
  type ScentFamily,
  type ValidationErrors,
  type ValidationResult,
} from '../../types/fragrance';
import { createId } from '../../utils/id';

const MESSAGES = {
  nameRequired: 'Name the fragrance so you can find it again.',
  nameTooLong: `Keep the name under ${FIELD_LIMITS.name.max} characters.`,
  brandRequired: 'Add the brand or house — for example, “Diptyque”.',
  brandTooLong: `Keep the brand under ${FIELD_LIMITS.brand.max} characters.`,
  familyRequired: 'Choose the scent family that fits best.',
  ratingRequired: 'Pick a rating from 1 to 5 noses.',
  descriptionRequired: 'Add a short tasting note about the scent.',
  descriptionTooShort: `Write at least ${FIELD_LIMITS.description.min} characters so the note is useful later.`,
  descriptionTooLong: `Keep notes under ${FIELD_LIMITS.description.max} characters — tasting notes read best when short.`,
  statusRequired: 'Mark it as Tried, Own It, or Want It.',
} as const;

export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function matchesNormalized(entry: Fragrance, needle: string): boolean {
  return (
    entry.name.toLowerCase().includes(needle) ||
    entry.brand.toLowerCase().includes(needle)
  );
}

export function matchesQuery(entry: Fragrance, query: string): boolean {
  const needle = normalizeQuery(query);
  return needle === '' || matchesNormalized(entry, needle);
}

export function searchFragrances(
  entries: readonly Fragrance[],
  query: string,
): Fragrance[] {
  const needle = normalizeQuery(query);
  if (needle === '') return [...entries];

  return entries.filter((entry) => matchesNormalized(entry, needle));
}

export function filterByFamily(
  entries: readonly Fragrance[],
  family: ScentFamily | 'all',
): Fragrance[] {
  if (family === 'all') return [...entries];
  return entries.filter((entry) => entry.family === family);
}

export function filterByStatus(
  entries: readonly Fragrance[],
  status: FragranceStatus | 'all',
): Fragrance[] {
  if (status === 'all') return [...entries];
  return entries.filter((entry) => entry.status === status);
}

export function applyFilters(
  entries: readonly Fragrance[],
  filters: Filters,
): Fragrance[] {
  const needle = normalizeQuery(filters.query);

  return entries.filter((entry) => {
    if (needle !== '' && !matchesNormalized(entry, needle)) return false;
    if (filters.family !== 'all' && entry.family !== filters.family) return false;
    if (filters.status !== 'all' && entry.status !== filters.status) return false;
    return true;
  });
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    normalizeQuery(filters.query) !== '' ||
    filters.family !== 'all' ||
    filters.status !== 'all'
  );
}

export function describeFilters(filters: Filters): string {
  const parts: string[] = [];
  const query = filters.query.trim();

  if (query !== '') parts.push(`matching “${query}”`);
  if (filters.family !== 'all') parts.push(`in the ${filters.family} family`);
  if (filters.status !== 'all') parts.push(`marked ${filters.status}`);

  return parts.join(' ');
}

export function summarize(entries: readonly Fragrance[]): CollectionSummary {
  let owned = 0;
  let wanted = 0;
  let tried = 0;

  for (const entry of entries) {
    if (entry.status === 'Own It') owned += 1;
    else if (entry.status === 'Want It') wanted += 1;
    else tried += 1;
  }

  return { total: entries.length, owned, wanted, tried };
}

export function ratingToNoses(rating: Rating): string {
  return NOSE_EMOJI.repeat(rating);
}

export function describeRating(rating: Rating): string {
  return `${rating} of 5 noses — ${RATING_DESCRIPTIONS[rating]}`;
}

export function parseRatingInput(value: string): Rating | null {
  const trimmed = value.trim();
  if (!/^[1-5]$/.test(trimmed)) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return isRating(parsed) ? parsed : null;
}

export function validateFragranceDraft(draft: FragranceDraft): ValidationResult {
  const errors: ValidationErrors = {};

  const name = draft.name.trim();
  const brand = draft.brand.trim();
  const description = draft.description.trim();
  const rating = parseRatingInput(draft.rating);

  if (name === '') errors.name = MESSAGES.nameRequired;
  else if (name.length > FIELD_LIMITS.name.max) errors.name = MESSAGES.nameTooLong;

  if (brand === '') errors.brand = MESSAGES.brandRequired;
  else if (brand.length > FIELD_LIMITS.brand.max)
    errors.brand = MESSAGES.brandTooLong;

  if (!isScentFamily(draft.family)) errors.family = MESSAGES.familyRequired;
  if (rating === null) errors.rating = MESSAGES.ratingRequired;

  if (description === '') errors.description = MESSAGES.descriptionRequired;
  else if (description.length < FIELD_LIMITS.description.min)
    errors.description = MESSAGES.descriptionTooShort;
  else if (description.length > FIELD_LIMITS.description.max)
    errors.description = MESSAGES.descriptionTooLong;

  if (!isFragranceStatus(draft.status)) errors.status = MESSAGES.statusRequired;

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const family = draft.family;
  const status = draft.status;

  if (rating === null || !isScentFamily(family) || !isFragranceStatus(status)) {
    return {
      valid: false,
      errors: {
        family: MESSAGES.familyRequired,
        rating: MESSAGES.ratingRequired,
        status: MESSAGES.statusRequired,
      },
    };
  }

  return {
    valid: true,
    value: { name, brand, description, family, rating, status },
  };
}

export function toDraft(entry: Fragrance): FragranceDraft {
  return {
    name: entry.name,
    brand: entry.brand,
    family: entry.family,
    rating: String(entry.rating),
    description: entry.description,
    status: entry.status,
  };
}

export function createFragrance(
  input: FragranceInput,
  id: string = createId(),
): Fragrance {
  return { id, ...input };
}

export function addFragrance(
  entries: readonly Fragrance[],
  entry: Fragrance,
): Fragrance[] {
  return [entry, ...entries];
}

export function updateFragrance(
  entries: readonly Fragrance[],
  id: string,
  input: FragranceInput,
): Fragrance[] {
  return entries.map((entry) =>
    entry.id === id ? { ...entry, ...input } : entry,
  );
}

export function removeFragrance(
  entries: readonly Fragrance[],
  id: string,
): Fragrance[] {
  return entries.filter((entry) => entry.id !== id);
}

export function findFragrance(
  entries: readonly Fragrance[],
  id: string | null,
): Fragrance | null {
  if (id === null) return null;
  return entries.find((entry) => entry.id === id) ?? null;
}
