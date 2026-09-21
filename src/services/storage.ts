import { STORAGE_KEY, STORAGE_VERSION } from '../constants';
import {
  isFragranceStatus,
  isRating,
  isScentFamily,
  type Fragrance,
  type Rating,
} from '../types/fragrance';

export type StorageIssue = 'unavailable' | 'malformed' | 'partial';

export interface LoadResult {
  entries: Fragrance[];
  issue: StorageIssue | null;
  message: string | null;
}

export interface SaveResult {
  ok: boolean;
  message: string | null;
}

interface CollectionEnvelope {
  version: number;
  entries: Fragrance[];
}

interface ParsedCollection {
  entries: Fragrance[];
  discarded: number;
  malformed: boolean;
}

const MESSAGES = {
  unavailable:
    'This browser is blocking local storage, so Scent Map cannot save changes. You can keep browsing this session, but nothing will survive a refresh.',
  malformed:
    'Your saved Scent Map data could not be read, so the log opened empty. The unreadable data was left untouched in this browser.',
  partialSingular:
    'One saved entry could not be understood and was skipped. The rest of your log loaded normally.',
  partialPlural:
    'saved entries could not be understood and were skipped. The rest of your log loaded normally.',
  writeFailed:
    'Scent Map could not save to this browser — storage may be blocked or full. Your change is on screen but will be lost if you refresh.',
} as const;

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRating(value: unknown): Rating | null {
  if (isRating(value)) return value;

  if (typeof value === 'string' && /^[1-5]$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return isRating(parsed) ? parsed : null;
  }

  return null;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function toFragrance(value: unknown): Fragrance | null {
  if (!isPlainObject(value)) return null;

  const id = toNonEmptyString(value['id']);
  const name = toNonEmptyString(value['name']);
  const brand = toNonEmptyString(value['brand']);
  const description = toNonEmptyString(value['description']);
  const rating = toRating(value['rating']);
  const family = value['family'];
  const status = value['status'];

  if (id === null || name === null || brand === null || description === null) {
    return null;
  }
  if (rating === null || !isScentFamily(family) || !isFragranceStatus(status)) {
    return null;
  }

  return { id, name, brand, description, family, rating, status };
}

export function parseCollection(raw: string): ParsedCollection {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { entries: [], discarded: 0, malformed: true };
  }

  const list = Array.isArray(parsed)
    ? parsed
    : isPlainObject(parsed) && Array.isArray(parsed['entries'])
      ? parsed['entries']
      : null;

  if (list === null) {
    return { entries: [], discarded: 0, malformed: true };
  }

  const entries: Fragrance[] = [];
  let discarded = 0;

  for (const item of list) {
    const entry = toFragrance(item);
    if (entry === null) discarded += 1;
    else entries.push(entry);
  }

  return { entries, discarded, malformed: false };
}

export function loadCollection(): LoadResult {
  const storage = getStorage();

  if (storage === null) {
    return { entries: [], issue: 'unavailable', message: MESSAGES.unavailable };
  }

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { entries: [], issue: 'unavailable', message: MESSAGES.unavailable };
  }

  if (raw === null) {
    return { entries: [], issue: null, message: null };
  }

  const parsed = parseCollection(raw);

  if (parsed.malformed) {
    return { entries: [], issue: 'malformed', message: MESSAGES.malformed };
  }

  if (parsed.discarded > 0) {
    const message =
      parsed.discarded === 1
        ? MESSAGES.partialSingular
        : `${parsed.discarded} ${MESSAGES.partialPlural}`;

    return { entries: parsed.entries, issue: 'partial', message };
  }

  return { entries: parsed.entries, issue: null, message: null };
}

let lastSerialized: string | null = null;

export function saveCollection(entries: readonly Fragrance[]): SaveResult {
  const envelope: CollectionEnvelope = {
    version: STORAGE_VERSION,
    entries: [...entries],
  };
  const serialized = JSON.stringify(envelope);

  if (serialized === lastSerialized) {
    return { ok: true, message: null };
  }

  const storage = getStorage();
  if (storage === null) {
    return { ok: false, message: MESSAGES.unavailable };
  }

  try {
    storage.setItem(STORAGE_KEY, serialized);
    lastSerialized = serialized;
    return { ok: true, message: null };
  } catch {
    return { ok: false, message: MESSAGES.writeFailed };
  }
}

export function resetPersistenceMemo(): void {
  lastSerialized = null;
}
