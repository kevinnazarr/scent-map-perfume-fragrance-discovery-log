/** A single fragrance card: identity, family, rating and status at a glance. */

import { PANEL_ID, familyMeta, statusMeta } from '../../../constants';
import type { Fragrance } from '../../../types/fragrance';
import { el } from '../../../utils/dom';
import { ratingToNoses } from '../logic';

export function createCard(entry: Fragrance, isOpen: boolean): HTMLLIElement {
  const family = familyMeta(entry.family);
  const status = statusMeta(entry.status);

  const item = el('li', 'card-item');
  item.setAttribute('data-entry-id', entry.id);

  const titleId = `card-name-${entry.id}`;
  const card = el('article', 'card');
  card.setAttribute('data-family', family.cssKey);
  card.setAttribute('aria-labelledby', titleId);
  if (isOpen) card.classList.add('card--open');

  card.append(el('p', 'card__brand', entry.brand));

  const name = el('h3', 'card__name', entry.name);
  name.id = titleId;
  card.append(name);

  const meta = el('div', 'card__meta');

  const badge = el('p', 'badge');
  const badgeDot = el('span', 'badge__dot');
  badgeDot.setAttribute('aria-hidden', 'true');
  badge.append(badgeDot, el('span', 'badge__label', family.label));
  meta.append(badge);

  const tag = el('p', 'tag');
  tag.setAttribute('data-status', status.cssKey);
  tag.append(el('span', 'tag__label', status.label));
  meta.append(tag);

  card.append(meta);

  // Emoji are decorative: the numeric value carries the same meaning without
  // them, and the trailing word keeps the unit readable for screen readers.
  const rating = el('p', 'card__rating');
  const noses = el('span', 'card__noses', ratingToNoses(entry.rating));
  noses.setAttribute('aria-hidden', 'true');
  rating.append(noses, el('span', 'card__rating-text', `${entry.rating}/5`));
  rating.append(el('span', 'visually-hidden', 'noses'));
  card.append(rating);

  card.append(el('p', 'card__notes', entry.description));

  const open = el('button', 'card__open');
  open.type = 'button';
  open.setAttribute('data-action', 'open');
  open.setAttribute('data-entry-id', entry.id);
  open.setAttribute('data-focus-key', `card:${entry.id}`);
  open.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  if (isOpen) open.setAttribute('aria-controls', PANEL_ID);
  open.append(
    el(
      'span',
      'visually-hidden',
      `Open details for ${entry.name} by ${entry.brand}`,
    ),
  );

  const openLabel = el('span', 'card__open-label', isOpen ? 'Close' : 'Details');
  openLabel.setAttribute('aria-hidden', 'true');
  open.append(openLabel);
  card.append(open);

  item.append(card);
  return item;
}
