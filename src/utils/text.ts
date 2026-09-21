/** Small text helpers so counts and names read naturally everywhere. */

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

export function formatCount(
  count: number,
  singular: string,
  plural?: string,
): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}

/** Typographic quotes keep names legible inside sentences. */
export function quoted(value: string): string {
  return `“${value}”`;
}
