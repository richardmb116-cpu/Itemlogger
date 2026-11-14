import { daysBetween, parseISODate, toISODate } from './dates';
import type { Item } from './types';

/** How long you've had something, in calendar terms. */
export type Age = { years: number; months: number; days: number; label: string };

export function ageOf(purchaseDate: string, today = new Date()): Age {
  const start = parseISODate(purchaseDate);
  let months = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const days = Math.max(0, daysBetween(start, today));

  let label: string;
  if (months < 1) label = days <= 1 ? (days === 0 ? 'New today' : '1 day old') : `${days} days old`;
  else if (years === 0) label = `${months} month${months === 1 ? '' : 's'} old`;
  else if (rem === 0) label = `${years} year${years === 1 ? '' : 's'} old`;
  else label = `${years} yr ${rem} mo old`;
  return { years, months: rem, days, label };
}

/** The anniversary of a purchase in a given year; Feb 29 purchases celebrate on Feb 28 in other years. */
function anniversaryIn(start: Date, year: number): Date {
  const lastDay = new Date(year, start.getMonth() + 1, 0).getDate();
  return new Date(year, start.getMonth(), Math.min(start.getDate(), lastDay));
}

export type Birthday = {
  /** ISO date of the next birthday (today, if it's today). */
  date: string;
  /** The age it turns on that day. */
  turning: number;
  daysUntil: number;
};

export function nextBirthday(purchaseDate: string, today = new Date()): Birthday {
  const start = parseISODate(purchaseDate);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let year = Math.max(today.getFullYear(), start.getFullYear() + 1);
  let date = anniversaryIn(start, year);
  if (date < todayMidnight) {
    year += 1;
    date = anniversaryIn(start, year);
  }
  return { date: toISODate(date), turning: year - start.getFullYear(), daysUntil: daysBetween(todayMidnight, date) };
}

export function isBirthdayToday(item: Pick<Item, 'purchaseDate'>, today = new Date()): boolean {
  return nextBirthday(item.purchaseDate, today).daysUntil === 0;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

/** Items (not sold) with a birthday within the next `withinDays` days, soonest first. */
export function upcomingBirthdays(items: Item[], withinDays = 7, today = new Date()) {
  return items
    .filter((i) => !i.sold)
    .map((item) => ({ item, birthday: nextBirthday(item.purchaseDate, today) }))
    .filter((b) => b.birthday.daysUntil <= withinDays)
    .sort((a, b) => a.birthday.daysUntil - b.birthday.daysUntil);
}
