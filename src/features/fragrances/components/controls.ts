/**
 * Search and filter controls.
 *
 * These elements are created once and only synchronised afterwards, so typing
 * in the search field keeps focus while the collection re-renders underneath.
 * Each filter is a native radio inside a fieldset: grouping, arrow-key
 * behaviour and "selected" announcements come from the platform.
 */

import {
  FAMILY_META,
  FILTER_ALL,
  STATUS_META,
} from '../../../constants';
import type { Filters } from '../../../types/fragrance';
import { el, setText } from '../../../utils/dom';
import { formatCount } from '../../../utils/text';

export interface ControlsRefs {
  root: HTMLElement;
  searchInput: HTMLInputElement;
  familyInputs: HTMLInputElement[];
  statusInputs: HTMLInputElement[];
  clearButton: HTMLButtonElement;
  resultsMeta: HTMLElement;
}

interface Choice {
  value: string;
  label: string;
  cssKey: string;
}

function createChoiceField(options: {
  legend: string;
  name: string;
  choices: readonly Choice[];
}): { fieldset: HTMLFieldSetElement; inputs: HTMLInputElement[] } {
  const fieldset = el('fieldset', 'filters');
  fieldset.append(el('legend', 'filters__legend', options.legend));

  const row = el('div', 'filters__row');
  const inputs: HTMLInputElement[] = [];

  for (const choice of options.choices) {
    const id = `${options.name}-${choice.cssKey}`;

    const input = el('input', 'visually-hidden chip__input');
    input.type = 'radio';
    input.name = options.name;
    input.id = id;
    input.value = choice.value;
    input.setAttribute('data-filter', options.name);
    inputs.push(input);

    const label = el('label', 'chip');
    label.setAttribute('for', id);
    label.setAttribute('data-choice', choice.cssKey);
    if (choice.cssKey !== FILTER_ALL) {
      const dot = el('span', 'chip__dot');
      dot.setAttribute('aria-hidden', 'true');
      label.append(dot);
    }
    label.append(el('span', 'chip__label', choice.label));

    row.append(input, label);
  }

  fieldset.append(row);
  return { fieldset, inputs };
}

export function createControls(): ControlsRefs {
  const root = el('section', 'controls');
  root.setAttribute('aria-labelledby', 'controls-heading');

  const heading = el('h2', 'visually-hidden', 'Search and filter');
  heading.id = 'controls-heading';
  root.append(heading);

  const searchWrap = el('div', 'controls__search');
  const searchLabel = el('label', 'field__label', 'Search by fragrance or brand');
  searchLabel.setAttribute('for', 'fragrance-search');
  searchWrap.append(searchLabel);

  const searchInput = el('input', 'search-input');
  searchInput.type = 'search';
  searchInput.id = 'fragrance-search';
  searchInput.name = 'search';
  searchInput.autocomplete = 'off';
  searchInput.placeholder = '“oud”, “Diptyque”, “neroli”…';
  searchInput.setAttribute('data-focus-key', 'search');
  searchWrap.append(searchInput);

  const searchHint = el(
    'p',
    'field__hint',
    'Results update as you type. Leave empty to see every fragrance.',
  );
  searchHint.id = 'search-hint';
  searchInput.setAttribute('aria-describedby', 'search-hint');
  searchWrap.append(searchHint);

  root.append(searchWrap);

  const family = createChoiceField({
    legend: 'Scent family',
    name: 'family',
    choices: [
      { value: FILTER_ALL, label: 'All', cssKey: FILTER_ALL },
      ...FAMILY_META.map((meta) => ({
        value: meta.value,
        label: meta.label,
        cssKey: meta.cssKey,
      })),
    ],
  });

  const status = createChoiceField({
    legend: 'Status',
    name: 'status',
    choices: [
      { value: FILTER_ALL, label: 'All', cssKey: FILTER_ALL },
      ...STATUS_META.map((meta) => ({
        value: meta.value,
        label: meta.label,
        cssKey: meta.cssKey,
      })),
    ],
  });

  root.append(family.fieldset, status.fieldset);

  const footer = el('div', 'controls__footer');

  const clearButton = el('button', 'btn btn--ghost', 'Clear search and filters');
  clearButton.type = 'button';
  clearButton.setAttribute('data-action', 'clear-criteria');
  clearButton.setAttribute('data-focus-key', 'clear-criteria');
  footer.append(clearButton);

  const resultsMeta = el('p', 'results-meta');
  resultsMeta.id = 'results-meta';
  resultsMeta.setAttribute('role', 'status');
  resultsMeta.setAttribute('aria-live', 'polite');
  footer.append(resultsMeta);

  root.append(footer);

  return {
    root,
    searchInput,
    familyInputs: family.inputs,
    statusInputs: status.inputs,
    clearButton,
    resultsMeta,
  };
}

/** Mirrors state onto the controls; never replaces the elements themselves. */
export function syncControls(
  refs: ControlsRefs,
  filters: Filters,
  visibleCount: number,
  totalCount: number,
): void {
  if (refs.searchInput.value !== filters.query) {
    refs.searchInput.value = filters.query;
  }

  for (const input of refs.familyInputs) {
    input.checked = input.value === filters.family;
  }

  for (const input of refs.statusInputs) {
    input.checked = input.value === filters.status;
  }

  refs.clearButton.disabled =
    filters.query.trim() === '' &&
    filters.family === FILTER_ALL &&
    filters.status === FILTER_ALL;

  setText(refs.resultsMeta, describeResults(visibleCount, totalCount));
}

function describeResults(visibleCount: number, totalCount: number): string {
  if (totalCount === 0) return 'No fragrances logged yet';

  if (visibleCount === totalCount) {
    return `${formatCount(totalCount, 'fragrance')} in your log`;
  }

  return `Showing ${visibleCount} of ${totalCount} fragrances`;
}
