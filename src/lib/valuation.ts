import { daysBetween, parseISODate } from './dates';
import type { Category, Condition, Item } from './types';
import { warrantyStatus } from './warranty';

import { CURVES, fractionAt, profileFor } from './lifecycle';

export { CURVES } from './lifecycle';

export const CONDITIONS: { id: Condition; label: string; factor: number; listing: string }[] = [
  { id: 'like-new', label: 'Like new', factor: 1.1, listing: 'In like-new condition, barely used.' },
  { id: 'good', label: 'Good', factor: 1, listing: 'In good condition with normal signs of use.' },
  { id: 'fair', label: 'Fair', factor: 0.8, listing: 'In fair condition: works well, with visible wear.' },
  { id: 'worn', label: 'Worn', factor: 0.6, listing: 'Well used, with plenty of wear, but still works.' },
];

export function conditionInfo(id: Condition) {
  return CONDITIONS.find((c) => c.id === id) ?? CONDITIONS[1];
}

/** Buyers pay a little more when the warranty still has time to run. */
export const WARRANTY_BONUS = 0.05;

/** The warranty premium at a given age: full with a year or more left, fading to nothing as it runs out. */
export function warrantyBonusAt(item: Pick<Item, 'warrantyMonths'>, years: number): number {
  if (!item.warrantyMonths) return 0;
  const remaining = item.warrantyMonths / 12 - years;
  return WARRANTY_BONUS * Math.min(1, Math.max(0, remaining));
}

export type Valuation = {
  /** Most likely second-hand price today. */
  estimate: number;
  low: number;
  high: number;
  /** What it lost since purchase, in money and as a share of the price paid. */
  lost: number;
  lostShare: number;
  /** Likely price a year from now, to show the cost of waiting. */
  inAYear: number;
  ageYears: number;
  warrantyBonus: boolean;
};

/** The basic category curve (no useful-life cliff or brand effect). Kept for reference and tests. */
export function curveAt(category: Category, years: number): number {
  const curve = CURVES[category];
  const share = (1 - curve.firstDrop) * Math.pow(1 - curve.perYear, Math.max(0, years));
  return Math.max(curve.floor, share);
}

type ValueItem = Pick<Item, 'name' | 'model' | 'price' | 'purchaseDate' | 'category' | 'condition' | 'warrantyMonths'>;

/**
 * How far a price the user checked sits from the model, as a multiplier on the whole curve.
 * 1 when there's no checked price. Clamped so one odd listing can't distort everything.
 */
export function calibration(item: ValueItem & Pick<Item, 'checkedPrice'>): number {
  if (!item.checkedPrice || !item.price) return 1;
  const ageAtCheck = Math.max(0, daysBetween(parseISODate(item.purchaseDate), parseISODate(item.checkedPrice.checkedAt)) / 365.25);
  // Compare like with like: the uncalibrated model at the age it was checked.
  const modelled = valueAt(item, ageAtCheck);
  if (modelled <= 0) return 1;
  return Math.min(2.5, Math.max(0.3, item.checkedPrice.amount / modelled));
}

/** Expected resale value at a given age in years (unrounded), optionally calibrated to a checked price. */
export function valueAt(
  item: ValueItem & Partial<Pick<Item, 'checkedPrice'>>,
  years: number,
  opts: { calibrate?: boolean } = {},
): number {
  if (item.price == null || item.price <= 0) return 0;
  const k = opts.calibrate && item.checkedPrice ? calibration({ ...item, checkedPrice: item.checkedPrice }) : 1;
  const raw =
    item.price * fractionAt(profileFor(item), years) * conditionInfo(item.condition).factor * (1 + warrantyBonusAt(item, years)) * k;
  return Math.min(item.price, raw);
}

/** Round to amounts people actually ask for: $5 steps under $200, $10 under $1,000, then $50. */
export function roundPrice(value: number): number {
  const step = value < 200 ? 5 : value < 1000 ? 10 : 50;
  return Math.max(step, Math.round(value / step) * step);
}

export function valueItem(item: ValueItem, today = new Date()): Valuation | null {
  if (item.price == null || item.price <= 0) return null;
  const ageYears = Math.max(0, daysBetween(parseISODate(item.purchaseDate), today) / 365.25);
  const warranty = warrantyStatus(item, today);
  const warrantyBonus = warranty.state === 'active' || warranty.state === 'expiring';
  const p = profileFor(item);
  const factor = conditionInfo(item.condition).factor * (1 + warrantyBonusAt(item, ageYears));

  // Never estimate more than the price paid, however good the condition.
  const raw = Math.min(item.price, item.price * fractionAt(p, ageYears) * factor);
  const estimate = roundPrice(raw);
  const inAYear = roundPrice(valueAt(item, ageYears + 1));
  const lost = Math.max(0, item.price - estimate);

  return {
    estimate,
    low: roundPrice(raw * 0.85),
    high: roundPrice(Math.min(item.price, raw * 1.15)),
    lost,
    lostShare: lost / item.price,
    inAYear: Math.min(inAYear, estimate),
    ageYears,
    warrantyBonus,
  };
}

/** A starting asking price: the top of the likely range, leaving room to negotiate. */
export function suggestedAskingPrice(v: Valuation): number {
  return v.high;
}

export function formatAge(years: number): string {
  const months = Math.floor(years * 12 + 1e-9);
  if (months < 1) return 'Under a month';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} yr ${m} mo` : `${y} year${y === 1 ? '' : 's'}`;
}

/** A price you checked yourself counts as stale after this many days. */
export const CHECKED_PRICE_STALE_DAYS = 90;

export type CurrentValue = {
  amount: number;
  /** "checked": the user's own price from real listings; "estimate": our resale curve. */
  source: 'checked' | 'estimate';
  /** For checked prices: days since it was checked. */
  ageDays: number | null;
  stale: boolean;
  /** The curve estimate, when there is one, for comparison. */
  valuation: Valuation | null;
};

/** What the item is worth now: the user's checked price if they have one, otherwise our estimate. */
export function currentValue(
  item: ValueItem & Pick<Item, 'checkedPrice'>,
  today = new Date(),
): CurrentValue | null {
  const valuation = valueItem(item, today);
  if (item.checkedPrice) {
    const ageDays = daysBetween(parseISODate(item.checkedPrice.checkedAt), today);
    return {
      amount: item.checkedPrice.amount,
      source: 'checked',
      ageDays,
      stale: ageDays > CHECKED_PRICE_STALE_DAYS,
      valuation,
    };
  }
  if (!valuation) return null;
  return { amount: valuation.estimate, source: 'estimate', ageDays: null, stale: false, valuation };
}

export function checkedAgo(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 31) return `${days} days ago`;
  const months = Math.round(days / 30.44);
  return months < 12 ? `${months} month${months === 1 ? '' : 's'} ago` : 'over a year ago';
}
