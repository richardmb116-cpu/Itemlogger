import { addMonths, daysBetween, parseISODate, toISODate } from './dates';
import { cardExtension } from './cards';
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
  /** Months added by a credit card's extended warranty (0 if none). */
  cardMonths: number;
  /** When the maker's own warranty ends, if a card extends it. */
  makerExpires: string | null;
};

/** Warranties ending within this many days are flagged as expiring. */
export const EXPIRING_SOON_DAYS = 60;

/**
 * Where the owner stands on warranty, including any year a credit card adds. A card's cover is the
 * owner's, not the item's: for anything a buyer gets (listings, resale value) pass `paidWith: null`.
 */
export function warrantyStatus(
  item: Pick<Item, 'purchaseDate' | 'warrantyMonths'> & { paidWith?: string | null },
  today = new Date(),
): WarrantyStatus {
  if (!item.warrantyMonths) {
    return { state: 'none', expires: null, daysLeft: null, progress: 0, label: 'No warranty', cardMonths: 0, makerExpires: null };
  }
  const start = parseISODate(item.purchaseDate);
  const cardMonths = cardExtension(item);
  const makerExpires = cardMonths ? toISODate(addMonths(start, item.warrantyMonths)) : null;
  const end = addMonths(start, item.warrantyMonths + cardMonths);
  const daysLeft = daysBetween(today, end);
  const total = Math.max(1, daysBetween(start, end));
  const progress = Math.min(1, Math.max(0, 1 - daysLeft / total));
  const expires = toISODate(end);

  if (daysLeft < 0) {
    return { state: 'expired', expires, daysLeft, progress: 1, label: 'Warranty expired', cardMonths, makerExpires };
  }
  if (daysLeft <= EXPIRING_SOON_DAYS) {
    const label = daysLeft === 0 ? 'Expires today' : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
    return { state: 'expiring', expires, daysLeft, progress, label, cardMonths, makerExpires };
  }
  return { state: 'active', expires, daysLeft, progress, label: `${formatRemaining(daysLeft)} left`, cardMonths, makerExpires };
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
