import {
  isFamily,
  isRating,
  isStatus,
  type Fragrance,
  type Rating,
} from './logic';

export const KEY = 'scent-map.v1';

export type Issue = 'unavailable' | 'malformed' | 'partial';

export interface Loaded {
  entries: Fragrance[];
  issue: Issue | null;
  message: string | null;
}

const BER = {
  unavailable:
    'This browser is blocking storage, so changes cannot be saved. You can still browse this session.',
  malformed:
    'Saved data could not be read, so the log opened empty. The unreadable value was left untouched.',
  one: 'One saved entry could not be read and was skipped. The rest loaded normally.',
  many: 'saved entries could not be read and were skipped. The rest loaded normally.',
  write:
    'Could not save to this browser — storage may be blocked or full. The change stays on screen but will be lost on refresh.',
};

const store = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const obj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
};

const rating = (v: unknown): Rating | null => {
  if (isRating(v)) return v;
  if (typeof v === 'string' && /^[1-5]$/.test(v.trim())) {
    return Number(v.trim()) as Rating;
  }
  return null;
};

export const toEntry = (v: unknown): Fragrance | null => {
  if (!obj(v)) return null;
  const id = str(v['id']);
  const name = str(v['name']);
  const brand = str(v['brand']);
  const desc = str(v['description']);
  const r = rating(v['rating']);
  const family = v['family'];
  const status = v['status'];
  if (id === null || name === null || brand === null || desc === null) return null;
  if (r === null || !isFamily(family) || !isStatus(status)) return null;
  return { id, name, brand, family, rating: r, description: desc, status };
};

export function parse(raw: string): {
  entries: Fragrance[];
  bad: number;
  broken: boolean;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { entries: [], bad: 0, broken: true };
  }
  const list =
    Array.isArray(parsed) || !obj(parsed) || !Array.isArray(parsed['entries'])
      ? Array.isArray(parsed)
        ? parsed
        : null
      : parsed['entries'];
  if (list === null) return { entries: [], bad: 0, broken: true };
  const entries: Fragrance[] = [];
  let bad = 0;
  for (const item of list) {
    const e = toEntry(item);
    if (e === null) bad += 1;
    else entries.push(e);
  }
  return { entries, bad, broken: false };
}

export function load(): Loaded {
  const s = store();
  if (s === null) return { entries: [], issue: 'unavailable', message: BER.unavailable };
  let raw: string | null;
  try {
    raw = s.getItem(KEY);
  } catch {
    return { entries: [], issue: 'unavailable', message: BER.unavailable };
  }
  if (raw === null) return { entries: [], issue: null, message: null };
  const p = parse(raw);
  if (p.broken) return { entries: [], issue: 'malformed', message: BER.malformed };
  if (p.bad > 0) {
    return {
      entries: p.entries,
      issue: 'partial',
      message: p.bad === 1 ? BER.one : `${p.bad} ${BER.many}`,
    };
  }
  return { entries: p.entries, issue: null, message: null };
}

let last = '';

export function save(list: readonly Fragrance[]): string | null {
  const raw = JSON.stringify({ v: 1, entries: [...list] });
  if (raw === last) return null;
  const s = store();
  if (s === null) return BER.unavailable;
  try {
    s.setItem(KEY, raw);
    last = raw;
    return null;
  } catch {
    return BER.write;
  }
}

export function resetMemo(): void {
  last = '';
}
