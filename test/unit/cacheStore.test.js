import { describe, expect, test } from 'vitest';

import { CacheStore } from '../../src/analyzer/cacheStore.js';

describe('CacheStore', () => {
  test('clears query and session caches without touching metadata', () => {
    const cache = new CacheStore();
    cache.setMeta({ selfUserId: 'usr_self' });
    cache.setSessionWindow('db:usr_self:2026-04-01:2026-04-30', [{ id: 1 }]);
    cache.setQueryResult('timeline:usr_self', { sessions: [] });

    cache.clearAnalysis();

    expect(cache.getMeta()).toEqual({ selfUserId: 'usr_self' });
    expect(cache.getSessionWindow('db:usr_self:2026-04-01:2026-04-30')).toBeUndefined();
    expect(cache.getQueryResult('timeline:usr_self')).toBeUndefined();
  });
});
