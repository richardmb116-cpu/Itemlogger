import Storage from 'expo-sqlite/kv-store';

/** On-device key/value storage backed by SQLite. See storage.web.ts for the browser version. */

type Listener = (message: string) => void;
const failureListeners = new Set<Listener>();

/** Be told when something couldn't be saved, so the person can be warned. */
export function onSaveFailure(listener: Listener): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

/** SQLite reads synchronously, so there's nothing to wait for. */
export const kvReady: Promise<void> = Promise.resolve();

export const kv = {
  get: (key: string) => Storage.getItemSync(key),
  set: async (key: string, value: string) => {
    try {
      await Storage.setItemAsync(key, value);
    } catch {
      failureListeners.forEach((l) => l('Your latest change couldn’t be saved on this device. Check there’s free space.'));
    }
  },
};
