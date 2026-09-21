/**
 * Rendering entry point.
 *
 * The shell (header, summary, controls, live regions) is created once and then
 * synchronised; only the collection region — grid, empty/no-results states and
 * the inline panel — is rebuilt on change. That keeps the search field, the
 * filter chips and any focused control stable while the collection updates.
 */

import type { AppState } from '../../state/app-state';
import { el, focusByKey } from '../../utils/dom';
import { createCard } from './components/card';
import { createControls, syncControls } from './components/controls';
import { createPanel } from './components/panel';
import {
  createBanner,
  createEmptyState,
  createNoResults,
  createSkeleton,
  createStorageNotice,
} from './components/states';
import { createSummary, renderSummary } from './components/summary';
import { findFragrance } from './logic';
import type { AppView } from './types';

function createHeader(): HTMLElement {
  const header = el('header', 'site-header');
  const inner = el('div', 'site-header__inner');

  const brand = el('div', 'brand');
  brand.append(el('h1', 'brand__mark', 'Scent Map'));
  brand.append(el('p', 'brand__tagline', 'A personal fragrance discovery log'));
  inner.append(brand);

  const add = el('button', 'btn btn--primary site-header__action', 'Add fragrance');
  add.type = 'button';
  add.setAttribute('data-action', 'add');
  add.setAttribute('data-focus-key', 'add');
  inner.append(add);

  header.append(inner);
  return header;
}

export function createView(root: HTMLElement): AppView {
  const page = el('div', 'page');
  page.append(createHeader());

  const main = el('main', 'page__main');
  main.id = 'main';
  main.tabIndex = -1;

  const bannerSlot = el('div', 'banners');
  const statusPolite = el('div', 'banners__polite');
  statusPolite.setAttribute('role', 'status');
  statusPolite.setAttribute('aria-live', 'polite');
  const statusAlert = el('div', 'banners__alert');
  statusAlert.setAttribute('role', 'alert');
  statusAlert.setAttribute('aria-live', 'assertive');
  bannerSlot.append(statusPolite, statusAlert);

  const storageNotice = el('div', 'storage-notice');

  const summary = createSummary();
  const controls = createControls();

  const collection = el('section', 'collection');
  collection.id = 'collection';
  collection.setAttribute('aria-labelledby', 'collection-heading');

  const collectionHead = el('div', 'collection__head');
  const collectionHeading = el('h2', 'collection__heading', 'My collection');
  collectionHeading.id = 'collection-heading';
  collectionHead.append(collectionHeading);
  collection.append(collectionHead);

  const collectionBody = el('div', 'collection__body');
  collection.append(collectionBody);

  main.append(
    bannerSlot,
    storageNotice,
    summary.root,
    controls.root,
    collection,
  );
  page.append(main);

  const footer = el('footer', 'site-footer');
  footer.append(
    el(
      'p',
      'site-footer__text',
      'Scent Map stores your log in this browser only — no account, no server.',
    ),
  );
  page.append(footer);

  root.replaceChildren(page);

  return {
    root,
    controls,
    summary: summary.refs,
    statusPolite,
    statusAlert,
    storageNotice,
    collection: collectionBody,
  };
}

function renderMessages(view: AppView, state: AppState): void {
  const polite: HTMLElement[] = [];
  const alerting: HTMLElement[] = [];

  if (state.phase === 'hydrating') {
    polite.push(el('p', 'banner banner--loading', 'Loading your fragrance log…'));
  }

  const banner = state.banner;
  if (banner !== null) {
    const node = createBanner(banner);
    if (banner.kind === 'error' || banner.kind === 'warning') alerting.push(node);
    else polite.push(node);
  }

  view.statusPolite.replaceChildren(...polite);
  view.statusAlert.replaceChildren(...alerting);

  if (state.storageNotice === null) {
    view.storageNotice.replaceChildren();
  } else {
    view.storageNotice.replaceChildren(createStorageNotice(state.storageNotice));
  }
}

function renderCollection(view: AppView, state: AppState): void {
  const host = view.collection;

  if (state.phase === 'hydrating') {
    host.setAttribute('aria-busy', 'true');
    host.replaceChildren(createSkeleton());
    return;
  }

  host.removeAttribute('aria-busy');
  host.replaceChildren();

  const panel =
    state.panel.mode === 'closed'
      ? null
      : createPanel({
          mode: state.panel.mode,
          entry: findFragrance(state.entries, state.panel.id),
          draft: state.panel.draft,
          errors: state.panel.errors,
          confirmingDelete: state.panel.confirmingDelete,
        });

  if (state.entries.length === 0) {
    host.append(createEmptyState());
    if (panel !== null) host.prepend(panel);
    return;
  }

  if (state.visible.length === 0) {
    host.append(createNoResults(state.filters));
    if (panel !== null) host.prepend(panel);
    return;
  }

  const list = el('ul', 'grid');
  // Explicit list semantics so the grid is still announced as a list even when
  // list markers are visually removed.
  list.setAttribute('role', 'list');

  let panelPlaced = false;

  for (const entry of state.visible) {
    const isOpen = state.panel.mode !== 'closed' && state.panel.id === entry.id;
    list.append(createCard(entry, isOpen));

    if (isOpen && panel !== null) {
      const holder = el('li', 'grid__panel');
      holder.append(panel);
      list.append(holder);
      panelPlaced = true;
    }
  }

  if (panel !== null && !panelPlaced) host.append(panel);
  host.append(list);
}

export function renderView(view: AppView, state: AppState): void {
  renderMessages(view, state);
  renderSummary(view.summary, state.summary);
  syncControls(
    view.controls,
    state.filters,
    state.visible.length,
    state.summary.total,
  );

  renderCollection(view, state);

  if (state.phase === 'ready' && state.focus !== null) {
    focusByKey(view.root, state.focus);
  }
}
