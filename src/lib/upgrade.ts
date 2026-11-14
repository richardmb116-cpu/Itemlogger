import { addMonths, daysBetween, parseISODate, toISODate } from './dates';
import { profileFor, type LifecycleProfile, type TimingTip } from './lifecycle';
import { defaultChannel, netProceeds, WORTH_SELLING_MIN, type SaleChannel } from './selling';
import type { Item, TaxRegion, UpgradeStyle } from './types';
import { calibration, valueAt } from './valuation';

/**
 * When to sell and upgrade: the economics (see reports/Resale value and upgrade timing.md).
 *
 * Depreciation alone never justifies selling: an item's yearly loss in value shrinks as it ages,
 * so with nothing else counted, keeping it until it dies is cheapest. What makes an earlier sale
 * worthwhile is:
 *   - obsolescence u(t) = g·P·t: the growing gap to a new model (set by how much you value "the latest")
 *   - failure risk: Weibull hazard h(t), losing the resale value plus an emergency cost if it dies
 * against which selling costs fees and effort, and money has a time value (5% a year).
 *
 * For one ownership cycle sold at age T, the expected average yearly cost is
 *   A(T) = [ P + Σ S(t)·(u(t) + h(t)·c_f)·Δ·e^(−rt) − S(T)·N(T)·e^(−rT) ] / Σ S(t)·Δ·e^(−rt)
 * where N is net sale proceeds and S survival. The best plan for a replacement is T* = argmin A(T),
 * with best cost A*. For the item you own, keep it while next month's marginal cost
 *   m(t) = u(t) + r·N(t) − N′(t) + h(t)·(N(t) + c_f)
 * is below A*; sell when it rises above. Because A is flat near its minimum, the advice is a window
 * (ages within 5% of the best cost), priced in money.
 */

export type CostPoint = {
  /** Age in years. */
  age: number;
  /** Expected resale value at this age (before fees). */
  value: number;
  /** Average yearly cost of a cycle that sells at this age (null in the first months). */
  average: number | null;
  /** Yearly cost rate of keeping it at this age: value lost, obsolescence, failure risk. */
  marginal: number;
};

/**
 * early: keep it, the best time is ahead · window: a good time to sell · late: past the best time ·
 * use-up: selling won't fund much of an upgrade, so get full use out of it ·
 * market: price follows a market (gold, Rolex, Hermès), not age · no-resale: no real used market.
 */
export type SellStatus = 'early' | 'window' | 'late' | 'use-up' | 'market' | 'no-resale';

export type SellPlan = {
  profile: LifecycleProfile;
  status: SellStatus;
  points: CostPoint[];
  /** Best age to sell, in years, and when that is. */
  bestAge: number;
  bestDate: string;
  /** Expected sale price at the best time, and what you'd net after fees and effort. */
  bestValue: number;
  bestNet: number;
  /** Ages (and dates) where the yearly cost is within 5% of the best. */
  windowStartAge: number;
  windowEndAge: number;
  windowStartDate: string;
  windowEndDate: string;
  nowAge: number;
  nowValue: number;
  nowNet: number;
  /** What keeping it another 12 months from today is likely to cost (value, obsolescence, risk). */
  keepCostNextYear: number;
  /** Extra money over the cycle from selling a year early or a year late (null where not meaningful). */
  costYearEarly: number | null;
  costYearLate: number | null;
  /** Best average yearly cost of owning one of these. */
  bestYearlyCost: number;
  channel: SaleChannel;
  /** True when a price the user checked has been used to anchor the curve. */
  calibrated: boolean;
  tip: string | null;
};

const STYLE_MULT: Record<UpgradeStyle, number> = { value: 0, balanced: 1, latest: 2 };
const DISCOUNT = Math.log(1.05);
/** Emergency cost if it dies unexpectedly (rush purchase, downtime, lost data), as a share of price. An assumption. */
const FAILURE_PENALTY = 0.08;
const STEP = 1 / 12;
const MIN_HOLD = 12; // months
const TOLERANCE = 1.05;

