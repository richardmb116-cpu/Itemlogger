import type { Item, Settings } from './types';

/** A row as stored in Supabase (public.items). */
export type RemoteItemRow = {
  id: string;
  data: Item | null;
  deleted: boolean;
  updated_at: string;
  synced_at: string;
};

/** What this device still has to send: changed item ids, and deletions with when they happened. */
export type Outbox = {
  dirty: string[];
  deleted: Record<string, string>;
  settingsDirty: boolean;
};

export const EMPTY_OUTBOX: Outbox = { dirty: [], deleted: {}, settingsDirty: false };

const time = (iso: string) => Date.parse(iso) || 0;

/**
 * Fold rows pulled from the server into the local list. Last write wins on the time the user made
 * the change: a newer local edit or deletion survives (and stays in the outbox to be pushed); a newer
 * remote one replaces it. Returns the new items and outbox, and whether anything changed.
 */
export function mergeRemote(
  local: Item[],
  rows: RemoteItemRow[],
  outbox: Outbox,
): { items: Item[]; outbox: Outbox; changed: boolean } {
  const byId = new Map(local.map((i) => [i.id, i]));
  const dirty = new Set(outbox.dirty);
  const deleted = { ...outbox.deleted };
  let changed = false;

  for (const row of rows) {
    const mine = byId.get(row.id);
    const remoteTime = time(row.updated_at);
    if (mine) {
      if (time(mine.updatedAt) >= remoteTime) continue; // ours is as new or newer
      if (row.deleted || !row.data) byId.delete(row.id);
      else byId.set(row.id, row.data);
      dirty.delete(row.id);
      changed = true;
    } else {
      const goneAt = deleted[row.id];
      if (goneAt && time(goneAt) >= remoteTime) continue; // we deleted it after their edit
      if (goneAt) delete deleted[row.id];
      if (row.deleted || !row.data) continue;
      byId.set(row.id, row.data);
      dirty.delete(row.id);
      changed = true;
    }
  }

  // Keep the app's order: existing items in place, new ones at the front.
  const known = new Set(local.map((i) => i.id));
  const fresh = [...byId.values()].filter((i) => !known.has(i.id));
  const kept = local.filter((i) => byId.has(i.id)).map((i) => byId.get(i.id)!);
  return {
    items: [...fresh, ...kept],
    outbox: { ...outbox, dirty: [...dirty], deleted },
    changed,
  };
}

/** The rows to upsert for everything waiting in the outbox. */
export function pendingRows(items: Item[], outbox: Outbox): { id: string; data: Item | null; deleted: boolean; updated_at: string }[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const rows: { id: string; data: Item | null; deleted: boolean; updated_at: string }[] = [];
  for (const id of outbox.dirty) {
    const item = byId.get(id);
    if (item) rows.push({ id, data: item, deleted: false, updated_at: item.updatedAt });
  }
  for (const [id, at] of Object.entries(outbox.deleted)) {
    if (!byId.has(id)) rows.push({ id, data: null, deleted: true, updated_at: at });
  }
  return rows;
}

/** Settings that follow the account. The rest (reminders permission, welcome seen) stay per device. */
export type SyncedSettings = Pick<
  Settings,
  'taxRegion' | 'upgradeStyle' | 'depreciation' | 'insurance' | 'reminderDays' | 'birthdaysEnabled'
>;

export const SYNCED_SETTING_KEYS: (keyof SyncedSettings)[] = [
  'taxRegion',
  'upgradeStyle',
  'depreciation',
  'insurance',
  'reminderDays',
  'birthdaysEnabled',
];

export function syncedSettings(s: Settings): SyncedSettings {
  return Object.fromEntries(SYNCED_SETTING_KEYS.map((k) => [k, s[k]])) as SyncedSettings;
}

/** Remove a pushed change from the outbox, unless it changed again while the push was in flight. */
export function clearPushed(outbox: Outbox, pushed: { id: string; updated_at: string }[], items: Item[]): Outbox {
  const byId = new Map(items.map((i) => [i.id, i]));
  const done = new Set(
    pushed
      .filter((p) => {
        const item = byId.get(p.id);
        return item ? item.updatedAt === p.updated_at : outbox.deleted[p.id] === p.updated_at;
      })
      .map((p) => p.id),
  );
  const deleted = Object.fromEntries(Object.entries(outbox.deleted).filter(([id]) => !done.has(id)));
  return { ...outbox, dirty: outbox.dirty.filter((id) => !done.has(id)), deleted };
}
