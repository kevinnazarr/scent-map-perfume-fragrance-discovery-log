import {
  DRAFT_FIELD_ORDER,
  EMPTY_DRAFT,
  FAMILY_META,
  FIELD_LIMITS,
  NOSE_EMOJI,
  PANEL_ID,
  RATING_DESCRIPTIONS,
  STATUS_META,
  familyMeta,
  statusMeta,
} from '../../../constants';
import {
  RATINGS,
  type DraftField,
  type Fragrance,
  type FragranceDraft,
  type ValidationErrors,
} from '../../../types/fragrance';
import { el, setHidden } from '../../../utils/dom';
import { describeRating, ratingToNoses, toDraft } from '../logic';

export interface PanelOptions {
  mode: 'create' | 'detail' | 'edit';
  /** The record being shown or edited; `null` while creating. */
  entry: Fragrance | null;
  /** In-progress form values, restored after any re-render. */
  draft: FragranceDraft | null;
  errors: ValidationErrors;
  confirmingDelete: boolean;
}

const ERROR_MESSAGES: Record<DraftField, string> = {
  name: 'Fragrance name',
  brand: 'Brand',
  family: 'Scent family',
  rating: 'Nose rating',
  description: 'Tasting note',
  status: 'Status',
};

function fieldId(field: string): string {
  return `form-${field}`;
}

function errorId(field: string): string {
  return `error-${field}`;
}

function hintId(field: string): string {
  return `hint-${field}`;
}

/** One field wrapper with its label, hint and (possibly) its error message. */
function createField(options: {
  field: DraftField;
  label: string;
  hint: string;
  control: HTMLElement;
  error: string | undefined;
  extraDescribedBy?: string;
}): HTMLDivElement {
  const wrapper = el('div', 'field');
  wrapper.setAttribute('data-field', options.field);

  const label = el('label', 'field__label', options.label);
  label.setAttribute('for', fieldId(options.field));
  wrapper.append(label);

  wrapper.append(options.control);

  const hint = el('p', 'field__hint', options.hint);
  hint.id = hintId(options.field);
  wrapper.append(hint);

  const describedBy = [hintId(options.field)];
  if (options.extraDescribedBy !== undefined) {
    describedBy.push(options.extraDescribedBy);
  }
  describedBy.push(errorId(options.field));
  options.control.setAttribute('aria-describedby', describedBy.join(' '));

  const error = el('p', 'field__error');
  error.id = errorId(options.field);
  error.setAttribute('data-error-for', options.field);

  if (options.error === undefined) {
    setHidden(error, true);
  } else {
    error.textContent = options.error;
    options.control.setAttribute('aria-invalid', 'true');
  }

  wrapper.append(error);
  return wrapper;
}

function createTextInput(options: {
  field: 'name' | 'brand';
  value: string;
  placeholder: string;
}): HTMLInputElement {
  const input = el('input', 'field__input');
  input.type = 'text';
  input.id = fieldId(options.field);
  input.name = options.field;
  input.value = options.value;
  input.placeholder = options.placeholder;
  input.autocomplete = 'off';
  input.setAttribute('maxlength', String(FIELD_LIMITS[options.field].max));
  input.setAttribute('data-field', options.field);
  input.setAttribute('data-focus-key', `field:${options.field}`);
  return input;
}

function createTextField(options: {
  field: 'name' | 'brand';
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  error: string | undefined;
}): HTMLDivElement {
  return createField({
    field: options.field,
    label: options.label,
    hint: options.hint,
    error: options.error,
    control: createTextInput({
      field: options.field,
      value: options.value,
      placeholder: options.placeholder,
    }),
  });
}

function createFamilyField(options: {
  value: string;
  error: string | undefined;
}): HTMLDivElement {
  const select = el('select', 'field__select');
  select.id = fieldId('family');
  select.name = 'family';
  select.setAttribute('data-field', 'family');
  select.setAttribute('data-focus-key', 'field:family');

  const placeholder = el('option', undefined, 'Choose a scent family…');
  placeholder.value = '';
  select.append(placeholder);

  for (const meta of FAMILY_META) {
    const option = el('option', undefined, `${meta.label} — ${meta.notes}`);
    option.value = meta.value;
    select.append(option);
  }

  select.value = options.value;

  return createField({
    field: 'family',
    label: 'Scent family',
    hint: 'The family that fits best — colour and dot stay consistent everywhere.',
    control: select,
    error: options.error,
  });
}

