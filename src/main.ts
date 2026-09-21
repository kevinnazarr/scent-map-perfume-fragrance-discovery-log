import './styles/index.css';

import { attachEvents } from './features/fragrances/events';
import { createView, renderView } from './features/fragrances/render';
import { createStore } from './state/app-state';

function renderMountFailure(): void {
  const message = document.createElement('div');
  message.className = 'noscript';

  const heading = document.createElement('h1');
  heading.textContent = 'Scent Map could not start';

  const text = document.createElement('p');
  text.textContent =
    'The page is missing its application mount point, so the fragrance log could not be rendered.';

  message.append(heading, text);
  document.body.append(message);
}

function mount(): void {
  const root = document.querySelector<HTMLElement>('#app');

  if (root === null) {
    renderMountFailure();
    return;
  }

  const store = createStore();
  const view = createView(root);

  renderView(view, store.getState());
  store.subscribe((state) => {
    renderView(view, state);
  });
  attachEvents(view, store);

  void store.hydrate();
}

mount();
