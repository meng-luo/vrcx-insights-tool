const VRCHAT_WORLD_ENDPOINT = 'https://api.vrchat.cloud/api/1/worlds';
const VRCHAT_REQUEST_HEADERS = Object.freeze({
  Accept: 'application/json',
  'User-Agent':
    'vrcx-insights-tool/1.0.0 (contact: https://github.com/meng-luo/vrcx-insights-tool)'
});

function normalizeWorldId(worldId) {
  return typeof worldId === 'string' ? worldId.trim() : '';
}

export class WorldNameResolver {
  constructor({ fetchImpl = globalThis.fetch } = {}) {
    this.fetchImpl = fetchImpl;
    this.cache = new Map();
    this.pending = new Map();
  }

  async resolveWorldName(worldId) {
    const normalized = normalizeWorldId(worldId);
    if (!normalized) {
      return '';
    }

    if (this.cache.has(normalized)) {
      return this.cache.get(normalized);
    }

    if (this.pending.has(normalized)) {
      return this.pending.get(normalized);
    }

    const request = this.fetchWorldName(normalized)
      .catch(() => '')
      .then((name) => {
        this.cache.set(normalized, name);
        this.pending.delete(normalized);
        return name;
      });

    this.pending.set(normalized, request);
    return request;
  }

  async resolveWorldNames(worldIds = []) {
    const ids = Array.from(new Set((worldIds || []).map(normalizeWorldId).filter(Boolean)));
    const entries = await Promise.all(
      ids.map(async (worldId) => [worldId, await this.resolveWorldName(worldId)])
    );
    return Object.fromEntries(entries);
  }

  async fetchWorldName(worldId) {
    if (typeof this.fetchImpl !== 'function') {
      return '';
    }

    const response = await this.fetchImpl(`${VRCHAT_WORLD_ENDPOINT}/${encodeURIComponent(worldId)}`, {
      headers: VRCHAT_REQUEST_HEADERS
    });
    if (!response?.ok) {
      return '';
    }

    const json = await response.json();
    return typeof json?.name === 'string' ? json.name : '';
  }
}
