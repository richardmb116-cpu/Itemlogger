import Storage from 'expo-sqlite/kv-store';

/** On-device key/value storage backed by SQLite. See storage.web.ts for the browser version. */
export const kv = {
  get: (key: string) => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItemAsync(key, value),
};
