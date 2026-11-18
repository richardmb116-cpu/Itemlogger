import { addDays, daysBetween, parseISODate, toISODate } from './dates';
import type { Item } from './types';

/** Return windows: the days a store gives to bring something back (and, often, to claim a price drop). */
export const RETURN_OPTIONS = [14, 30, 60, 90, 365];

/** Flag a window as closing this many days before it shuts. */
export const RETURN_CLOSING_DAYS = 7;

export type ReturnStatus = {
  state: 'none' | 'open' | 'closing' | 'closed';
  /** Last day to return, yyyy-mm-dd. */
  closes: string | null;
  daysLeft: number | null;
  label: string;
};

export function returnStatus(item: Pick<Item, 'purchaseDate' | 'returnDays' | 'sold'>, today = new Date()): ReturnStatus {
  if (!item.returnDays || item.sold) return { state: 'none', closes: null, daysLeft: null, label: '' };
  const last = addDays(parseISODate(item.purchaseDate), item.returnDays);
  const daysLeft = daysBetween(today, last);
  const closes = toISODate(last);
  if (daysLeft < 0) return { state: 'closed', closes, daysLeft, label: 'Return window closed' };
  const label = daysLeft === 0 ? 'Last day to return' : `Return within ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  return { state: daysLeft <= RETURN_CLOSING_DAYS ? 'closing' : 'open', closes, daysLeft, label };
}
