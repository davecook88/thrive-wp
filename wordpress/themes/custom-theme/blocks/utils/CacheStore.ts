export default class CacheStore {
  prefix: string;
  ttlMs: number;

  constructor(prefix = "thrive-cache", ttlMs = 1000 * 60 * 5) {
    this.prefix = prefix;
    this.ttlMs = ttlMs;
  }

  private domId(key: string) {
    return `${this.prefix}-${key}`;
  }

  read<T = any>(key: string): T | null {
    try {
      const win: any = window as any;
      const fullKey = this.domId(key);
      if (win && win.__THRIVE_CACHE && win.__THRIVE_CACHE[fullKey]) {
        const { ts, data } = win.__THRIVE_CACHE[fullKey];
        if (Date.now() - ts < this.ttlMs) return data as T;
      }

      const el = document.getElementById(fullKey);
      if (el && el.textContent) {
        const parsed = JSON.parse(el.textContent || "null");
        if (parsed && parsed.ts && Date.now() - parsed.ts < this.ttlMs)
          return parsed.data as T;
      }
    } catch (err) {
      // swallow; treat as cache miss
    }
    return null;
  }

  write<T = any>(key: string, data: T) {
    try {
      const payload = { ts: Date.now(), data };
      const fullKey = this.domId(key);

      // write to window
      const win: any = window as any;
      win.__THRIVE_CACHE = win.__THRIVE_CACHE || {};
      win.__THRIVE_CACHE[fullKey] = payload;

      // write to DOM script node
      let el = document.getElementById(fullKey) as HTMLScriptElement | null;
      if (!el) {
        el = document.createElement("script");
        el.id = fullKey;
        el.type = "application/json";
        // append to head so it's not visible in body flow
        (document.head || document.documentElement).appendChild(el);
      }
      el.textContent = JSON.stringify(payload);
    } catch (err) {
      // ignore write errors
    }
  }

  invalidate(key: string) {
    try {
      const fullKey = this.domId(key);
      const win: any = window as any;
      if (win && win.__THRIVE_CACHE) delete win.__THRIVE_CACHE[fullKey];
      const el = document.getElementById(fullKey);
      if (el) el.remove();
    } catch (err) {
      // ignore
    }
  }
}
