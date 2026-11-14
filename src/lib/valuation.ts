import { daysBetween, parseISODate } from './dates';
import type { Category, Condition, Item } from './types';
import { warrantyStatus } from './warranty';

/**
 * How second-hand prices typically fall for each kind of item, as a share of the price paid:
 *  - firstDrop: lost as soon as it's "used" (opened, out of the shop)
 *  - perYear:   further share lost each year after that (compounding)
 *  - floor:     a used one rarely sells for less than this, however old
 * Rough rules of thumb from resale marketplaces, not live prices.
 */
export const CURVES: Record<Category, { firstDrop: number; perYear: number; floor: number; note: string }> = {
  electronics: { firstDrop: 0.2, perYear: 0.22, floor: 0.08, note: 'Electronics lose value fast as new models come out' },
  appliances: { firstDrop: 0.2, perYear: 0.12, floor: 0.1, note: 'Appliances drop on purchase, then hold steady' },
  furniture: { firstDrop: 0.35, perYear: 0.08, floor: 0.15, note: 'Furniture drops a lot at first, then holds steady' },
  tools: { firstDrop: 0.2, perYear: 0.08, floor: 0.25, note: 'Good tools hold their value well' },
  kitchen: { firstDrop: 0.25, perYear: 0.12, floor: 0.1, note: 'Kitchen gear drops on purchase, then slowly' },
  jewellery: { firstDrop: 0.4, perYear: 0.02, floor: 0.4, note: 'Jewellery sells well below retail, then holds steady' },
  sports: { firstDrop: 0.25, perYear: 0.12, floor: 0.12, note: 'Sports gear loses value steadily with use' },
  clothing: { firstDrop: 0.55, perYear: 0.25, floor: 0.05, note: 'Clothing resells for a fraction of retail' },
  other: { firstDrop: 0.25, perYear: 0.15, floor: 0.1, note: 'A typical resale curve for household items' },
};

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

/** Value of one unit of purchase price after `years`, in good condition. */
export function curveAt(category: Category, years: number): number {
  const curve = CURVES[category];
  const share = (1 - curve.firstDrop) * Math.pow(1 - curve.perYear, Math.max(0, years));
  return Math.max(curve.floor, share);
}

/** Round to amounts people actually ask for: $5 steps under $200, $10 under $1,000, then $50. */
export function roundPrice(value: number): number {
  const step = value < 200 ? 5 : value < 1000 ? 10 : 50;
  return Math.max(step, Math.round(value / step) * step);
}

export function valueItem(
  item: Pick<Item, 'price' | 'purchaseDate' | 'category' | 'condition' | 'warrantyMonths'>,
  today = new Date(),
): Valuation | null {
  if (item.price == null || item.price <= 0) return null;
  const ageYears = Math.max(0, daysBetween(parseISODate(item.purchaseDate), today) / 365.25);
  const warranty = warrantyStatus(item, today);
  const warrantyBonus = warranty.state === 'active' || warranty.state === 'expiring';
  const factor = conditionInfo(item.condition).factor * (warrantyBonus ? 1 + WARRANTY_BONUS : 1);

  // Never estimate more than the price paid, however good the condition.
  const raw = Math.min(item.price, item.price * curveAt(item.category, ageYears) * factor);
  const estimate = roundPrice(raw);
  const inAYear = roundPrice(Math.min(item.price, item.price * curveAt(item.category, ageYears + 1) * conditionInfo(item.condition).factor));
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
