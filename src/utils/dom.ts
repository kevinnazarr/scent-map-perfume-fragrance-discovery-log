export type AttributeValue = string | number | boolean | null | undefined;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (className !== undefined && className !== '') {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

export function withAttrs<T extends HTMLElement>(
  node: T,
  attrs: Record<string, AttributeValue>,
): T {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }

  return node;
}

export function qs<T extends Element>(
  root: ParentNode,
  selector: string,
): T | null {
  return root.querySelector<T>(selector);
}

export function setText(node: Element, text: string): void {
  if (node.textContent !== text) {
    node.textContent = text;
  }
}

export function setHidden(node: HTMLElement, hidden: boolean): void {
  if (node.hidden !== hidden) {
    node.hidden = hidden;
  }
}

export function focusByKey(root: ParentNode, key: string | null): boolean {
  if (key === null) return false;

  const target = qs<HTMLElement>(root, `[data-focus-key="${key}"]`);
  if (target === null) return false;

  target.focus();
  return true;
}
