import { Directory, File, Paths } from 'expo-file-system';

import { kv } from './storage';
import { PHOTO_BUCKET, supabase } from './supabase';
import { isBundled } from './photos';

/**
 * Photos and receipts sync as files in the private "photos" bucket. In the synced item they're
 * written as "remote:<user id>/<file>"; each device downloads them into its own documents folder.
 */
export const REMOTE = 'remote:';
const MAP_KEY = 'sync.files.v1'; // local file uri → remote path, so each file uploads once

function readMap(): Record<string, string> {
  try {
    return JSON.parse(kv.get(MAP_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function remember(local: string, remote: string) {
  void kv.set(MAP_KEY, JSON.stringify({ ...readMap(), [local]: remote }));
}

/** The URI to store on the server for a local photo, uploading it first if needed. */
export async function toRemoteUri(uri: string | null, userId: string): Promise<string | null> {
  if (!uri || isBundled(uri) || uri.startsWith(REMOTE) || !supabase) return uri;
  const known = readMap()[uri];
  if (known) return REMOTE + known;
  const file = new File(uri);
  if (!file.exists) return null;
  const name = uri.split('/').pop() ?? `${Date.now()}.jpg`;
  const path = `${userId}/${name}`;
  const ext = name.split('.').pop()?.toLowerCase();
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: ext === 'png' ? 'image/png' : 'image/jpeg', upsert: true });
  if (error) throw error;
  remember(uri, path);
  return REMOTE + path;
}

/** A local file for a photo stored on the server, downloading it if this device doesn't have it yet. */
export async function toLocalUri(uri: string | null): Promise<string | null> {
  if (!uri || !uri.startsWith(REMOTE) || !supabase) return uri;
  const path = uri.slice(REMOTE.length);
  const map = readMap();
  const existing = Object.keys(map).find((local) => map[local] === path && new File(local).exists);
  if (existing) return existing;
  const dir = new Directory(Paths.document, 'images');
  if (!dir.exists) dir.create({ intermediates: true });
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 300);
  if (error || !data) return uri; // try again next sync
  try {
    const file = await File.downloadFileAsync(data.signedUrl, new File(dir, path.split('/').pop()!), { idempotent: true });
    remember(file.uri, path);
    return file.uri;
  } catch {
    return uri;
  }
}
