import { toISODate } from './dates';
import type { Item } from './types';

/**
 * Weekly streaks. Buying things isn't a daily habit, so a week counts if you add or improve
 * anything in it: a new item, a receipt, photo, serial number or price, or recording a sale.
 * Weeks start on Monday. The current week never breaks a streak; it only extends it.
 */

/** The Monday that starts the week containing `date`, as yyyy-mm-dd. */
export function weekKey(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

function previousWeek(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() - 7);
  return weekKey(d);
}

/** Whether a save made the inventory more useful (and so counts toward the streak). */
export function isProgress(prev: Item | undefined, next: Item): boolean {
  if (!prev) return true;
  const gained = (a: unknown, b: unknown) => !a && !!b;
  return (
    gained(prev.receiptUri, next.receiptUri) ||
    gained(prev.photoUri, next.photoUri) ||
    gained(prev.serial.trim(), next.serial.trim()) ||
    gained(prev.price, next.price) ||
    gained(prev.sold, next.sold)
  );
}

export type Streak = {
  /** Weeks in a row up to this week (or last week, if this week hasn't happened yet). */
  current: number;
  best: number;
  thisWeek: boolean;
  /** The last `n` weeks, oldest first: true where something was done. */
  recent: boolean[];
};

export function streak(weeks: string[], today = new Date(), n = 8): Streak {
  const done = new Set(weeks);
  const thisWeek = weekKey(today);
  let key = done.has(thisWeek) ? thisWeek : previousWeek(thisWeek);
  let current = 0;
  while (done.has(key)) {
    current++;
    key = previousWeek(key);
  }
  // Best run anywhere in the history.
  let best = 0;
  for (const w of done) {
    if (done.has(previousWeek(w))) continue; // not the start of a run
    let run = 0;
    let k = w;
    while (done.has(k)) {
      run++;
      const d = new Date(`${k}T12:00:00`);
      d.setDate(d.getDate() + 7);
      k = weekKey(d);
    }
    best = Math.max(best, run);
  }
  const recent: boolean[] = [];
  let k = thisWeek;
  for (let i = 0; i < n; i++) {
    recent.unshift(done.has(k));
    k = previousWeek(k);
  }
  return { current, best, thisWeek: done.has(thisWeek), recent };
}

/** Add this week to the history (kept to the last two years). */
export function recordWeek(weeks: string[], today = new Date()): string[] {
  const key = weekKey(today);
  if (weeks.includes(key)) return weeks;
  return [...weeks, key].sort().slice(-104);
}
