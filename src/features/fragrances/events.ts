/**
 * Event wiring.
 *
 * One delegated listener set for the whole application: the DOM is rebuilt by
 * the renderer, so delegated handlers are the only stable place to bind. Every
 * handler does nothing more than translate a user action into a store action —
 * no business rules live here.
 */

import { DRAFT_FIELD_ORDER } from '../../constants';
import type { Store } from '../../state/app-state';
import {
  isFragranceStatus,
  isScentFamily,
  type DraftField,
  type FragranceDraft,
} from '../../types/fragrance';
import { qs } from '../../utils/dom';
import type { AppView } from './types';

function isDraftField(value: string): value is DraftField {
  return (DRAFT_FIELD_ORDER as readonly string[]).includes(value);
}

function readControlValue(target: HTMLElement): string | null {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return target.value;
  }

  return null;
}

/** Collects the form exactly as submitted, including the chosen radios. */
function readDraft(form: HTMLFormElement): FragranceDraft {
  const data = new FormData(form);

  const read = (field: DraftField): string => {
    const value = data.get(field);
    return typeof value === 'string' ? value : '';
  };

  return {
    name: read('name'),
    brand: read('brand'),
    family: read('family'),
    rating: read('rating'),
    description: read('description'),
    status: read('status'),
  };
}

function updateCounter(form: HTMLFormElement, length: number): void {
  const counter = qs<HTMLElement>(form, '[data-counter]');
  if (counter !== null) counter.textContent = String(length);
}

export function attachEvents(view: AppView, store: Store): () => void {
  const root = view.root;

  function handleClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trigger = target.closest<HTMLElement>('[data-action]');
    if (trigger === null) return;

    const { action, entryId } = trigger.dataset;

    switch (action) {
      case 'add':
        store.startCreate();
        break;

      case 'open': {
        if (entryId === undefined) return;
        const { panel } = store.getState();
        // Activating the open card again closes its panel.
        if (panel.mode !== 'closed' && panel.id === entryId) store.closePanel();
        else store.openDetail(entryId);
        break;
      }

      case 'close-panel':
        store.closePanel();
        break;

      case 'edit':
        store.startEdit();
        break;

      case 'cancel-form':
        if (store.getState().panel.mode === 'edit') store.cancelEdit();
        else store.closePanel();
        break;

      case 'request-delete':
        store.requestDelete();
        break;

      case 'cancel-delete':
        store.cancelDelete();
        break;

      case 'confirm-delete':
        store.confirmDelete();
        break;

      case 'clear-criteria':
        store.clearCriteria();
        break;

      case 'dismiss-banner':
        store.dismissBanner();
        break;

      case 'dismiss-storage-notice':
        store.dismissStorageNotice();
        break;

      default:
        break;
    }
  }

  function handleInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const value = readControlValue(target);
    if (value === null) return;

    if (target === view.controls.searchInput) {
      store.setQuery(value);
      return;
    }

    const { field } = target.dataset;
    if (field === undefined || !isDraftField(field)) return;

    // Mirrored into state without re-rendering, so typing keeps focus.
    store.setDraftField(field, value);

    if (field === 'description') {
      const form = target.closest('form');
      if (form !== null) updateCounter(form, value.length);
    }
  }

  function handleChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const value = readControlValue(target);
    if (value === null) return;

    const { filter, field } = target.dataset;

    if (filter === 'family') {
      store.setFamilyFilter(isScentFamily(value) ? value : 'all');
      return;
    }

    if (filter === 'status') {
      store.setStatusFilter(isFragranceStatus(value) ? value : 'all');
      return;
    }

    if (field !== undefined && isDraftField(field)) {
      store.setDraftField(field, value);
    }
  }

  function handleSubmit(event: SubmitEvent): void {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.submitAction === undefined) return;

    event.preventDefault();
    const draft = readDraft(form);

    if (form.dataset.submitAction === 'save') store.saveEditedDraft(draft);
    else store.addFromDraft(draft);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;

    const { panel } = store.getState();
    if (panel.mode === 'closed') return;

    if (panel.confirmingDelete) store.cancelDelete();
    else store.closePanel();
  }

  root.addEventListener('click', handleClick);
  root.addEventListener('input', handleInput);
  root.addEventListener('change', handleChange);
  root.addEventListener('submit', handleSubmit);
  root.addEventListener('keydown', handleKeydown);

  return () => {
    root.removeEventListener('click', handleClick);
    root.removeEventListener('input', handleInput);
    root.removeEventListener('change', handleChange);
    root.removeEventListener('submit', handleSubmit);
    root.removeEventListener('keydown', handleKeydown);
  };
}
