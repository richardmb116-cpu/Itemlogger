import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import type { PlannedReminder } from './reminder-plan';

/** Identifiers of notifications this app schedules (so others are never touched). */
const PREFIXES = ['warranty-', 'birthday-'];

// Show reminders as a banner even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const remindersSupported = true;

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermission(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

/** Ask iOS for permission. Returns the resulting state (no prompt if already decided). */
export async function requestPermission(): Promise<PermissionState> {
  const current = await getPermission();
  if (current !== 'undetermined') return current;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return status as PermissionState;
}

export function openSystemSettings() {
  void Linking.openSettings();
}

/** Replace every pending warranty reminder with the given plan. */
export async function syncReminders(plan: PlannedReminder[]): Promise<void> {
  await cancelReminders();
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { itemId: r.itemId }, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date },
    });
  }
}

export async function cancelReminders(): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => PREFIXES.some((p) => n.identifier.startsWith(p)))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** The item id from the notification the user tapped to open the app, if any. */
export function useTappedReminderItemId(): string | null {
  const response = Notifications.useLastNotificationResponse();
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const itemId = response.notification.request.content.data?.itemId;
  return typeof itemId === 'string' ? itemId : null;
}
