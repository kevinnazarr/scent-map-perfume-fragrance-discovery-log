/** The summary strip: total entries, owned and wanted at a glance. */

import type { CollectionSummary } from '../../../types/fragrance';
import { el, setText } from '../../../utils/dom';
import { formatCount } from '../../../utils/text';
import type { SummaryRefs } from '../types';

function createStat(
  label: string,
  key: string,
): { item: HTMLDivElement; value: HTMLElement } {
  const item = el('div', 'summary__stat');
  item.append(el('dt', 'summary__label', label));

  const value = el('dd', 'summary__value', '0');
  value.setAttribute('data-stat', key);
  item.append(value);

  return { item, value };
}

export function createSummary(): { root: HTMLElement; refs: SummaryRefs } {
  const root = el('section', 'summary');
  root.setAttribute('aria-labelledby', 'summary-heading');

  const heading = el('h2', 'visually-hidden', 'Collection summary');
  heading.id = 'summary-heading';
  root.append(heading);

  const total = createStat('In the log', 'total');
  const owned = createStat('Own It', 'owned');
  const wanted = createStat('Want It', 'wanted');
  const tried = createStat('Tried', 'tried');

  const list = el('dl', 'summary__list');
  list.append(total.item, owned.item, wanted.item, tried.item);
  root.append(list);

  // Announced politely, and only when the numbers actually change.
  const live = el('p', 'visually-hidden');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  root.append(live);

  return {
    root,
    refs: {
      total: total.value,
      owned: owned.value,
      wanted: wanted.value,
      tried: tried.value,
      live,
    },
  };
}

export function renderSummary(
  refs: SummaryRefs,
  summary: CollectionSummary,
): void {
  setText(refs.total, String(summary.total));
  setText(refs.owned, String(summary.owned));
  setText(refs.wanted, String(summary.wanted));
  setText(refs.tried, String(summary.tried));

  setText(
    refs.live,
    `Log updated: ${formatCount(summary.total, 'fragrance')}, ` +
      `${summary.owned} owned, ${summary.wanted} wanted.`,
  );
}