export function sellPlan(item: Item, region: TaxRegion, style: UpgradeStyle = 'balanced', today = new Date()): SellPlan | null {
  if (item.price == null || item.price <= 0 || item.sold) return null;
  const P = item.price;
  const p = profileFor(item);
  const channel = defaultChannel(region, p.shippable);
  const purchase = parseISODate(item.purchaseDate);
  const nowMonths = Math.max(0, daysBetween(purchase, today) / 30.4375);
  const calibrated = !!item.checkedPrice && calibration(item) !== 1;
  const ownedValue = (m: number) => valueAt(item, m / 12, { calibrate: true });
  const freshValue = (m: number) => valueAt({ ...item, condition: 'good', checkedPrice: null }, m / 12);
  const tip = timingTip(p.tip, region);
  const nowValue = ownedValue(nowMonths);
  const nowNet = netProceeds(nowValue, channel);

  const base = {
    profile: p,
    channel,
    calibrated,
    tip,
    nowAge: nowMonths / 12,
    nowValue,
    nowNet,
  };

  if (p.noResale || p.market) {
    const months = Math.max(24, Math.ceil(nowMonths) + 24);
    const points = Array.from({ length: months + 1 }, (_, m) => ({ age: m / 12, value: ownedValue(m), average: null, marginal: 0 }));
    return {
      ...base,
      status: p.noResale ? 'no-resale' : 'market',
      points,
      bestAge: nowMonths / 12,
      bestDate: toISODate(today),
      bestValue: nowValue,
      bestNet: nowNet,
      windowStartAge: 0,
      windowEndAge: 0,
      windowStartDate: toISODate(today),
      windowEndDate: toISODate(today),
      keepCostNextYear: Math.max(0, nowValue - ownedValue(nowMonths + 12)),
      costYearEarly: null,
      costYearLate: null,
      bestYearlyCost: 0,
    };
  }

  const g = p.g * STYLE_MULT[style];
  const L = p.lifeYears;
  const eta = 1.1 * L;
  const survival = (t: number) => (p.beta > 0 ? Math.exp(-Math.pow(t / eta, p.beta)) : 1);
  const hazard = (t: number) => (p.beta > 0 ? (p.beta / eta) * Math.pow(Math.max(t, 1e-6) / eta, p.beta - 1) : 0);
  const cf = FAILURE_PENALTY * P;
  const horizon = Math.ceil(L * 12 * 1.6) + 12;

  // Average yearly cost of a fresh cycle, selling at each month T.
  const average: (number | null)[] = [];
  let num = P;
  let den = 0;
  for (let m = 0; m <= horizon; m++) {
    const t = m / 12;
    if (m > 0) {
      const prev = (m - 1) / 12;
      const w = survival(prev) * STEP * Math.exp(-DISCOUNT * prev);
      num += w * (g * P * prev + hazard(prev) * cf);
      den += w;
    }
    const salvage = survival(t) * netProceeds(freshValue(m), channel) * Math.exp(-DISCOUNT * t);
    average.push(m >= 6 && den > 0 ? (num - salvage) / den : null);
  }

  let best = MIN_HOLD;
  for (let m = MIN_HOLD; m <= horizon; m++) if ((average[m] ?? Infinity) < (average[best] ?? Infinity)) best = m;
  const bestCost = average[best]!;

  // Marginal yearly cost of keeping the item you own, month by month.
  const marginalAt = (m: number) => {
    const t = m / 12;
    const n = netProceeds(ownedValue(m), channel);
    // Value lost per year, over a six-month span so small steps (like a warranty ending) don't spike it.
    const loss = (netProceeds(ownedValue(Math.max(0, m - 3)), channel) - netProceeds(ownedValue(m + 3), channel)) / 0.5;
    return g * P * t + DISCOUNT * n + Math.max(0, loss) + hazard(t) * (n + cf);
  };
  const points: CostPoint[] = [];
  for (let m = 0; m <= horizon; m++) {
    points.push({ age: m / 12, value: ownedValue(m), average: average[m], marginal: marginalAt(m) });
  }

  // Owned item: after the early steep drop, sell when the marginal cost rises back above A*.
  let ownedBest = best;
  if (calibrated || item.condition !== 'good') {
    let dipped = false;
    ownedBest = -1;
    for (let m = 1; m <= horizon; m++) {
      if (!dipped && points[m].marginal < bestCost) dipped = true;
      else if (dipped && m >= MIN_HOLD && points[m].marginal >= bestCost) {
        ownedBest = m;
        break;
      }
    }
    if (ownedBest < 0) ownedBest = best;
  }

  // The window: ages around the best where a fresh cycle costs within 5% of the best.
  let lo = best;
  while (lo > MIN_HOLD && (average[lo - 1] ?? Infinity) <= bestCost * TOLERANCE) lo--;
  let hi = best;
  while (hi < horizon && (average[hi + 1] ?? Infinity) <= bestCost * TOLERANCE) hi++;
  const shift = ownedBest - best;
  const startM = Math.max(6, lo + shift);
  const endM = Math.max(startM + 1, hi + shift);

  const cycleCost = (m: number) => (average[m] != null ? (average[m]! - bestCost) * (m / 12) : null);
  const costYearEarly = best - 12 >= MIN_HOLD ? cycleCost(best - 12) : null;
  const costYearLate = best + 12 <= horizon ? cycleCost(best + 12) : null;
  // A flat curve means timing barely matters: a year either way costs under 1% of the price.
  const flat = Math.max(costYearEarly ?? 0, costYearLate ?? 0) < 0.01 * P;
  // Use it up when it's still getting cheaper per year past its typical life, when timing barely
  // matters, or when by the best time it wouldn't net enough to be worth the effort of selling.
  const useUp =
    best >= Math.round(L * 12 * 1.2) || flat || netProceeds(ownedValue(ownedBest), channel) < WORTH_SELLING_MIN;
  const sellAt = useUp ? Math.max(Math.round(L * 12), Math.ceil(nowMonths)) : ownedBest;
  const bestValue = ownedValue(sellAt);
  const bestNet = netProceeds(bestValue, channel);
  const status: SellStatus = useUp ? 'use-up' : nowMonths < startM ? 'early' : nowMonths <= endM ? 'window' : 'late';

  let keep = 0;
  for (let i = 0; i < 12; i++) keep += marginalAt(nowMonths + i) * STEP;

  return {
    ...base,
    status,
    points,
    bestAge: sellAt / 12,
    bestDate: toISODate(addMonths(purchase, sellAt)),
    bestValue,
    bestNet,
    windowStartAge: startM / 12,
    windowEndAge: endM / 12,
    windowStartDate: toISODate(addMonths(purchase, startM)),
    windowEndDate: toISODate(addMonths(purchase, endM)),
    keepCostNextYear: Math.max(0, keep),
    costYearEarly: useUp ? null : costYearEarly,
    costYearLate: useUp ? null : costYearLate,
    bestYearlyCost: bestCost,
  };
}

