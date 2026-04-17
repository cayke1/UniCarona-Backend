const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function get<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function set(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  });
}

export function clear(): void {
  cache.clear();
}

export const memoryCache = { get, set, clear };
