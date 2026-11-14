/** Browser preview storage. The iPhone app uses SQLite (storage.ts). */
export const kv = {
  get: (key: string): string | null => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode or blocked storage: keep working in memory.
    }
  },
};
