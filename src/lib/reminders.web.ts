/** Browser preview: notifications aren't available, so every call is a harmless no-op. */
import type { PlannedReminder } from './reminder-plan';

export const remindersSupported = false;

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermission(): Promise<PermissionState> {
  return 'undetermined';
}

export async function requestPermission(): Promise<PermissionState> {
  return 'denied';
}

export function openSystemSettings() {}

export async function syncReminders(_plan: PlannedReminder[]): Promise<void> {}

export async function cancelReminders(): Promise<void> {}

export function useTappedReminderItemId(): string | null {
  return null;
}
