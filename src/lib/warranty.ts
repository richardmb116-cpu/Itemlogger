import { addMonths, daysBetween, parseISODate, toISODate } from './dates';
import type { Item } from './types';

export type WarrantyState = 'none' | 'active' | 'expiring' | 'expired';

export type WarrantyStatus = {
  state: WarrantyState;
  /** ISO date the warranty ends, when there is one. */
  expires: string | null;
  daysLeft: number | null;
  /** Fraction of the warranty period used, 0–1. */
  progress: number;
  label: string;
};

/** Warranties ending within this many days are flagged as expiring. */
export const EXPIRING_SOON_DAYS = 60;

export function warrantyStatus(item: Pick<Item, 'purchaseDate' | 'warrantyMonths'>, today = new Date()): WarrantyStatus {
  if (!item.warrantyMonths) {
    return { state: 'none', expires: null, daysLeft: null, progress: 0, label: 'No warranty' };
  }
  const start = parseISODate(item.purchaseDate);
  const end = addMonths(start, item.warrantyMonths);
  const daysLeft = daysBetween(today, end);
  const total = Math.max(1, daysBetween(start, end));
  const progress = Math.min(1, Math.max(0, 1 - daysLeft / total));
  const expires = toISODate(end);

  if (daysLeft < 0) {
    return { state: 'expired', expires, daysLeft, progress: 1, label: 'Warranty expired' };
  }
  if (daysLeft <= EXPIRING_SOON_DAYS) {
    const label = daysLeft === 0 ? 'Expires today' : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
    return { state: 'expiring', expires, daysLeft, progress, label };
  }
  return { state: 'active', expires, daysLeft, progress, label: `${formatRemaining(daysLeft)} left` };
}

function formatRemaining(days: number): string {
  const months = Math.floor(days / 30.44);
  if (months >= 24) {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem ? `${years} yr ${rem} mo` : `${years} yr`;
  }
  if (months >= 1) return `${months} mo`;
  return `${days} days`;
}

export function warrantyLengthLabel(months: number | null): string {
  if (!months) return 'None';
  if (months % 12 === 0) return `${months / 12} year${months === 12 ? '' : 's'}`;
  return `${months} months`;
}
