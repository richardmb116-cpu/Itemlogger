import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import './supabase-session';

/**
 * Sync backend. Set these in .env (see .env.example). The publishable key is safe to ship in the
 * app: row-level security in supabase/migrations limits every account to its own data.
 * Without them the app runs exactly as before, on this device only.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const syncConfigured = !!url && !!key;

export const supabase: SupabaseClient | null = syncConfigured
  ? createClient(url!, key!, {
      auth: {
        storage: globalThis.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Only refresh the session while the app is in the foreground.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const PHOTO_BUCKET = 'photos';
