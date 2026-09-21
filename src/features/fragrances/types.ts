/**
 * View contracts for the fragrance feature.
 *
 * Rendered regions keep stable element references so a state change updates
 * only what actually changed — the search input, filter chips and any focused
 * control keep their identity (and therefore their focus) between renders.
 */

import type { ControlsRefs } from './components/controls';

export interface SummaryRefs {
  total: HTMLElement;
  owned: HTMLElement;
  wanted: HTMLElement;
  tried: HTMLElement;
  live: HTMLElement;
}

export interface AppView {
  root: HTMLElement;
  controls: ControlsRefs;
  summary: SummaryRefs;
  /** Polite live region: success and informational messages. */
  statusPolite: HTMLElement;
  /** Assertive live region: problems the user must notice. */
  statusAlert: HTMLElement;
  storageNotice: HTMLElement;
  /** Host for the card grid, the empty/no-results states and the panel. */
  collection: HTMLElement;
}
