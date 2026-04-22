export class CacheStore {
  constructor() {
    this.meta = null;
    this.sessionWindows = new Map();
    this.queryResults = new Map();
    this.locationParses = new Map();
  }

  getMeta() {
    return this.meta;
  }

  setMeta(meta) {
    this.meta = meta;
  }

  clearAnalysis() {
    this.sessionWindows.clear();
    this.queryResults.clear();
    this.locationParses.clear();
  }

  getSessionWindow(key) {
    return this.sessionWindows.get(key);
  }

  setSessionWindow(key, value) {
    this.sessionWindows.set(key, value);
  }

  getQueryResult(key) {
    return this.queryResults.get(key);
  }

  setQueryResult(key, value) {
    this.queryResults.set(key, value);
  }
}
