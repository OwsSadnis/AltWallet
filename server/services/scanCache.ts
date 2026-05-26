const cache = new Map<string, { result: unknown; expiry: number }>();

export function getCached(address: string, chain: string): unknown | null {
  const key = `${chain}:${address.toLowerCase()}`;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) { cache.delete(key); return null; }
  return entry.result;
}

export function setCached(address: string, chain: string, result: unknown): void {
  const key = `${chain}:${address.toLowerCase()}`;
  cache.set(key, { result, expiry: Date.now() + 60 * 60 * 1000 });
}