function createRatingField(options: {
  value: string;
  error: string | undefined;
}): HTMLElement {
  const wrapper = el('fieldset', 'field field--choice');

  const legend = el('legend', 'field__label', 'Nose rating');
  wrapper.append(legend);

  const hint = el(
    'p',
    'field__hint',
    'How much do you love it? 1 nose = not for me, 5 noses = a signature scent.',
  );
  hint.id = hintId('rating');
  wrapper.append(hint);

  const row = el('div', 'rating');

  for (const rating of RATINGS) {
    const id = `${fieldId('rating')}-${rating}`;

    const input = el('input', 'visually-hidden choice__input');
    input.type = 'radio';
    input.name = 'rating';
    input.id = id;
    input.value = String(rating);
    input.checked = options.value === String(rating);
    input.setAttribute('data-field', 'rating');
    input.setAttribute('data-focus-key', 'field:rating');

    const label = el('label', 'nose');
    label.setAttribute('for', id);

    const noses = el('span', 'nose__noses', NOSE_EMOJI.repeat(rating));
    noses.setAttribute('aria-hidden', 'true');
    label.append(noses);
    label.append(
      el('span', 'nose__value', `${rating} · ${RATING_DESCRIPTIONS[rating]}`),
    );

    row.append(input, label);
  }

  wrapper.append(row);

  const error = el('p', 'field__error');
  error.id = errorId('rating');
  error.setAttribute('data-error-for', 'rating');

  const describedBy = [hintId('rating'), errorId('rating')];

  if (options.error === undefined) {
    setHidden(error, true);
  } else {
    error.textContent = options.error;
    for (const input of row.querySelectorAll('input')) {
      input.setAttribute('aria-invalid', 'true');
    }
  }

  for (const input of row.querySelectorAll('input')) {
    input.setAttribute('aria-describedby', describedBy.join(' '));
  }

  wrapper.append(error);
  return wrapper;
}

function createStatusField(options: {
  value: string;
  error: string | undefined;
}): HTMLElement {
  const wrapper = el('fieldset', 'field field--choice');

  wrapper.append(el('legend', 'field__label', 'Status'));

  const hint = el(
    'p',
    'field__hint',
    'Tried = sampled at least once · Own It = a bottle lives with you · Want It = on your wishlist.',
  );
  hint.id = hintId('status');
  wrapper.append(hint);

  const row = el('div', 'choices');

  for (const meta of STATUS_META) {
    const id = `${fieldId('status')}-${meta.cssKey}`;

    const input = el('input', 'visually-hidden choice__input');
    input.type = 'radio';
    input.name = 'status';
    input.id = id;
    input.value = meta.value;
    input.checked = options.value === meta.value;
    input.setAttribute('data-field', 'status');
    input.setAttribute('data-focus-key', 'field:status');

    const label = el('label', 'choice');
    label.setAttribute('for', id);
    label.setAttribute('data-choice', meta.cssKey);
    label.append(el('span', 'choice__label', meta.label));
    label.append(el('span', 'choice__hint', meta.hint));

    row.append(input, label);
  }

  wrapper.append(row);

  const error = el('p', 'field__error');
  error.id = errorId('status');
  error.setAttribute('data-error-for', 'status');

  const describedBy = [hintId('status'), errorId('status')];

  if (options.error === undefined) {
    setHidden(error, true);
  } else {
    error.textContent = options.error;
    for (const input of row.querySelectorAll('input')) {
      input.setAttribute('aria-invalid', 'true');
    }
  }

  for (const input of row.querySelectorAll('input')) {
    input.setAttribute('aria-describedby', describedBy.join(' '));
  }

  wrapper.append(error);
  return wrapper;
}

function createDescriptionField(options: {
  value: string;
  error: string | undefined;
}): HTMLDivElement {
  const counterId = 'counter-description';

  const textarea = el('textarea', 'field__textarea');
  textarea.id = fieldId('description');
  textarea.name = 'description';
  textarea.rows = 3;
  textarea.value = options.value;
  textarea.placeholder = 'Saffron and rose over warm cedar — quiet, a little smoky.';
  textarea.setAttribute('maxlength', String(FIELD_LIMITS.description.max));
  textarea.setAttribute('data-field', 'description');
  textarea.setAttribute('data-focus-key', 'field:description');

  const wrapper = createField({
    field: 'description',
    label: 'Tasting note',
    hint: 'The impression you want to remember — keep it short and specific.',
    control: textarea,
    error: options.error,
    extraDescribedBy: counterId,
  });

  const counter = el('p', 'field__counter');
  counter.id = counterId;
  const counterValue = el('span', 'field__counter-value', String(options.value.length));
  counterValue.setAttribute('data-counter', '');
  counter.append(counterValue);
  counter.append(
    document.createTextNode(`/${FIELD_LIMITS.description.max} characters`),
  );
  wrapper.append(counter);

  return wrapper;
}

