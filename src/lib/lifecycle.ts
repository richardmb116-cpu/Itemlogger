import type { Category, Item } from './types';

/**
 * How second-hand value moves over an item's life, as a share of the price paid (good condition):
 *  - firstDrop: lost as soon as it's "used" (opened, out of the shop)
 *  - perYear:   further share lost each year while it's in its working prime (compounding)
 *  - floor:     a working used one rarely sells for less than this
 * then, as it nears the end of its useful life, buyers pay less and less (the "cliff").
 * Rules of thumb from resale marketplaces; a price the user checks recalibrates them per item.
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

/** Typical years of useful life, matched on the item's name and model first. */
const LIFE_HINTS: { pattern: RegExp; label: string; years: number }[] = [
  { pattern: /iphone|pixel|galaxy s|\bphone\b/i, label: 'Phone', years: 4 },
  { pattern: /apple watch|smart ?watch|galaxy watch/i, label: 'Smartwatch', years: 4 },
  { pattern: /airpods|earbuds|headphone|wh-1000|\bxm\d|bose qc/i, label: 'Headphones', years: 4 },
  { pattern: /laptop|macbook|notebook|chromebook|surface/i, label: 'Laptop', years: 5 },
  { pattern: /ipad|tablet/i, label: 'Tablet', years: 5 },
  { pattern: /playstation|xbox|nintendo|switch|console/i, label: 'Games console', years: 7 },
  { pattern: /\btv\b|television|monitor|display/i, label: 'Screen', years: 8 },
  { pattern: /camera|lens|mirrorless|dslr/i, label: 'Camera', years: 8 },
  { pattern: /vacuum|dyson v\d/i, label: 'Vacuum', years: 8 },
  { pattern: /espresso|coffee|barista|nespresso/i, label: 'Coffee machine', years: 8 },
  { pattern: /fridge|refrigerator|freezer/i, label: 'Fridge', years: 13 },
  { pattern: /washer|washing machine|dryer|dishwasher/i, label: 'Washer or dishwasher', years: 11 },
  { pattern: /microwave|air fryer|toaster|blender/i, label: 'Small appliance', years: 7 },
  { pattern: /chair|aeron/i, label: 'Chair', years: 12 },
  { pattern: /sofa|couch/i, label: 'Sofa', years: 10 },
  { pattern: /desk|table|bed|dresser|bookcase|cabinet/i, label: 'Furniture', years: 15 },
  { pattern: /drill|saw|driver|grinder|sander/i, label: 'Power tool', years: 10 },
  { pattern: /bike|bicycle/i, label: 'Bike', years: 10 },
];

const CATEGORY_LIFE: Record<Category, number> = {
  electronics: 5,
  appliances: 10,
  furniture: 15,
  tools: 10,
  kitchen: 8,
  jewellery: 40,
  sports: 8,
  clothing: 3,
  other: 7,
};

/** Brands whose used prices are known to hold up better than average (product names map to the brand). */
const STRONG_RESALE: { pattern: RegExp; brand: string }[] = [
  { pattern: /\b(apple|iphone|ipad|macbook|imac|airpods|apple watch)\b/i, brand: 'Apple' },
  { pattern: /\b(herman miller|aeron|embody)\b/i, brand: 'Herman Miller' },
  { pattern: /\bsteelcase\b/i, brand: 'Steelcase' },
  { pattern: /\bdyson\b/i, brand: 'Dyson' },
  { pattern: /\bmakita\b/i, brand: 'Makita' },
  { pattern: /\bmilwaukee\b/i, brand: 'Milwaukee' },
  { pattern: /\bdewalt\b/i, brand: 'DeWalt' },
  { pattern: /\bfestool\b/i, brand: 'Festool' },
  { pattern: /\bsony\b/i, brand: 'Sony' },
  { pattern: /\bbose\b/i, brand: 'Bose' },
  { pattern: /\b(nintendo|switch)\b/i, brand: 'Nintendo' },
  { pattern: /\bleica\b/i, brand: 'Leica' },
  { pattern: /\bcanon\b/i, brand: 'Canon' },
  { pattern: /\bnikon\b/i, brand: 'Nikon' },
  { pattern: /\bfujifilm\b/i, brand: 'Fujifilm' },
  { pattern: /\ble creuset\b/i, brand: 'Le Creuset' },
  { pattern: /\bkitchenaid\b/i, brand: 'KitchenAid' },
  { pattern: /\bbreville\b/i, brand: 'Breville' },
  { pattern: /\brolex\b/i, brand: 'Rolex' },
  { pattern: /\bomega\b/i, brand: 'Omega' },
  { pattern: /\bpatagonia\b/i, brand: 'Patagonia' },
  { pattern: /\btrek\b/i, brand: 'Trek' },
  { pattern: /\bspecialized\b/i, brand: 'Specialized' },
];

/** End-of-life cliff: value starts falling away at 60% of useful life and settles at 15% of its working value. */
export const END_OF_LIFE = { startShare: 0.6, residual: 0.15 };

export type LifecycleProfile = {
  firstDrop: number;
  perYear: number;
  floor: number;
  lifeYears: number;
  lifeBasis: string;
  /** The strong-resale brand matched, if any. */
  brand: string | null;
  note: string;
};

type ProfileItem = Pick<Item, 'name' | 'model' | 'category'>;

export function usefulLife(item: ProfileItem): { years: number; basis: string } {
  const text = `${item.name} ${item.model}`;
  const hint = LIFE_HINTS.find((h) => h.pattern.test(text));
  return hint ? { years: hint.years, basis: hint.label } : { years: CATEGORY_LIFE[item.category], basis: 'Category typical' };
}

export function resaleBrand(item: ProfileItem): string | null {
  const text = `${item.name} ${item.model}`;
  return STRONG_RESALE.find((b) => b.pattern.test(text))?.brand ?? null;
}

export function profileFor(item: ProfileItem): LifecycleProfile {
  const base = CURVES[item.category];
  const life = usefulLife(item);
  const brand = resaleBrand(item);
  return {
    // Strong brands lose less up front and more slowly after.
    firstDrop: brand ? base.firstDrop * 0.85 : base.firstDrop,
    perYear: brand ? base.perYear * 0.75 : base.perYear,
    floor: base.floor,
    lifeYears: life.years,
    lifeBasis: life.basis,
    brand,
    note: base.note,
  };
}

/** Share of the price paid an item fetches at a given age, in good condition. */
export function fractionAt(p: LifecycleProfile, years: number): number {
  const y = Math.max(0, years);
  const working = Math.max(p.floor, (1 - p.firstDrop) * Math.pow(1 - p.perYear, y));
  const start = END_OF_LIFE.startShare * p.lifeYears;
  const x = Math.min(1, Math.max(0, (y - start) / (p.lifeYears - start)));
  const cliff = x * x * (3 - 2 * x); // smooth step from 0 to 1
  return working * (1 - cliff * (1 - END_OF_LIFE.residual));
}
