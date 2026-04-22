import { describe, expect, test, vi } from 'vitest';

import { WorldNameResolver } from '../../src/electron/worldNameResolver.js';

describe('WorldNameResolver', () => {
  test('resolves world names from the VRChat world endpoint and caches by world id', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      async json() {
        return {
          id: 'wrld_test',
          name: 'Test World'
        };
      }
    }));

    const resolver = new WorldNameResolver({ fetchImpl });

    await expect(resolver.resolveWorldNames(['wrld_test', 'wrld_test'])).resolves.toEqual({
      wrld_test: 'Test World'
    });
    await expect(resolver.resolveWorldNames(['wrld_test'])).resolves.toEqual({
      wrld_test: 'Test World'
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.vrchat.cloud/api/1/worlds/wrld_test', {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'vrcx-insights-tool/1.0.0 (contact: https://github.com/meng-luo/vrcx-insights-tool)'
      }
    });
  });

  test('skips empty ids and returns an empty name when the API response is not usable', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 404,
      async json() {
        return {
          error: {
            message: 'Not Found'
          }
        };
      }
    }));

    const resolver = new WorldNameResolver({ fetchImpl });

    await expect(resolver.resolveWorldNames(['', 'wrld_missing'])).resolves.toEqual({
      wrld_missing: ''
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
