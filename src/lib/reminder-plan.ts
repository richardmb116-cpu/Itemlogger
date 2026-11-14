import { parseISODate } from './dates';
import type { Item } from './types';
import { warrantyStatus } from './warranty';

/** Lead times users can pick, in days before the warranty ends. 0 = on the day. */
export const REMINDER_OPTIONS = [
  { days: 30, label: '30 days before' },
  { days: 7, label: '1 week before' },
  { days: 0, label: 'On the day' },
] as const;

export const DEFAULT_REMINDER_DAYS = [30, 7];

/** Reminders fire at this local time so they never arrive overnight. */
export const REMINDER_HOUR = 9;

/** iOS keeps at most 64 pending local notifications per app; leave some headroom. */
export const MAX_SCHEDULED = 60;

export type PlannedReminder = {
  /** Stable id, so rescheduling replaces rather than duplicates. */
  id: string;
  itemId: string;
  date: Date;
  title: string;
  body: string;
};

/**
 * Work out every warranty reminder that should be pending right now.
 * Pure: give it items, lead times and the current time; it returns what to schedule.
 */
export function planReminders(items: Item[], leadDays: number[], now = new Date()): PlannedReminder[] {
  const plan: PlannedReminder[] = [];
  const leads = [...new Set(leadDays)].sort((a, b) => b - a);

  for (const item of items) {
    const status = warrantyStatus(item, now);
    if (!status.expires || status.state === 'expired') continue;
    const end = parseISODate(status.expires);

    for (const lead of leads) {
      const date = new Date(end.getFullYear(), end.getMonth(), end.getDate() - lead, REMINDER_HOUR, 0, 0, 0);
      if (date.getTime() <= now.getTime()) continue;
      plan.push({
        id: `warranty-${item.id}-${lead}`,
        itemId: item.id,
        date,
        title: titleFor(item.name, lead),
        body: bodyFor(lead),
      });
    }
  }

  return plan.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED);
}

function titleFor(name: string, lead: number): string {
  if (lead === 0) return `${name}: warranty ends today`;
  if (lead === 7) return `${name}: warranty ends in a week`;
  return `${name}: warranty ends in ${lead} days`;
}

function bodyFor(lead: number): string {
  if (lead === 0) return 'Last chance to make a claim. Tap to see the receipt and serial number.';
  return 'Anything not working right? Now is the time to claim. Tap to see the receipt and serial number.';
}

function joinWords(words: string[]): string {
  return words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** Human summary of the chosen lead times, e.g. "30 days and 1 week before". */
export function reminderSummary(leadDays: number[]): string {
  const before = [...new Set(leadDays)]
    .filter((d) => d > 0)
    .sort((a, b) => b - a)
    .map((d) => (d === 7 ? '1 week' : `${d} days`));
  const parts: string[] = [];
  if (before.length) parts.push(`${joinWords(before)} before`);
  if (leadDays.includes(0)) parts.push(before.length ? 'on the day' : 'on the day it ends');
  if (parts.length === 0) return 'No reminders';
  const text = parts.join(', and ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
