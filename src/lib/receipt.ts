import { toISODate } from './dates';
import type { Category, Item, TaxRegion } from './types';

/** One product line read off a receipt. Quantity lines (2 × lamp) are split into one line per unit. */
export type ReceiptLine = {
  key: string;
  name: string;
  model: string;
  /** Price paid for ONE unit, after any line discount, before sales tax. */
  price: number | null;
  category: Category;
  /** Worth tracking (a lamp, a drill), as opposed to groceries, fees, bags or gift cards. */
  durable: boolean;
};

export type ReceiptScan = {
  store: string;
  /** yyyy-mm-dd, or null when the receipt has no readable date. */
  date: string | null;
  lines: ReceiptLine[];
  /** The receipt's grand total, if printed, for a sanity check against the lines. */
  total: number | null;
};

const CATEGORIES: Category[] = ['electronics', 'appliances', 'furniture', 'tools', 'kitchen', 'jewellery', 'sports', 'clothing', 'other'];
/** Never split a single line into more than this many items (a "100 × screws" line is not 100 things). */
const MAX_SPLIT = 10;

/** What we ask Claude for. Kept here so the prompt and the checks below stay in step. */
export function receiptPrompt(region: TaxRegion, today = new Date()): string {
  return [
    'This photo is a shopping receipt, invoice or order confirmation. Read it and list what was bought,',
    'so each product can be added to a home inventory (warranties, resale value, insurance).',
    '',
    'Reply with only this JSON, no other text:',
    '{"store": string|null, "date": "YYYY-MM-DD"|null, "total": number|null, "items": [',
    '  {"name": string, "model": string, "quantity": integer, "unitPrice": number|null, "category": string, "durable": boolean}',
    ']}',
    '',
    'Rules:',
    '- One entry per product line. quantity is how many of that product; unitPrice is the price of ONE,',
    '  after any discount on that line and before sales tax / GST.',
    '- name: a short, clear product name a person would recognise. Expand receipt abbreviations',
    '  ("SMSNG 65 QLED TV" → "Samsung 65\\" QLED TV", "DW V15 DTCT" → "Dyson V15 Detect").',
    '- model: brand and model number if you can tell them (e.g. "Samsung QN65Q80C"), else "".',
    `- category: one of ${CATEGORIES.join(', ')}.`,
    '- durable: true for things worth tracking (electronics, appliances, furniture, tools, jewellery,',
    '  sports gear, kitchen gear, clothing or shoes over about $40); false for food, groceries, cleaning',
    '  supplies, batteries, cables under $15, gift cards, services, delivery, warranties sold separately and bags.',
    '- Leave out subtotal, tax, GST, tips, payment, change, loyalty and rounding lines entirely.',
    `- date: the purchase date. Today is ${toISODate(today)}; receipts are never in the future.`,
    `- Prices are in ${region === 'AU' ? 'Australian' : 'US'} dollars unless the receipt clearly says otherwise.`,
    '- If the photo is not a receipt or is unreadable, reply {"store": null, "date": null, "total": null, "items": []}.',
  ].join('\n');
}

function str(v: unknown, max = 120): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function money(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[^0-9.-]/g, '')) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function isoDate(v: unknown, today: Date): string | null {
  const s = str(v, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime()) || d > today || d.getFullYear() < 1990) return null;
  return s;
}

/** Check and tidy whatever came back: nothing from the model is trusted as-is. */
export function normalizeScan(raw: unknown, today = new Date()): ReceiptScan {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items : [];
  const lines: ReceiptLine[] = [];
  items.slice(0, 60).forEach((entry, i) => {
    const e = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const name = str(e.name);
    if (!name) return;
    const qty = Math.min(MAX_SPLIT, Math.max(1, Math.round(Number(e.quantity) || 1)));
    const category = CATEGORIES.includes(e.category as Category) ? (e.category as Category) : 'other';
    for (let n = 0; n < qty; n++) {
      lines.push({
        key: `${i}-${n}`,
        name,
        model: str(e.model),
        price: money(e.unitPrice),
        category,
        durable: e.durable !== false,
      });
    }
  });
  return { store: str(r.store, 60), date: isoDate(r.date, today), total: money(r.total), lines };
}

/** A usual maker's warranty to start from; the person can change it on the item. */
function defaultWarranty(category: Category): number | null {
  return category === 'electronics' || category === 'appliances' || category === 'tools' || category === 'kitchen' ? 12 : null;
}

/** Turn the lines the person ticked into new items, all sharing the receipt photo. */
export function itemsFromScan(
  scan: ReceiptScan,
  selected: Set<string>,
  opts: { receiptUri: string | null; newId: () => string; today?: Date },
): Item[] {
  const now = new Date().toISOString();
  const date = scan.date ?? toISODate(opts.today ?? new Date());
  return scan.lines
    .filter((l) => selected.has(l.key))
    .map((l) => ({
      id: opts.newId(),
      name: l.name,
      model: l.model,
      category: l.category,
      price: l.price,
      purchaseDate: date,
      store: scan.store,
      serial: '',
      warrantyMonths: defaultWarranty(l.category),
      use: 'personal',
      workPercent: 100,
      effectiveLifeYears: null,
      condition: 'like-new',
      checkedPrice: null,
      sold: null,
      notes: '',
      photoUri: null,
      receiptUri: opts.receiptUri,
      createdAt: now,
      updatedAt: now,
    }));
}

/** The lines ticked by default: things worth tracking. */
export function defaultSelection(scan: ReceiptScan): Set<string> {
  return new Set(scan.lines.filter((l) => l.durable).map((l) => l.key));
}

/** Whether the lines add up to roughly the receipt total (sales tax makes the total a little higher). */
export function totalCheck(scan: ReceiptScan): 'matches' | 'missing-lines' | 'unknown' {
  if (scan.total == null || scan.lines.some((l) => l.price == null)) return 'unknown';
  const sum = scan.lines.reduce((s, l) => s + (l.price ?? 0), 0);
  // Lines plus up to ~15% tax should reach the total; well short means lines were missed.
  return sum >= scan.total / 1.16 - 1 ? 'matches' : 'missing-lines';
}

