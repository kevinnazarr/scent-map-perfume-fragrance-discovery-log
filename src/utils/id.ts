export function createId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto;

  if (cryptoApi !== undefined && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  return `frag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
