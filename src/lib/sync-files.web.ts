import { isBundled } from './photos';

/** The browser preview doesn't sync photo files: it keeps server references as they are and never uploads. */
export const REMOTE = 'remote:';

export async function toRemoteUri(uri: string | null): Promise<string | null> {
  if (!uri || isBundled(uri) || uri.startsWith(REMOTE)) return uri;
  return null;
}

export async function toLocalUri(uri: string | null): Promise<string | null> {
  return uri;
}
