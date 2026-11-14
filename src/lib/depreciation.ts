import { daysBetween, parseISODate } from './dates';
import { taxYearFor } from './tax';
import type { Category, DepreciationSettings, Item, TaxRegion } from './types';

/**
 * Tax depreciation for work items. A record-keeping aid using the common rules; it is not tax
 * advice, and the user's accountant has the final say.
 *
 * Australia (ATO, individuals):
 *  - cost of $300 or less: claimed in full in the year of purchase
 *  - optional low-value pool for items under $1,000: 18.75% in year one, then 37.5% a year
 *  - otherwise decline in value over the effective life, by diminishing value (2 ÷ life) or
 *    prime cost (1 ÷ life), with year one cut back to the days held before 30 June
 *
 * United States (business use):
 *  - Section 179: the whole business share in the year placed in service (needs over 50% business use)
 *  - MACRS: 200% declining balance, half-year convention, 5-year class for computers and
 *    electronics, 7-year for furniture, tools and most other equipment
 */

export const AU_IMMEDIATE_LIMIT = 300;
export const AU_POOL_LIMIT = 1000;
export const AU_POOL_FIRST_YEAR = 0.1875;
export const AU_POOL_RATE = 0.375;

/** IRS MACRS percentage tables, half-year convention (Pub 946, Table A-1). */
export const MACRS_TABLES: Record<5 | 7, number[]> = {
  5: [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576],
  7: [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446],
};

/** Everyday clothing and jewellery generally can't be depreciated as work items. */
const NOT_DEPRECIABLE: Category[] = ['clothing', 'jewellery'];

/** Suggested effective lives, from the item name first, then its category. Check the ATO table. */
const LIFE_HINTS: { pattern: RegExp; label: string; years: number }[] = [
  { pattern: /laptop|macbook|notebook|chromebook|ipad|tablet|surface/i, label: 'Laptop or tablet', years: 2 },
  { pattern: /phone|iphone|pixel|galaxy s/i, label: 'Mobile phone', years: 3 },
  { pattern: /monitor|display|screen/i, label: 'Monitor', years: 4 },
  { pattern: /desktop|imac|mac mini|mac studio|\bpc\b/i, label: 'Desktop computer', years: 4 },
  { pattern: /printer|scanner/i, label: 'Printer or scanner', years: 5 },
  { pattern: /camera|lens/i, label: 'Camera', years: 3 },
  { pattern: /chair/i, label: 'Office chair', years: 10 },
  { pattern: /desk|table|bookcase|cabinet|shelv/i, label: 'Office furniture', years: 20 },
];

const CATEGORY_LIFE: Record<Category, number> = {
  electronics: 3,
  appliances: 7,
  furniture: 10,
  tools: 5,
  kitchen: 6,
  sports: 5,
  clothing: 2,
  jewellery: 10,
  other: 5,
};

export function suggestedLife(item: Pick<Item, 'name' | 'model' | 'category'>): { years: number; basis: string } {
  const text = `${item.name} ${item.model}`;
  const hint = LIFE_HINTS.find((h) => h.pattern.test(text));
  if (hint) return { years: hint.years, basis: hint.label };
  return { years: CATEGORY_LIFE[item.category], basis: 'Category default' };
}

export function macrsClass(category: Category): 5 | 7 {
  return category === 'electronics' || category === 'appliances' ? 5 : 7;
}

export type ScheduleYear = {
  /** The year the tax year ends in (AU FY 2025–26 → 2026; US 2025 → 2025). */
  endYear: number;
  /** Decline in value of the whole item this year. */
  decline: number;
  /** The claimable work share of it. */
  deduction: number;
  /** Value left at the end of the year (written-down value / adjusted basis). */
  closing: number;
};

export type Schedule = {
  eligible: boolean;
  /** Why not eligible, or a caveat the user should see. */
  note: string | null;
  method: string;
  /** Plain-language description, e.g. "Diminishing value over 2 years". */
  detail: string;
  years: ScheduleYear[];
  totalDeduction: number;
};

type DepItem = Pick<
  Item,
  'name' | 'model' | 'category' | 'price' | 'purchaseDate' | 'use' | 'workPercent' | 'effectiveLifeYears'
>;

const round2 = (n: number) => Math.round(n * 100) / 100;
const MAX_YEARS = 30;

function finish(method: string, detail: string, years: ScheduleYear[], note: string | null = null): Schedule {
  return {
    eligible: true,
    note,
    method,
    detail,
    years,
    totalDeduction: round2(years.reduce((s, y) => s + y.deduction, 0)),
  };
}

