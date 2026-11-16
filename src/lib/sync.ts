import { readCursor, readOutbox, setSettingsChangedAt, settingsChangedAt, writeCursor, writeOutbox } from './outbox';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from './supabase';
import { toLocalUri, toRemoteUri } from './sync-files';
import { clearPushed, mergeRemote, pendingRows, syncedSettings, type RemoteItemRow, type SyncedSettings } from './sync-merge';
import type { Item, Settings } from './types';

/** How the sync engine reads and writes the app's data (implemented by the store). */
export type SyncHost = {
  getItems: () => Item[];
  setItems: (items: Item[]) => void;
  getSettings: () => Settings;
  applySettings: (s: SyncedSettings) => void;
};

/** Re-read a little before the last cursor, so rows committed out of order aren't missed. */
const OVERLAP_MS = 5000;
const PAGE = 500;

/**
 * One round of sync: pull what changed on the server, merge it (last write wins), then push what
 * changed here. Safe to call often; concurrent calls share one run.
 */
let running: Promise<void> | null = null;

export function syncNow(host: SyncHost): Promise<void> {
  running ??= run(host).finally(() => {
    running = null;
  });
  return running;
}

let supabase: SupabaseClient | null = null;

async function run(host: SyncHost) {
  supabase = await getSupabase();
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return;

  // First sync for this account on this device: offer everything already here to the server.
  if (!readCursor()) {
    const outbox = readOutbox();
    const ids = new Set([...outbox.dirty, ...host.getItems().map((i) => i.id)]);
    writeOutbox({ ...outbox, dirty: [...ids], settingsDirty: true });
  }

  await pullItems(host);
  await pullSettings(host);
  await pushItems(host, userId);
  await pushSettings(host);
  await resolveMissingPhotos(host);
}

async function pullItems(host: SyncHost) {
  const cursor = readCursor();
  const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : new Date(0).toISOString();
  let from = since;
  let latest = cursor ?? '';
  for (;;) {
    const { data, error } = await supabase!
      .from('items')
      .select('id, data, deleted, updated_at, synced_at')
      .gt('synced_at', from)
      .order('synced_at', { ascending: true })
      .limit(PAGE);
    if (error) throw error;
    const rows = (data ?? []) as RemoteItemRow[];
    if (rows.length === 0) break;

    // Bring photos down before the items reach the screen.
    for (const row of rows) {
      if (row.data) {
        row.data = {
          ...row.data,
          photoUri: await toLocalUri(row.data.photoUri),
          receiptUri: await toLocalUri(row.data.receiptUri),
        };
      }
    }
    const merged = mergeRemote(host.getItems(), rows, readOutbox());
    if (merged.changed) host.setItems(merged.items);
    writeOutbox(merged.outbox);

    from = rows[rows.length - 1].synced_at;
    if (from > latest) latest = from;
    if (rows.length < PAGE) break;
  }
  if (latest) writeCursor(latest);
}

async function pushItems(host: SyncHost, userId: string) {
  const items = host.getItems();
  const rows = pendingRows(items, readOutbox());
  if (rows.length === 0) return;
  const payload = [];
  for (const row of rows) {
    payload.push(
      row.data
        ? {
            ...row,
            data: {
              ...row.data,
              photoUri: await toRemoteUri(row.data.photoUri, userId),
              receiptUri: await toRemoteUri(row.data.receiptUri, userId),
            },
          }
        : row,
    );
  }
  const { error } = await supabase!.from('items').upsert(payload, { onConflict: 'user_id,id' });
  if (error) throw error;
  writeOutbox(clearPushed(readOutbox(), rows, host.getItems()));
}

async function pullSettings(host: SyncHost) {
  const { data, error } = await supabase!.from('user_settings').select('data, updated_at').maybeSingle();
  if (error) throw error;
  if (!data) return;
  if (Date.parse(data.updated_at) > Date.parse(settingsChangedAt())) {
    host.applySettings(data.data as SyncedSettings);
    setSettingsChangedAt(data.updated_at);
    writeOutbox({ ...readOutbox(), settingsDirty: false });
  }
}

async function pushSettings(host: SyncHost) {
  if (!readOutbox().settingsDirty) return;
  const at = settingsChangedAt();
  const { error } = await supabase!
    .from('user_settings')
    .upsert({ data: syncedSettings(host.getSettings()), updated_at: at }, { onConflict: 'user_id' });
  if (error) throw error;
  if (settingsChangedAt() === at) writeOutbox({ ...readOutbox(), settingsDirty: false });
}

/** Retry photo downloads that failed on an earlier sync. */
async function resolveMissingPhotos(host: SyncHost) {
  const items = host.getItems();
  const missing = items.filter((i) => i.photoUri?.startsWith('remote:') || i.receiptUri?.startsWith('remote:'));
  if (missing.length === 0) return;
  const fixed = new Map<string, Item>();
  for (const item of missing) {
    const photoUri = await toLocalUri(item.photoUri);
    const receiptUri = await toLocalUri(item.receiptUri);
    if (photoUri !== item.photoUri || receiptUri !== item.receiptUri) fixed.set(item.id, { ...item, photoUri, receiptUri });
  }
  if (fixed.size) host.setItems(host.getItems().map((i) => fixed.get(i.id) ?? i));
}
