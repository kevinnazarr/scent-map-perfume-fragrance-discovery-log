export const FAMILIES = [
  'Floral',
  'Woody',
  'Citrus',
  'Oriental',
  'Fresh',
  'Aromatic',
] as const;
export type Family = (typeof FAMILIES)[number];

export const STATUSES = ['Tried', 'Own It', 'Want It'] as const;
export type Status = (typeof STATUSES)[number];

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface Fragrance {
  id: string;
  name: string;
  brand: string;
  family: Family;
  rating: Rating;
  description: string;
  status: Status;
}

export interface Draft {
  name: string;
  brand: string;
  family: string;
  rating: string;
  description: string;
  status: string;
}

export type Errors = Partial<Record<keyof Draft, string>>;

export type Validation =
  | { ok: true; value: Omit<Fragrance, 'id'> }
  | { ok: false; errors: Errors };

export interface Filters {
  q: string;
  family: Family | 'all';
  status: Status | 'all';
}

export interface Summary {
  total: number;
  own: number;
  want: number;
}

export const isFamily = (v: unknown): v is Family =>
  typeof v === 'string' && (FAMILIES as readonly string[]).includes(v);

export const isStatus = (v: unknown): v is Status =>
  typeof v === 'string' && (STATUSES as readonly string[]).includes(v);

export const isRating = (v: unknown): v is Rating =>
  v === 1 || v === 2 || v === 3 || v === 4 || v === 5;

export const norm = (s: string): string => s.trim().toLowerCase();

export function applyFilters(
  list: readonly Fragrance[],
  f: Filters,
): Fragrance[] {
  const n = norm(f.q);
  return list.filter(
    (e) =>
      (n === '' ||
        e.name.toLowerCase().includes(n) ||
        e.brand.toLowerCase().includes(n)) &&
      (f.family === 'all' || e.family === f.family) &&
      (f.status === 'all' || e.status === f.status),
  );
}

export const hasFilters = (f: Filters): boolean =>
  norm(f.q) !== '' || f.family !== 'all' || f.status !== 'all';

export function summarize(list: readonly Fragrance[]): Summary {
  let own = 0;
  let want = 0;
  for (const e of list) {
    if (e.status === 'Own It') own += 1;
    else if (e.status === 'Want It') want += 1;
  }
  return { total: list.length, own, want };
}

export const noses = (r: Rating): string => '👃'.repeat(r);

export const ratingText = (r: Rating): string => `${r} of 5 noses`;

export function parseRating(v: string): Rating | null {
  const t = v.trim();
  if (!/^[1-5]$/.test(t)) return null;
  return Number(t) as Rating;
}

export function validate(d: Draft): Validation {
  const errors: Errors = {};
  const name = d.name.trim();
  const brand = d.brand.trim();
  const desc = d.description.trim();
  const rating = parseRating(d.rating);

  if (name === '') errors.name = 'Name the fragrance.';
  else if (name.length > 64) errors.name = 'Keep the name under 64 characters.';
  if (brand === '') errors.brand = 'Add the brand or house.';
  else if (brand.length > 64) errors.brand = 'Keep the brand under 64 characters.';
  if (!isFamily(d.family)) errors.family = 'Choose a scent family.';
  if (rating === null) errors.rating = 'Pick 1 to 5 noses.';
  if (desc === '') errors.description = 'Add a short tasting note.';
  else if (desc.length < 4) errors.description = 'Write at least 4 characters.';
  else if (desc.length > 180) errors.description = 'Keep notes under 180 characters.';
  if (!isStatus(d.status)) errors.status = 'Pick Tried, Own It or Want It.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const family = d.family;
  const status = d.status;
  if (rating === null || !isFamily(family) || !isStatus(status)) {
    return {
      ok: false,
      errors: {
        family: 'Choose a scent family.',
        rating: 'Pick 1 to 5 noses.',
        status: 'Pick Tried, Own It or Want It.',
      },
    };
  }
  return {
    ok: true,
    value: { name, brand, family, rating, description: desc, status },
  };
}

export const toDraft = (e: Fragrance): Draft => ({
  name: e.name,
  brand: e.brand,
  family: e.family,
  rating: String(e.rating),
  description: e.description,
  status: e.status,
});

let seq = 0;

export const uid = (): string => {
  const c = globalThis.crypto;
  if (c !== undefined && typeof c.randomUUID === 'function') return c.randomUUID();
  seq += 1;
  return `f${Date.now().toString(36)}${seq.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
};

export function createEntry(
  value: Omit<Fragrance, 'id'>,
  id: string,
): Fragrance {
  return { id, ...value };
}

export const addEntry = (
  list: readonly Fragrance[],
  value: Omit<Fragrance, 'id'>,
  id: string = uid(),
): Fragrance[] => [{ id, ...value }, ...list];

export const updateEntry = (
  list: readonly Fragrance[],
  id: string,
  value: Omit<Fragrance, 'id'>,
): Fragrance[] => list.map((e) => (e.id === id ? { ...e, ...value } : e));

export const removeEntry = (
  list: readonly Fragrance[],
  id: string,
): Fragrance[] => list.filter((e) => e.id !== id);

export const findEntry = (
  list: readonly Fragrance[],
  id: string | null,
): Fragrance | null => {
  if (id === null) return null;
  return list.find((e) => e.id === id) ?? null;
};

export function describeFilters(f: Filters): string {
  const parts: string[] = [];
  const q = f.q.trim();
  if (q !== '') parts.push(`matching “${q}”`);
  if (f.family !== 'all') parts.push(`in ${f.family}`);
  if (f.status !== 'all') parts.push(`marked ${f.status}`);
  return parts.join(' ');
}
