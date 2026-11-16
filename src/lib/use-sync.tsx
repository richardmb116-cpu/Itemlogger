import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { resetSyncState } from './outbox';
import { useStore } from './store';
import { getSupabase, syncConfigured } from './supabase';
import { syncNow } from './sync';

type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error';

type SyncState = {
  configured: boolean;
  status: SyncStatus;
  email: string | null;
  lastSynced: Date | null;
  error: string | null;
  sync: () => Promise<void>;
  /** Email a 6-digit sign-in code. */
  sendCode: (email: string) => Promise<string | null>;
  /** Check the code; returns an error message, or null when signed in. */
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const SyncContext = createContext<SyncState | null>(null);

const EDIT_DELAY_MS = 2500;
const POLL_MS = 60_000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { items, settings, syncHost } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hostRef = useRef(syncHost);
  useEffect(() => {
    hostRef.current = syncHost;
  }, [syncHost]);

  const sync = useCallback(async () => {
    if (!syncConfigured) return;
    setBusy(true);
    try {
      await syncNow(hostRef.current);
      setLastSynced(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }, []);

  // Follow the signed-in account.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void getSupabase().then((sb) => {
      if (!sb || cancelled) return;
      void sb.auth.getSession().then(({ data }) => setSession(data.session));
      const { data } = sb.auth.onAuthStateChange((_event, next) => setSession(next));
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signedIn = !!session;

  // Sync when signed in, when the app comes back, and every minute while it's open.
  useEffect(() => {
    if (!signedIn) return;
    const first = setTimeout(() => void sync(), 0);
    const poll = setInterval(() => {
      if (AppState.currentState === 'active') void sync();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void sync();
    });
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      sub.remove();
    };
  }, [signedIn, sync]);

  // Push edits a moment after they happen.
  useEffect(() => {
    if (!signedIn) return;
    const t = setTimeout(() => void sync(), EDIT_DELAY_MS);
    return () => clearTimeout(t);
  }, [items, settings, signedIn, sync]);

  const value = useMemo<SyncState>(
    () => ({
      configured: syncConfigured,
      status: !syncConfigured ? 'off' : !session ? 'signed-out' : busy ? 'syncing' : error ? 'error' : 'synced',
      email: session?.user.email ?? null,
      lastSynced,
      error,
      sync,
      sendCode: async (email) => {
        const supabase = await getSupabase();
        if (!supabase) return 'Sync isn’t set up in this build.';
        const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
        return e ? e.message : null;
      },
      verifyCode: async (email, code) => {
        const supabase = await getSupabase();
        if (!supabase) return 'Sync isn’t set up in this build.';
        const { error: e } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
        return e ? e.message : null;
      },
      signOut: async () => {
        const supabase = await getSupabase();
        if (!supabase) return;
        await supabase.auth.signOut();
        // Items stay on this device; the next account starts its own sync from scratch.
        resetSyncState();
        setLastSynced(null);
      },
    }),
    [session, busy, error, lastSynced, sync],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
