import type { SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Sync backend. Set these in .env (see .env.example). The publishable key is safe to ship in the
 * app: row-level security in supabase/migrations limits every account to its own data.
 * Without them the app runs exactly as before, on this device only, and the Supabase library
 * (about 290 KB) is never loaded.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const syncConfigured = !!url && !!key;

export const PHOTO_BUCKET = 'photos';

let client: Promise<SupabaseClient | null> | null = null;

/** The Supabase client, created on first use; null when sync isn't configured. */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!syncConfigured) return Promise.resolve(null);
  client ??= (async () => {
    await import('./supabase-session');
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(url!, key!, {
      auth: {
        storage: globalThis.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    // Only refresh the session while the app is in the foreground (Expo's Supabase guide).
    if (Platform.OS !== 'web') {
      AppState.addEventListener('change', (state) => {
        if (state === 'active') sb.auth.startAutoRefresh();
        else sb.auth.stopAutoRefresh();
      });
    }
    return sb;
  })();
  return client;
}
