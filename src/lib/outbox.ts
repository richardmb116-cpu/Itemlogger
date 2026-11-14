import { kv } from './storage';
import { EMPTY_OUTBOX, type Outbox } from './sync-merge';

/** Changes made on this device that the server hasn't seen yet. Kept on disk so they survive a restart. */
const KEY = 'sync.outbox.v1';

export function readOutbox(): Outbox {
  try {
    const raw = kv.get(KEY);
    return raw ? { ...EMPTY_OUTBOX, ...(JSON.parse(raw) as Outbox) } : EMPTY_OUTBOX;
  } catch {
    return EMPTY_OUTBOX;
  }
}

export function writeOutbox(outbox: Outbox) {
  void kv.set(KEY, JSON.stringify(outbox));
}

export function markChanged(ids: string[]) {
  const o = readOutbox();
  const dirty = new Set(o.dirty);
  ids.forEach((id) => dirty.add(id));
  const deleted = { ...o.deleted };
  ids.forEach((id) => delete deleted[id]);
  writeOutbox({ ...o, dirty: [...dirty], deleted });
}

export function markDeleted(ids: string[], at: string) {
  const o = readOutbox();
  const gone = new Set(ids);
  writeOutbox({
    ...o,
    dirty: o.dirty.filter((id) => !gone.has(id)),
    deleted: { ...o.deleted, ...Object.fromEntries(ids.map((id) => [id, at])) },
  });
}

const SETTINGS_AT = 'sync.settingsAt.v1';

export function markSettingsChanged(at: string) {
  writeOutbox({ ...readOutbox(), settingsDirty: true });
  void kv.set(SETTINGS_AT, at);
}

/** When the synced settings were last changed on this device (epoch if never). */
export function settingsChangedAt(): string {
  return kv.get(SETTINGS_AT) ?? new Date(0).toISOString();
}

export function setSettingsChangedAt(at: string) {
  void kv.set(SETTINGS_AT, at);
}

const CURSOR = 'sync.cursor.v1';

export const readCursor = () => kv.get(CURSOR);
export const writeCursor = (at: string) => void kv.set(CURSOR, at);

/** Forget sync state, e.g. on sign-out, so another account starts clean. */
export function resetSyncState() {
  writeOutbox(EMPTY_OUTBOX);
  void kv.set(CURSOR, '');
}
