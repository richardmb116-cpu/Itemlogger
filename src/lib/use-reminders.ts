import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { planReminders } from './reminder-plan';
import {
  cancelReminders,
  getPermission,
  remindersSupported,
  requestPermission,
  syncReminders,
  useTappedReminderItemId,
  type PermissionState,
} from './reminders';
import { useStore } from './store';

/** Notification permission, re-checked whenever the app comes back to the foreground. */
export function useReminderPermission() {
  const [permission, setPermission] = useState<PermissionState>('undetermined');

  const refresh = useCallback(() => {
    void getPermission().then(setPermission);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { permission, setPermission, refresh };
}

/** Turn reminders on, asking iOS for permission first. Returns whether they're now on. */
export function useEnableReminders() {
  const { updateSettings } = useStore();
  return useCallback(async () => {
    if (!remindersSupported) return false;
    const state = await requestPermission();
    const granted = state === 'granted';
    updateSettings({ remindersEnabled: granted, remindersPromptDismissed: true });
    return granted;
  }, [updateSettings]);
}

/**
 * Keeps scheduled notifications in step with the items and settings, and opens the
 * right item when a reminder is tapped. Mount once, near the root.
 */
export function useReminderSync() {
  const { items, settings } = useStore();
  const { permission, refresh } = useReminderPermission();
  // Re-check right after the user switches reminders on (the iOS prompt may have just been answered).
  useEffect(() => refresh(), [settings.remindersEnabled, refresh]);
  const active = remindersSupported && settings.remindersEnabled && permission === 'granted';

  // Only the fields that affect reminders, so edits to notes or photos don't reschedule.
  const signature = JSON.stringify([
    active,
    settings.reminderDays,
    items.map((i) => [i.id, i.name, i.purchaseDate, i.warrantyMonths]),
  ]);
  const latest = useRef({ items, days: settings.reminderDays });
  latest.current = { items, days: settings.reminderDays };

  useEffect(() => {
    if (!remindersSupported) return;
    const timer = setTimeout(() => {
      const work = active
        ? syncReminders(planReminders(latest.current.items, latest.current.days))
        : cancelReminders();
      work.catch((e) => console.warn('Could not update warranty reminders', e));
    }, 400);
    return () => clearTimeout(timer);
  }, [signature, active]);

  const tappedItemId = useTappedReminderItemId();
  useEffect(() => {
    if (tappedItemId && items.some((i) => i.id === tappedItemId)) {
      router.push(`/item/${tappedItemId}`);
    }
    // Only react to a new tap, not to item edits.
  }, [tappedItemId]); // eslint-disable-line react-hooks/exhaustive-deps
}
