import { memoryCache } from '../lib/cache';

describe('Memory Cache (T-12)', () => {
  beforeEach(() => {
    memoryCache.clear();
  });

  it('should store and retrieve data', () => {
    memoryCache.set('key1', { value: 'test' }, 5000);
    const result = memoryCache.get<{ value: string }>('key1');
    expect(result).toEqual({ value: 'test' });
  });

  it('should return null for non-existent key', () => {
    const result = memoryCache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should expire cached data after TTL', async () => {
    memoryCache.set('expiring', { data: 'value' }, 100);
    expect(memoryCache.get('expiring')).toEqual({ data: 'value' });

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(memoryCache.get('expiring')).toBeNull();
  });

  it('should clear all cached data', () => {
    memoryCache.set('key1', 'value1', 5000);
    memoryCache.set('key2', 'value2', 5000);

    memoryCache.clear();

    expect(memoryCache.get('key1')).toBeNull();
    expect(memoryCache.get('key2')).toBeNull();
  });
});