/** Timing tips where the study found evidence. Seasonal months flip for the southern hemisphere. */
export function timingTip(tip: TimingTip, region: TaxRegion): string | null {
  const au = region === 'AU';
  switch (tip) {
    case 'iphone':
      return 'List 2–4 weeks before Apple’s September event. Used prices drop 9–15% when new models are announced.';
    case 'galaxy':
      return 'New Galaxy S phones launch in January or February. List in December to beat the drop.';
    case 'pixel':
      return 'New Pixels usually launch in August. List in July.';
    case 'electronics':
      return 'Used prices dip when a successor launches, so sell before it ships. Battery health under 80% costs real money; a new battery can pay for itself.';
    case 'console':
      return 'Consoles hold value within their generation. Sell before the next one ships.';
    case 'camera':
      return 'Sell a body before its successor ships. Lenses have no timing effect.';
    case 'appliance':
      return 'New models arrive in September and October. Avoid listing during the new-model clearance sales.';
    case 'fridge':
      return 'New fridge models arrive in summer, and May is clearance month. List before then.';
    case 'bike':
      return au
        ? 'Bikes sell best from September to January. Off-season listings can sell for 25–40% less.'
        : 'Bikes sell best from March to July. Off-season listings can sell for 25–40% less.';
    case 'ski':
      return au ? 'Snow gear sells best from February to June, before the season.' : 'Snow gear sells best from August to December, before the season.';
    case 'golf':
      return au ? 'Golf gear sells best from August to November. New drivers knock old ones down each year.' : 'Golf gear sells best from February to May. New drivers knock old ones down each year.';
    case 'fitness':
      return 'Fitness equipment sells best in January.';
    case 'furniture':
      return au ? 'Furniture moves best in the December to February moving season.' : 'Furniture moves best in the summer moving season.';
    case 'luxury':
      return 'Prices follow the market, not the calendar. Classic bags are best sold just after a retail price rise.';
    default:
      return null;
  }
}

export function sellStatusLabel(plan: SellPlan): string {
  switch (plan.status) {
    case 'early':
      return 'Keep for now';
    case 'window':
      return 'Good time to sell';
    case 'late':
      return 'Past its best time to sell';
    case 'use-up':
      return plan.bestNet < WORTH_SELLING_MIN ? 'Use it until it’s done' : 'No rush to sell';
    case 'market':
      return 'Hold: priced by the market';
    default:
      return 'No real resale market';
  }
}

/**
 * Repair or replace? Repair if the quote is under about 50% of a replacement's price, tapering to
 * 30% as it reaches 80% of its useful life, and not if it's past its life (CR, ServiceMag, NerdWallet).
 */
export function repairAdvice(item: Item, quote: number, today = new Date()): { repair: boolean; threshold: number; reason: string } {
  const p = profileFor(item);
  const P = item.price ?? 0;
  const age = Math.max(0, daysBetween(parseISODate(item.purchaseDate), today) / 365.25);
  const share = Math.min(1, age / p.lifeYears / 0.8);
  const threshold = P * (0.5 - 0.2 * share);
  if (age >= p.lifeYears) {
    return { repair: false, threshold: 0, reason: 'It’s past its typical useful life, so money is better spent on a replacement.' };
  }
  const repair = quote <= threshold;
  return {
    repair,
    threshold,
    reason: repair
      ? 'The repair costs well under a replacement for an item with life left in it.'
      : 'For its age, the repair is too large a share of what a replacement costs.',
  };
}
