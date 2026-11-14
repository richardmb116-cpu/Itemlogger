import { categoryInfo } from './categories';
import { formatDate, formatMoney } from './format';
import type { Item, Settings, TaxRegion } from './types';
import { checkedAgo, conditionInfo, currentValue } from './valuation';
import { warrantyStatus } from './warranty';

export type Incident = {
  /** ISO date of the loss, if this pack is for a claim. */
  date: string | null;
  description: string;
};

export type ClaimOptions = {
  includePhotos: boolean;
  includeReceipts: boolean;
  incident: Incident | null;
};

/** Images ready to embed (data: URIs), keyed by item id. */
export type ClaimImages = Record<string, { photo?: string; receipt?: string }>;

export type ClaimSummary = {
  count: number;
  paid: number;
  current: number;
  withPhoto: number;
  withReceipt: number;
  withSerial: number;
  missingPrice: number;
  /** Plain-language gaps worth fixing before sending to an insurer. */
  warnings: string[];
};

export function summarize(items: Item[], today = new Date()): ClaimSummary {
  const s = {
    count: items.length,
    paid: 0,
    current: 0,
    withPhoto: 0,
    withReceipt: 0,
    withSerial: 0,
    missingPrice: 0,
  };
  for (const i of items) {
    s.paid += i.price ?? 0;
    s.current += currentValue(i, today)?.amount ?? 0;
    if (i.photoUri) s.withPhoto++;
    if (i.receiptUri) s.withReceipt++;
    if (i.serial) s.withSerial++;
    if (i.price == null) s.missingPrice++;
  }
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const warnings: string[] = [];
  const noReceipt = s.count - s.withReceipt;
  const noPhoto = s.count - s.withPhoto;
  const highValueNoSerial = items.filter((i) => !i.serial && (i.price ?? 0) >= 500).length;
  if (s.missingPrice) warnings.push(`${plural(s.missingPrice, 'item has', 'items have')} no purchase price.`);
  if (noReceipt) warnings.push(`${plural(noReceipt, 'item has', 'items have')} no receipt photo.`);
  if (noPhoto) warnings.push(`${plural(noPhoto, 'item has', 'items have')} no photo of the item.`);
  if (highValueNoSerial) warnings.push(`${plural(highValueNoSerial, 'item', 'items')} over $500 ${highValueNoSerial === 1 ? 'has' : 'have'} no serial number.`);
  return { ...s, warnings };
}

export type Coverage =
  | { state: 'unknown' }
  | { state: 'ok'; spare: number }
  | { state: 'under'; gap: number };

/**
 * Compare what the items cost against the contents sum insured. Purchase price stands in for
 * replacement cost, which is what most new-for-old contents policies pay.
 */
