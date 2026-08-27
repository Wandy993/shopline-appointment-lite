export class TinyTtlCache {
  constructor({ ttlMs = 4000, maxEntries = 250 } = {}) {
    this.ttlMs = Math.max(0, Number(ttlMs || 0));
    this.maxEntries = Math.max(1, Number(maxEntries || 1));
    this.entries = new Map();
  }

  get(key) {
    const entry = this.entries.get(String(key));
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(String(key));
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    const normalized = String(key);
    if (this.entries.size >= this.maxEntries && !this.entries.has(normalized)) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(normalized, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }

  delete(key) { this.entries.delete(String(key)); }
  clear() { this.entries.clear(); }
}

export function createSingleFlight() {
  const inflight = new Map();
  return async function singleFlight(key, task) {
    const normalized = String(key);
    if (inflight.has(normalized)) return inflight.get(normalized);
    const promise = Promise.resolve().then(task).finally(() => inflight.delete(normalized));
    inflight.set(normalized, promise);
    return promise;
  };
}
