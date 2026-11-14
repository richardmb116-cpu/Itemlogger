import { addMonths, daysBetween, parseISODate, toISODate } from './dates';
import { profileFor, type LifecycleProfile } from './lifecycle';
import type { Item, TaxRegion } from './types';
import { calibration, valueAt } from './valuation';

/**
 * When to sell to upgrade.
 *
 * Owning something costs you the value it loses. Two numbers, month by month of ownership:
 *  - average yearly cost so far:   (price paid − what it would sell for) ÷ years owned
 *  - cost of keeping it a year more: what it will lose over the next 12 months
 * Early on, next year's loss is smaller than your average, so keeping it is cheap. As it nears
 * the end of its useful life, value starts falling off a cliff and next year's loss climbs.
 * Where next year's loss overtakes the average is the best time to sell and put the money
 * toward the next one: sell later and every extra year costs more than a typical year did.
 */

export type CostPoint = {
  /** Age in years. */
  age: number;
  /** Expected resale value at this age. */
  value: number;
  /** Average yearly cost of ownership if sold at this age (null in the first months). */
  average: number | null;
  /** Value it would lose over the following 12 months. */
  nextYear: number;
};

/**
 * early: keep it, the best time is ahead · window: a good time to sell · late: past the best time ·
 * use-up: selling won't fund much of an upgrade, so get full use out of it.
 */
export type SellStatus = 'early' | 'window' | 'late' | 'use-up';

export type SellPlan = {
  profile: LifecycleProfile;
  points: CostPoint[];
  /** Best age to sell, in years, and when that is. */
  bestAge: number;
  bestDate: string;
  bestValue: number;
  /** A six-months-either-side window around the best time. */
  windowStartAge: number;
  windowEndAge: number;
  windowStartDate: string;
  windowEndDate: string;
  nowAge: number;
  nowValue: number;
  status: SellStatus;
  /** What keeping it another 12 months from today is likely to cost. */
  keepCostNextYear: number;
  /** True when a price the user checked has been used to anchor the curve. */
  calibrated: boolean;
  /** A timing tip for this kind of item, where there's evidence for one. */
  tip: string | null;
};

const MIN_HOLD_MONTHS = 12;
const WINDOW_MONTHS = 6;
/** Below this share of the price paid at the best time, selling won't fund much of an upgrade. */
const USE_UP_SHARE = 0.12;

export function sellPlan(item: Item, region: TaxRegion, today = new Date()): SellPlan | null {
  if (item.price == null || item.price <= 0 || item.sold) return null;
  const price = item.price;
  const profile = profileFor(item);
  const calibrated = !!item.checkedPrice && calibration(item) !== 1;
  const v = (months: number) => valueAt(item, months / 12, { calibrate: true });

  const horizon = Math.ceil(profile.lifeYears * 12 * 1.25) + 12;
  const points: CostPoint[] = [];
  for (let m = 0; m <= horizon; m++) {
    const value = v(m);
    points.push({
      age: m / 12,
      value,
      average: m >= 6 ? (price - value) / (m / 12) : null,
      nextYear: value - v(m + 12),
    });
  }

  // The crossing: the first month (after a minimum hold) where next year's loss reaches the average.
  let best = -1;
  for (let m = MIN_HOLD_MONTHS; m < points.length; m++) {
    const p = points[m];
    if (p.average != null && p.nextYear >= p.average) {
      best = m;
      break;
    }
  }
  // No crossing, or the crossing comes when it's worth very little: most of the value is already
  // gone, so the cheapest plan is to use it until it's done.
  const useUp = best < 0 || points[best].value < price * USE_UP_SHARE;
  if (useUp) best = Math.round(profile.lifeYears * 12);

  const purchase = parseISODate(item.purchaseDate);
  const nowMonths = Math.max(0, daysBetween(purchase, today) / 30.4375);
  const startM = Math.max(MIN_HOLD_MONTHS - WINDOW_MONTHS, best - WINDOW_MONTHS);
  const endM = best + WINDOW_MONTHS;
  const status: SellStatus = useUp ? 'use-up' : nowMonths < startM ? 'early' : nowMonths <= endM ? 'window' : 'late';
  const nowValue = v(nowMonths);

  return {
    profile,
    points,
    bestAge: best / 12,
    bestDate: toISODate(addMonths(purchase, best)),
    bestValue: points[best].value,
    windowStartAge: startM / 12,
    windowEndAge: endM / 12,
    windowStartDate: toISODate(addMonths(purchase, startM)),
    windowEndDate: toISODate(addMonths(purchase, endM)),
    nowAge: nowMonths / 12,
    nowValue,
    status,
    keepCostNextYear: Math.max(0, nowValue - v(nowMonths + 12)),
    calibrated,
    tip: timingTip(item, profile, region),
  };
}

function timingTip(item: Item, profile: LifecycleProfile, region: TaxRegion): string | null {
  const text = `${item.name} ${item.model}`;
  if (/iphone|apple watch/i.test(text)) {
    return 'New iPhones and Apple Watches usually launch in September and used prices dip soon after, so list in August.';
  }
  if (item.category === 'electronics') {
    return 'Used prices dip when a new model launches. If a successor is announced, sell before it ships.';
  }
  if (profile.lifeBasis === 'Bike' || item.category === 'sports') {
    return region === 'US'
      ? 'Bikes and outdoor gear tend to sell best in late summer and early autumn.'
      : 'Bikes and outdoor gear tend to sell best toward the end of the riding season.';
  }
  return null;
}

export function sellStatusLabel(plan: SellPlan): string {
  if (plan.status === 'early') return 'Keep for now';
  if (plan.status === 'window') return 'Good time to sell';
  if (plan.status === 'use-up') return 'Use it until it’s done';
  return 'Past its best time to sell';
}