/* -------------------------------------------------------------------- form */

function createForm(options: {
  draft: FragranceDraft;
  errors: ValidationErrors;
  submitLabel: string;
  submitAction: 'create' | 'save';
  cancelLabel: string;
}): HTMLFormElement {
  const form = el('form', 'form');
  // Validation is ours: messages render per field instead of relying on the
  // browser's native bubbles, so behaviour matches across browsers.
  form.noValidate = true;
  form.setAttribute('data-form', 'fragrance');
  form.setAttribute('data-submit-action', options.submitAction);

  const invalidFields = DRAFT_FIELD_ORDER.filter(
    (field) => options.errors[field] !== undefined,
  );

  if (invalidFields.length > 0) {
    const summary = el('div', 'form__summary');
    summary.setAttribute('role', 'alert');

    const names = invalidFields.map((field) => ERROR_MESSAGES[field]).join(', ');
    summary.append(
      el(
        'p',
        'form__summary-text',
        invalidFields.length === 1
          ? `One field needs attention: ${names}.`
          : `${invalidFields.length} fields need attention: ${names}.`,
      ),
    );
    form.append(summary);
  }

  const grid = el('div', 'form__grid');
  grid.append(
    createTextField({
      field: 'name',
      label: 'Fragrance name',
      hint: 'The name you will recognise it by.',
      placeholder: 'Tam Dao Eau de Parfum',
      value: options.draft.name,
      error: options.errors.name,
    }),
    createTextField({
      field: 'brand',
      label: 'Brand or house',
      hint: 'Who makes it — the house or the creator.',
      placeholder: 'Diptyque',
      value: options.draft.brand,
      error: options.errors.brand,
    }),
    createFamilyField({
      value: options.draft.family,
      error: options.errors.family,
    }),
    createRatingField({
      value: options.draft.rating,
      error: options.errors.rating,
    }),
    createStatusField({
      value: options.draft.status,
      error: options.errors.status,
    }),
    createDescriptionField({
      value: options.draft.description,
      error: options.errors.description,
    }),
  );
  form.append(grid);

  const actions = el('div', 'panel__actions');

  const submit = el('button', 'btn btn--primary', options.submitLabel);
  submit.type = 'submit';
  submit.setAttribute('data-focus-key', 'form-submit');

  const cancel = el('button', 'btn btn--ghost', options.cancelLabel);
  cancel.type = 'button';
  cancel.setAttribute('data-action', 'cancel-form');
  cancel.setAttribute('data-focus-key', 'form-cancel');

  actions.append(submit, cancel);
  form.append(actions);

  return form;
}

/* ------------------------------------------------------------ detail view */

function factRow(label: string, value: HTMLElement): HTMLDivElement {
  const row = el('div', 'facts__row');
  row.append(el('dt', 'facts__term', label));

  const detail = el('dd', 'facts__value');
  detail.append(value);
  row.append(detail);

  return row;
}

function createFacts(entry: Fragrance): HTMLElement {
  const family = familyMeta(entry.family);
  const status = statusMeta(entry.status);

  const badge = el('p', 'badge');
  badge.setAttribute('data-family', family.cssKey);
  const dot = el('span', 'badge__dot');
  dot.setAttribute('aria-hidden', 'true');
  badge.append(dot, el('span', 'badge__label', family.label));

  const rating = el('div', 'facts__rating');
  const noses = el('span', 'facts__rating-noses', ratingToNoses(entry.rating));
  noses.setAttribute('aria-hidden', 'true');
  rating.append(
    noses,
    el('span', 'facts__rating-text', describeRating(entry.rating)),
  );

  const tag = el('p', 'tag');
  tag.setAttribute('data-status', status.cssKey);
  tag.append(el('span', 'tag__label', status.label));

  const list = el('dl', 'facts');
  list.append(
    factRow('Scent family', badge),
    factRow('Nose rating', rating),
    factRow('Status', tag),
    factRow('Tasting note', el('p', 'facts__notes', entry.description)),
  );

  return list;
}

