/**
 * Browser storage for the web preview. The iPhone app uses SQLite (storage.ts).
 *
 * Everything lives in IndexedDB, which holds hundreds of MB, because localStorage's ~5 MB fills
 * up quickly once receipt photos are attached. Reads stay synchronous: every key is loaded into
 * memory once at start-up (`kvReady`, awaited before the app renders), and writes update memory at
 * once, then persist. Data from older versions in localStorage is copied over on first load. If
 * IndexedDB isn't available, localStorage is used as before.
 */
const DB_NAME = 'vestle';
const STORE = 'kv';
const cache = new Map<string, string>();
let db: IDBDatabase | null = null;

type Listener = (message: string) => void;
const failureListeners = new Set<Listener>();

/** Be told when something couldn't be saved (storage full or blocked), so the person can be warned. */
export function onSaveFailure(listener: Listener): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

function reportFailure(error: unknown) {
  const full = error instanceof DOMException && /quota/i.test(error.name + error.message);
  const message = full
    ? 'This browser’s storage for Vestle is full, so your latest change wasn’t saved. Remove some photos or items.'
    : 'Your latest change couldn’t be saved in this browser.';
  failureListeners.forEach((l) => l(message));
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function openDb(): Promise<IDBDatabase> {
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(STORE);
  return request(open);
}

function legacy(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const kvReady: Promise<void> = (async () => {
  try {
    db = await openDb();
    const tx = db.transaction(STORE, 'readonly').objectStore(STORE);
    const [keys, values] = await Promise.all([request(tx.getAllKeys()), request(tx.getAll())]);
    keys.forEach((k, i) => cache.set(String(k), String(values[i])));
  } catch {
    db = null;
  }
  // Bring over anything still in localStorage from earlier versions.
  const ls = legacy();
  if (!ls) return;
  const moved: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const key = ls.key(i);
    if (key == null || cache.has(key)) continue;
    const value = ls.getItem(key);
    if (value == null) continue;
    cache.set(key, value);
    moved.push(key);
  }
  if (db && moved.length) {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      moved.forEach((k) => tx.objectStore(STORE).put(cache.get(k)!, k));
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      // Only clear the old copy once it's safely in IndexedDB.
      moved.forEach((k) => ls.removeItem(k));
    } catch {
      // Keep the localStorage copy; it'll be picked up again next time.
    }
  }
})();

export const kv = {
  get: (key: string): string | null => cache.get(key) ?? null,
  set: async (key: string, value: string) => {
    cache.set(key, value);
    try {
      if (db) {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      } else {
        legacy()?.setItem(key, value);
      }
    } catch (error) {
      reportFailure(error);
    }
  },
};
