import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { planNotifications, type PlannedReminder } from './reminder-plan';
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
  const wantsAny = settings.remindersEnabled || settings.birthdaysEnabled;
  const active = remindersSupported && wantsAny && permission === 'granted';

  // The plan, serialized: rescheduling only happens when a reminder actually changes,
  // so edits to notes or photos don't touch notifications.
  const planKey = active
    ? JSON.stringify(
        planNotifications(items, {
          warranties: settings.remindersEnabled,
          leadDays: settings.reminderDays,
          birthdays: settings.birthdaysEnabled,
          region: settings.taxRegion,
        }).map((r) => ({ ...r, date: r.date.toISOString() })),
      )
    : '';

  useEffect(() => {
    if (!remindersSupported) return;
    const timer = setTimeout(() => {
      const plan = planKey
        ? (JSON.parse(planKey) as (Omit<PlannedReminder, 'date'> & { date: string })[]).map((r) => ({
            ...r,
            date: new Date(r.date),
          }))
        : null;
      const work = plan ? syncReminders(plan) : cancelReminders();
      work.catch((e) => console.warn('Could not update warranty reminders', e));
    }, 400);
    return () => clearTimeout(timer);
  }, [planKey]);

  const tappedItemId = useTappedReminderItemId();
  useEffect(() => {
    if (tappedItemId && items.some((i) => i.id === tappedItemId)) {
      router.push(`/item/${tappedItemId}`);
    }
    // Only react to a new tap, not to item edits.
  }, [tappedItemId]); // eslint-disable-line react-hooks/exhaustive-deps
}