function createConfirm(entry: Fragrance): HTMLElement {
  const box = el('div', 'confirm');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-labelledby', 'confirm-text');

  const text = el(
    'p',
    'confirm__text',
    `Delete “${entry.name}” by ${entry.brand} from your log? This cannot be undone.`,
  );
  text.id = 'confirm-text';
  box.append(text);

  const actions = el('div', 'confirm__actions');

  const confirm = el('button', 'btn btn--danger', 'Yes, delete it');
  confirm.type = 'button';
  confirm.setAttribute('data-action', 'confirm-delete');
  confirm.setAttribute('data-focus-key', 'confirm-delete');

  const cancel = el('button', 'btn btn--ghost', 'Keep it');
  cancel.type = 'button';
  cancel.setAttribute('data-action', 'cancel-delete');

  actions.append(confirm, cancel);
  box.append(actions);

  return box;
}

/* ------------------------------------------------------------------ shell */

function createPanelShell(options: {
  eyebrow: string;
  title: string;
  subtitle: string;
  closeLabel: string;
}): { section: HTMLElement; body: HTMLElement } {
  const section = el('section', 'panel');
  section.id = PANEL_ID;
  section.setAttribute('aria-labelledby', 'panel-heading');

  const header = el('header', 'panel__header');
  const headingWrap = el('div', 'panel__heading');
  headingWrap.append(el('p', 'panel__eyebrow', options.eyebrow));

  const heading = el('h3', 'panel__title', options.title);
  heading.id = 'panel-heading';
  heading.tabIndex = -1;
  heading.setAttribute('data-focus-key', 'panel-heading');
  headingWrap.append(heading);

  headingWrap.append(el('p', 'panel__subtitle', options.subtitle));
  header.append(headingWrap);

  const close = el('button', 'panel__close', '×');
  close.type = 'button';
  close.setAttribute('data-action', 'close-panel');
  close.setAttribute('aria-label', options.closeLabel);
  header.append(close);

  section.append(header);

  const body = el('div', 'panel__body');
  section.append(body);

  return { section, body };
}

export function createPanel(options: PanelOptions): HTMLElement | null {
  if (options.mode === 'create') {
    const { section, body } = createPanelShell({
      eyebrow: 'New entry',
      title: 'Add a fragrance',
      subtitle: 'Six details and it is filed in your log.',
      closeLabel: 'Close the add form',
    });

    body.append(
      createForm({
        draft: options.draft ?? EMPTY_DRAFT,
        errors: options.errors,
        submitLabel: 'Add to my log',
        submitAction: 'create',
        cancelLabel: 'Cancel',
      }),
    );

    return section;
  }

  const entry = options.entry;
  if (entry === null) return null;

  const family = familyMeta(entry.family);

  if (options.mode === 'edit') {
    const { section, body } = createPanelShell({
      eyebrow: `Editing · ${family.label}`,
      title: entry.name,
      subtitle: `Update “${entry.brand}” and save when the note feels right.`,
      closeLabel: 'Close the edit form',
    });

    body.append(
      createForm({
        draft: options.draft ?? toDraft(entry),
        errors: options.errors,
        submitLabel: 'Save changes',
        submitAction: 'save',
        cancelLabel: 'Cancel changes',
      }),
    );

    return section;
  }

  const { section, body } = createPanelShell({
    eyebrow: `In your log · ${family.label}`,
    title: entry.name,
    subtitle: entry.brand,
    closeLabel: 'Close details',
  });

  body.append(createFacts(entry));

  const actions = el('div', 'panel__actions');

  const edit = el('button', 'btn btn--primary', 'Edit fragrance');
  edit.type = 'button';
  edit.setAttribute('data-action', 'edit');
  edit.setAttribute('data-focus-key', 'panel-edit');

  const remove = el('button', 'btn btn--danger-ghost', 'Delete fragrance');
  remove.type = 'button';
  remove.setAttribute('data-action', 'request-delete');
  remove.setAttribute('data-focus-key', 'panel-delete');

  actions.append(edit, remove);
  body.append(actions);

  if (options.confirmingDelete) {
    body.append(createConfirm(entry));
  }

  return section;
}