export function coverageCheck(totalPaid: number, sumInsured: number | null): Coverage {
  if (!sumInsured || sumInsured <= 0) return { state: 'unknown' };
  return totalPaid > sumInsured ? { state: 'under', gap: totalPaid - sumInsured } : { state: 'ok', spare: sumInsured - totalPaid };
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

/** Paper size in CSS points: A4 for Australia, US Letter for the US. */
export function paperFor(region: TaxRegion): { width: number; height: number; css: string } {
  return region === 'AU' ? { width: 595, height: 842, css: 'A4' } : { width: 612, height: 792, css: 'letter' };
}

export function buildClaimHtml(
  items: Item[],
  options: ClaimOptions,
  settings: Settings,
  images: ClaimImages,
  today = new Date(),
): string {
  const region = settings.taxRegion;
  const money = (n: number | null) => escapeHtml(formatMoney(n, region, { cents: false }));
  const date = (iso: string) => escapeHtml(formatDate(iso, region, 'long'));
  const e = escapeHtml;
  const sum = summarize(items, today);
  const ins = settings.insurance;
  const coverage = coverageCheck(sum.paid, ins.sumInsured);
  const todayIso = today.toISOString().slice(0, 10);
  const isClaim = !!options.incident && (!!options.incident.date || !!options.incident.description.trim());

  const policyRows = [
    ins.insurer && ['Insurer', e(ins.insurer)],
    ins.policyNumber && ['Policy number', e(ins.policyNumber)],
    ins.sumInsured && ['Contents sum insured', money(ins.sumInsured)],
  ].filter(Boolean) as [string, string][];

  const incidentHtml = isClaim
    ? `<section class="incident">
        <h2>Incident</h2>
        ${options.incident!.date ? `<p><b>Date of loss:</b> ${date(options.incident!.date)}</p>` : ''}
        ${options.incident!.description.trim() ? `<p>${e(options.incident!.description.trim()).replace(/\n/g, '<br>')}</p>` : ''}
      </section>`
    : '';

  const coverageHtml =
    coverage.state === 'under'
      ? `<p class="note warn">These items cost ${money(sum.paid)}, which is ${money(coverage.gap)} more than the contents sum insured.</p>`
      : coverage.state === 'ok'
        ? `<p class="note">These items cost ${money(sum.paid)}, within the contents sum insured of ${money(ins.sumInsured)}.</p>`
        : '';

  const itemHtml = items
    .map((item, idx) => {
      const cv = currentValue(item, today);
      const w = warrantyStatus(item, today);
      const img = images[item.id] ?? {};
      const valueNote = cv
        ? cv.source === 'checked'
          ? `owner checked real listings ${checkedAgo(cv.ageDays ?? 0)}`
          : 'estimate'
        : '';
      const rows: [string, string][] = [
        ['Make and model', e(item.model || '—')],
        ['Serial number', e(item.serial || '—')],
        ['Category', e(categoryInfo(item.category).label)],
        ['Purchased', `${date(item.purchaseDate)}${item.store ? `, ${e(item.store)}` : ''}`],
        ['Price paid', money(item.price)],
        ['Current value', cv ? `${money(cv.amount)} <span class="muted">(${e(valueNote)})</span>` : '—'],
        ['Condition', e(conditionInfo(item.condition).label)],
        [
          'Warranty',
          w.expires
            ? `${e(w.state === 'expired' ? 'Ended' : 'Until')} ${date(w.expires)}`
            : 'None recorded',
        ],
        ['Use', item.use === 'work' ? 'Work' : 'Personal'],
      ];
      if (item.notes.trim()) rows.push(['Notes', e(item.notes.trim()).replace(/\n/g, '<br>')]);

      const pics = [
        options.includePhotos && img.photo ? `<figure><img src="${img.photo}" alt=""><figcaption>Item</figcaption></figure>` : '',
        options.includeReceipts && img.receipt
          ? `<figure><img src="${img.receipt}" alt=""><figcaption>Receipt</figcaption></figure>`
          : '',
      ].join('');

      return `<article class="item">
        <h3><span class="num">${idx + 1}</span>${e(item.name)}</h3>
        <div class="body">
          <table class="facts">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>
          ${pics ? `<div class="pics">${pics}</div>` : ''}
        </div>
      </article>`;
    })
    .join('');

  const paper = paperFor(region);
  return `<!doctype html>
<html><head><meta charset="utf-8">
<title>${isClaim ? 'Insurance claim' : 'Contents inventory'}</title>
<style>
  @page { size: ${paper.css}; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1d1d1f; font-size: 10.5pt; line-height: 1.4; margin: 0; }
  h1 { font-size: 24pt; margin: 0 0 2pt; letter-spacing: -0.3pt; }
  h2 { font-size: 13pt; margin: 18pt 0 6pt; }
  h3 { font-size: 13pt; margin: 0 0 8pt; display: flex; align-items: baseline; gap: 8pt; }
  .num { font-size: 9pt; color: #6e6e73; font-weight: 600; min-width: 18pt; }
  .muted { color: #6e6e73; }
  .lead { color: #6e6e73; margin: 0 0 14pt; }
  .totals { display: flex; gap: 8pt; margin: 12pt 0; }
  .total { flex: 1; background: #f5f5f7; border-radius: 10pt; padding: 10pt 12pt; }
  .total b { display: block; font-size: 16pt; font-variant-numeric: tabular-nums; }
  .total span { font-size: 8.5pt; color: #6e6e73; text-transform: uppercase; letter-spacing: 0.4pt; }
  table { border-collapse: collapse; width: 100%; }
  .policy th, .facts th { text-align: left; font-weight: 500; color: #6e6e73; width: 38%; padding: 3pt 8pt 3pt 0; vertical-align: top; }
  .policy td, .facts td { padding: 3pt 0; border-bottom: 0.5pt solid #e5e5ea; vertical-align: top; }
  .note { background: #f5f5f7; border-radius: 8pt; padding: 8pt 10pt; }
  .warn { background: #fff0dc; color: #8a4500; }
  .incident { border-left: 3pt solid #0071e3; padding-left: 10pt; }
  .index td, .index th { padding: 4pt 6pt 4pt 0; border-bottom: 0.5pt solid #e5e5ea; text-align: left; font-variant-numeric: tabular-nums; }
  .index th { font-size: 8.5pt; color: #6e6e73; text-transform: uppercase; letter-spacing: 0.4pt; font-weight: 600; }
  .index .r { text-align: right; }
  .items { page-break-before: always; }
  .item { page-break-inside: avoid; break-inside: avoid; border: 0.5pt solid #d2d2d7; border-radius: 12pt; padding: 12pt 14pt; margin: 0 0 12pt; }
  .body { display: flex; gap: 14pt; align-items: flex-start; }
  .body .facts { flex: 1; }
  .pics { width: 36%; display: flex; flex-direction: column; gap: 6pt; }
  figure { margin: 0; }
  figure img { width: 100%; height: 118pt; object-fit: contain; background: #f5f5f7; border-radius: 8pt; display: block; }
  figcaption { font-size: 8.5pt; color: #6e6e73; margin-top: 3pt; }
  footer { margin-top: 18pt; font-size: 8.5pt; color: #6e6e73; }
</style></head>
<body>
  <header>
    <h1>${isClaim ? 'Insurance claim' : 'Contents inventory'}</h1>
    <p class="lead">${sum.count} item${sum.count === 1 ? '' : 's'} · prepared ${date(todayIso)}</p>
  </header>

  ${policyRows.length ? `<table class="policy">${policyRows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>` : ''}
  ${incidentHtml}

  <div class="totals">
    <div class="total"><span>Price paid</span><b>${money(sum.paid)}</b></div>
    <div class="total"><span>Current value</span><b>${money(sum.current)}</b></div>
    <div class="total"><span>With receipts</span><b>${sum.withReceipt} of ${sum.count}</b></div>
  </div>
  ${coverageHtml}

  <h2>Items</h2>
  <table class="index">
    <tr><th>#</th><th>Item</th><th>Serial</th><th>Purchased</th><th class="r">Paid</th></tr>
    ${items
      .map(
        (i, idx) =>
          `<tr><td>${idx + 1}</td><td>${e(i.name)}</td><td>${e(i.serial || '—')}</td><td>${e(formatDate(i.purchaseDate, region))}</td><td class="r">${money(i.price)}</td></tr>`,
      )
      .join('')}
  </table>

  <section class="items">${itemHtml}</section>

  <footer>
    Prepared with Keep Track from the owner's own records. Prices paid are as recorded by the owner; current values are
    estimates from typical resale prices unless marked as checked against real listings.
  </footer>
</body></html>`;
}