function ineligible(note: string): Schedule {
  return { eligible: false, note, method: '', detail: '', years: [], totalDeduction: 0 };
}

export function workShare(item: Pick<Item, 'use' | 'workPercent'>): number {
  if (item.use !== 'work') return 0;
  return Math.min(100, Math.max(0, item.workPercent)) / 100;
}

export function depreciationSchedule(item: DepItem, region: TaxRegion, settings: DepreciationSettings): Schedule {
  if (item.use !== 'work') return ineligible('Mark the item as used for work to see its tax deductions.');
  if (item.price == null || item.price <= 0) return ineligible('Add the price you paid to work out deductions.');
  if (NOT_DEPRECIABLE.includes(item.category)) {
    return ineligible('Everyday clothing and jewellery generally can’t be claimed as work equipment.');
  }
  const share = workShare(item);
  const cost = item.price;
  const firstYear = taxYearFor(item.purchaseDate, region).endYear;
  const claim = (decline: number) => round2(decline * share);

  if (region === 'US') {
    if (settings.usMethod === 'section179' && share > 0.5) {
      return finish(
        'Section 179',
        'Business share deducted in full in the first year',
        [{ endYear: firstYear, decline: cost, deduction: claim(cost), closing: 0 }],
        'For business or self-employed use. Employees generally can’t deduct work purchases.',
      );
    }
    const cls = macrsClass(item.category);
    let basis = cost;
    const years = MACRS_TABLES[cls].map((rate, i) => {
      const decline = round2(Math.min(basis, cost * rate));
      basis = round2(basis - decline);
      return { endYear: firstYear + i, decline, deduction: claim(decline), closing: basis };
    });
    const fallback =
      settings.usMethod === 'section179' ? ' Section 179 needs over 50% business use, so MACRS applies.' : '';
    return finish(
      'MACRS',
      `${cls}-year property, half-year convention`,
      years,
      `For business or self-employed use. Employees generally can’t deduct work purchases.${fallback}`,
    );
  }

  // Australia
  if (cost <= AU_IMMEDIATE_LIMIT) {
    return finish('Immediate deduction', `$${AU_IMMEDIATE_LIMIT} or less: claimed in full the year you bought it`, [
      { endYear: firstYear, decline: cost, deduction: claim(cost), closing: 0 },
    ]);
  }

  if (settings.auLowValuePool && cost < AU_POOL_LIMIT) {
    const years: ScheduleYear[] = [];
    let value = cost;
    for (let i = 0; i < MAX_YEARS && value >= 1; i++) {
      const decline = round2(value * (i === 0 ? AU_POOL_FIRST_YEAR : AU_POOL_RATE));
      value = round2(value - decline);
      years.push({ endYear: firstYear + i, decline, deduction: claim(decline), closing: value });
    }
    return finish('Low-value pool', '18.75% in the first year, then 37.5% a year', years);
  }

  const life = item.effectiveLifeYears ?? suggestedLife(item).years;
  const purchase = parseISODate(item.purchaseDate);
  const fyEnd = new Date(firstYear, 5, 30);
  const daysHeld = daysBetween(purchase, fyEnd) + 1;
  const firstFraction = Math.min(1, Math.max(0, daysHeld / 365));
  const years: ScheduleYear[] = [];
  let value = cost;

  if (settings.auMethod === 'prime') {
    const annual = cost / life;
    for (let i = 0; i < MAX_YEARS && value >= 0.01; i++) {
      const decline = round2(Math.min(value, annual * (i === 0 ? firstFraction : 1)));
      value = round2(value - decline);
      years.push({ endYear: firstYear + i, decline, deduction: claim(decline), closing: value });
    }
    return finish('Prime cost', `Over ${life} year${life === 1 ? '' : 's'}, ${round2(100 / life)}% of cost a year`, years);
  }

  const rate = 2 / life;
  for (let i = 0; i < MAX_YEARS && value >= 1; i++) {
    // Diminishing value never quite reaches zero; the schedule stops once the value left is under $1.
    const decline = round2(Math.min(value, value * rate * (i === 0 ? firstFraction : 1)));
    value = round2(value - decline);
    years.push({ endYear: firstYear + i, decline, deduction: claim(decline), closing: value });
  }
  return finish('Diminishing value', `Over ${life} year${life === 1 ? '' : 's'}, ${round2(rate * 100)}% of the value left each year`, years);
}

/** The deduction for one tax year. */
export function deductionFor(schedule: Schedule, endYear: number): number {
  return schedule.years.find((y) => y.endYear === endYear)?.deduction ?? 0;
}
