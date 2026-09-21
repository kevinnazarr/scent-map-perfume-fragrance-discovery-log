/** Non-grid states: empty collection, no results, loading, messages. */

import type { Banner } from '../../../state/app-state';
import type { Filters } from '../../../types/fragrance';
import { el } from '../../../utils/dom';
import { describeFilters } from '../logic';

/** Purely decorative placeholders while the saved log is restored. */
export function createSkeleton(): HTMLElement {
  const root = el('div', 'state state--loading');
  root.append(el('p', 'state__eyebrow', 'Scent Map'));

  const cards = el('div', 'skeleton');
  cards.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 6; index += 1) {
    cards.append(el('div', 'skeleton__card'));
  }

  root.append(cards);
  return root;
}

export function createEmptyState(): HTMLElement {
  const root = el('div', 'state state--empty');

  root.append(el('p', 'state__eyebrow', 'Nothing logged yet'));
  root.append(el('h3', 'state__title', 'Start your scent map'));

  root.append(
    el(
      'p',
      'state__text',
      'Scent Map is a personal journal for every perfume, cologne or scented ' +
        'product you meet: which family it belongs to, how many noses you gave ' +
        'it, and whether you own it or simply want it.',
    ),
  );

  const tips = el('ul', 'state__tips');
  tips.append(
    el('li', 'state__tip', 'Log one fragrance: name, brand, family, rating, a short note.'),
    el('li', 'state__tip', 'Filter by family or status, or search by name and brand.'),
    el('li', 'state__tip', 'Everything stays in this browser, ready when you return.'),
  );
  root.append(tips);

  const add = el('button', 'btn btn--primary', 'Add your first fragrance');
  add.type = 'button';
  add.setAttribute('data-action', 'add');
  add.setAttribute('data-focus-key', 'empty-add');
  root.append(add);

  return root;
}

export function createNoResults(filters: Filters): HTMLElement {
  const root = el('div', 'state state--no-results');

  root.append(el('p', 'state__eyebrow', 'No matches'));
  root.append(el('h3', 'state__title', 'No fragrances match'));

  const criteria = describeFilters(filters);
  root.append(
    el(
      'p',
      'state__text',
      criteria === ''
        ? 'Nothing in your log matches the current search and filters.'
        : `Nothing in your log is ${criteria}.`,
    ),
  );

  root.append(
    el(
      'p',
      'state__hint',
      'Your fragrances are still here — clear the search and filters to see them all.',
    ),
  );

  const clear = el('button', 'btn btn--secondary', 'Clear search and filters');
  clear.type = 'button';
  clear.setAttribute('data-action', 'clear-criteria');
  clear.setAttribute('data-focus-key', 'clear-criteria-state');
  root.append(clear);

  return root;
}

export function createBanner(banner: Banner): HTMLElement {
  const root = el('div', `banner banner--${banner.kind}`);
  root.append(el('p', 'banner__text', banner.message));

  // Success messages are transient and non-critical: they need no dismissal.
  if (banner.kind !== 'success') {
    const dismiss = el('button', 'banner__dismiss', 'Dismiss');
    dismiss.type = 'button';
    dismiss.setAttribute('data-action', 'dismiss-banner');
    root.append(dismiss);
  }

  return root;
}

export function createStorageNotice(message: string): HTMLElement {
  const root = el('div', 'notice');
  root.setAttribute('role', 'status');
  root.append(el('p', 'notice__text', message));

  const dismiss = el('button', 'notice__dismiss', 'Dismiss');
  dismiss.type = 'button';
  dismiss.setAttribute('data-action', 'dismiss-storage-notice');
  root.append(dismiss);

  return root;
}
