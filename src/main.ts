import './styles/index.css';

function mount(): void {
  const root = document.querySelector('#app');
  if (!root) return;
  root.innerHTML = '<main class="page__main"><h1>Scent Map</h1><p>Shell ready.</p></main>';
}

mount();
