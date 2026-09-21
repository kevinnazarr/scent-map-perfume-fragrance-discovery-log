// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEY, STORAGE_VERSION } from '../constants';
import type { Fragrance } from '../types/fragrance';
import {
  loadCollection,
  parseCollection,
  resetPersistenceMemo,
  saveCollection,
  toFragrance,
} from './storage';

const ENTRY: Fragrance = {
  id: 'entry-1',
  name: 'Tam Dao',
  brand: 'Diptyque',
  family: 'Woody',
  rating: 4,
  description: 'Dry sandalwood.',
  status: 'Own It',
};

beforeEach(() => {
  globalThis.localStorage.clear();
  resetPersistenceMemo();
});

describe('toFragrance', () => {
  it('accepts a complete record and trims its text', () => {
    expect(toFragrance({ ...ENTRY, name: '  Tam Dao  ' })).toEqual(ENTRY);
  });

  it('rejects anything that is not a plain object', () => {
    expect(toFragrance(null)).toBeNull();
    expect(toFragrance('Tam Dao')).toBeNull();
    expect(toFragrance(['Tam Dao'])).toBeNull();
    expect(toFragrance(42)).toBeNull();
  });

  it('rejects records with missing or blank required text', () => {
    expect(toFragrance({ ...ENTRY, id: '' })).toBeNull();
    expect(toFragrance({ ...ENTRY, name: '   ' })).toBeNull();
    expect(toFragrance({ ...ENTRY, brand: undefined })).toBeNull();
    expect(toFragrance({ ...ENTRY, description: null })).toBeNull();
  });

  it('rejects unknown families, statuses and ratings', () => {
    expect(toFragrance({ ...ENTRY, family: 'Gourmand' })).toBeNull();
    expect(toFragrance({ ...ENTRY, status: 'Someday' })).toBeNull();
    expect(toFragrance({ ...ENTRY, rating: 9 })).toBeNull();
    expect(toFragrance({ ...ENTRY, rating: 'five' })).toBeNull();
  });

  it('recovers a rating stored as a numeric string', () => {
    expect(toFragrance({ ...ENTRY, rating: '5' })?.rating).toBe(5);
  });
});

describe('parseCollection', () => {
  it('reads a versioned envelope', () => {
    const raw = JSON.stringify({ version: STORAGE_VERSION, entries: [ENTRY] });
    const parsed = parseCollection(raw);

    expect(parsed.malformed).toBe(false);
    expect(parsed.entries).toEqual([ENTRY]);
    expect(parsed.discarded).toBe(0);
  });

  it('recovers a bare array of records', () => {
    const parsed = parseCollection(JSON.stringify([ENTRY]));

    expect(parsed.malformed).toBe(false);
    expect(parsed.entries).toHaveLength(1);
  });

  it('flags malformed JSON instead of throwing', () => {
    const parsed = parseCollection('{not json at all');

    expect(parsed.malformed).toBe(true);
    expect(parsed.entries).toEqual([]);
  });

  it('flags unexpected shapes', () => {
    expect(parseCollection('"a string"').malformed).toBe(true);
    expect(parseCollection('{}').malformed).toBe(true);
    expect(parseCollection('{"entries":42}').malformed).toBe(true);
    expect(parseCollection('null').malformed).toBe(true);
  });

  it('skips invalid records but keeps the valid ones', () => {
    const raw = JSON.stringify({
      version: STORAGE_VERSION,
      entries: [ENTRY, { name: 'Broken' }, 7, { ...ENTRY, id: 'entry-2', family: 'Nope' }],
    });

    const parsed = parseCollection(raw);

    expect(parsed.malformed).toBe(false);
    expect(parsed.entries.map((entry) => entry.id)).toEqual(['entry-1']);
    expect(parsed.discarded).toBe(3);
  });
});

describe('loadCollection', () => {
  it('reports no problem when nothing has been saved yet', () => {
    expect(loadCollection()).toEqual({
      entries: [],
      issue: null,
      message: null,
    });
  });

  it('restores a saved collection', () => {
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, entries: [ENTRY] }),
    );

    const result = loadCollection();

    expect(result.entries).toEqual([ENTRY]);
    expect(result.issue).toBeNull();
  });

  it('falls back to an empty collection when the data is malformed', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, 'definitely not json');

    const result = loadCollection();

    expect(result.entries).toEqual([]);
    expect(result.issue).toBe('malformed');
    expect(result.message).toContain('could not be read');
    // The unreadable value is left alone rather than silently overwritten.
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBe('definitely not json');
  });

  it('keeps the usable records and explains what was skipped', () => {
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ entries: [ENTRY, { id: 'broken' }] }),
    );

    const result = loadCollection();

    expect(result.entries).toHaveLength(1);
    expect(result.issue).toBe('partial');
    expect(result.message).toContain('One saved entry');
  });

  it('survives a storage read failure', () => {
    const read = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('storage blocked');
      });

    const result = loadCollection();

    expect(result.entries).toEqual([]);
    expect(result.issue).toBe('unavailable');
    read.mockRestore();
  });

  it('survives storage being unavailable altogether', () => {
    const access = vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });

    const result = loadCollection();

    expect(result.issue).toBe('unavailable');
    access.mockRestore();
  });
});

describe('saveCollection', () => {
  it('writes a versioned envelope', () => {
    const result = saveCollection([ENTRY]);

    expect(result.ok).toBe(true);

    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toEqual({
      version: STORAGE_VERSION,
      entries: [ENTRY],
    });
  });

  it('round-trips through loadCollection', () => {
    saveCollection([ENTRY]);

    expect(loadCollection().entries).toEqual([ENTRY]);
  });

  it('does not write again when nothing changed', () => {
    saveCollection([ENTRY]);
    const write = vi.spyOn(Storage.prototype, 'setItem');

    saveCollection([ENTRY]);

    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });

  it('writes again when the collection changes', () => {
    saveCollection([ENTRY]);
    const write = vi.spyOn(Storage.prototype, 'setItem');

    saveCollection([{ ...ENTRY, rating: 5 }]);

    expect(write).toHaveBeenCalledTimes(1);
    write.mockRestore();
  });

  it('reports a failed write instead of throwing', () => {
    const write = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });

    const result = saveCollection([ENTRY]);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('could not save');
    write.mockRestore();
  });
});
