import { escapeHtml, paperFor } from './claim-pack';
import { deductionFor, depreciationSchedule, suggestedLife } from './depreciation';
import { formatDate, formatMoney } from './format';
import { taxYearByEnd, taxYearFor } from './tax';
import type { DepreciationSettings, Item, TaxRegion } from './types';

/** One line per work item for the accountant: the records, plus our estimate. */
export type AccountantRow = {
  item: Item;
  bought: string;
  cost: number | null;
  workPercent: number;
  method: string;
  /** Effective life used (Australia), or null. */
  lifeYears: number | null;
  /** Estimated deduction for the chosen year. */
  deduction: number;
  boughtThisYear: boolean;
  hasReceipt: boolean;
  note: string | null;
};

/**
 * Work items relevant to a tax year: anything bought for work in that year, plus older work items
 * still being depreciated in it.
 */
export function accountantRows(
  items: Item[],
  region: TaxRegion,
  settings: DepreciationSettings,
  endYear: number,
): AccountantRow[] {
  const rows: AccountantRow[] = [];
  for (const item of items) {
    if (item.use !== 'work') continue;
    const boughtThisYear = taxYearFor(item.purchaseDate, region).endYear === endYear;
    const schedule = depreciationSchedule(item, region, settings);
    const soldYear = item.sold ? taxYearFor(item.sold.date, region).endYear : null;
    const deduction = soldYear != null && endYear > soldYear ? 0 : deductionFor(schedule, endYear);
    if (!boughtThisYear && deduction <= 0) continue;
    rows.push({
      item,
      bought: item.purchaseDate,
      cost: item.price,
      workPercent: item.workPercent,
      method: schedule.eligible ? schedule.method : 'Not claimable',
      lifeYears:
        region === 'AU' && schedule.eligible && !['Immediate deduction', 'Low-value pool'].includes(schedule.method)
          ? (item.effectiveLifeYears ?? suggestedLife(item).years)
          : null,
      deduction,
      boughtThisYear,
      hasReceipt: !!item.receiptUri,
      note: schedule.eligible ? null : schedule.note,
    });
  }
  return rows.sort((a, b) => a.bought.localeCompare(b.bought));
}

function csvCell(value: string | number | null): string {
  if (value == null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A spreadsheet any accountant can open. Amounts are plain numbers, dates are ISO. */
export function toCsv(rows: AccountantRow[], region: TaxRegion, endYear: number): string {
  const year = taxYearByEnd(endYear, region).label;
  const header = [
    'Tax year',
    'Item',
    'Make and model',
    'Serial number',
    'Purchase date',
    'Store',
    'Cost',
    'Work use %',
    'Method',
    'Effective life (years)',
    'Estimated deduction',
    'Bought this year',
    'Receipt photo',
    'Notes',
  ];
  const lines = rows.map((r) =>
    [
      year,
      r.item.name,
      r.item.model,
      r.item.serial,
      r.bought,
      r.item.store,
      r.cost,
      r.workPercent,
      r.method,
      r.lifeYears,
      r.deduction.toFixed(2),
      r.boughtThisYear ? 'Yes' : 'No',
      r.hasReceipt ? 'Yes' : 'No',
      r.note ?? r.item.notes,
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.map(csvCell).join(','), ...lines].join('\n') + '\n';
}

/** A short PDF summary with each receipt attached. */
export function accountantHtml(
  rows: AccountantRow[],
  region: TaxRegion,
  endYear: number,
  receipts: Record<string, string | undefined>,
  today = new Date(),
): string {
  const e = escapeHtml;
  const money = (n: number | null, cents = false) => e(formatMoney(n, region, { cents }));
  const year = taxYearByEnd(endYear, region);
  const total = rows.reduce((s, r) => s + r.deduction, 0);
  const spend = rows.filter((r) => r.boughtThisYear).reduce((s, r) => s + (r.cost ?? 0), 0);
  const withReceipts = rows.filter((r) => r.hasReceipt).length;
  const paper = paperFor(region);

  const table = rows
    .map(
      (r) => `<tr>
        <td><b>${e(r.item.name)}</b>${r.item.model ? `<br><span class="muted">${e(r.item.model)}</span>` : ''}</td>
        <td>${e(formatDate(r.bought, region))}</td>
        <td class="r">${money(r.cost, true)}</td>
        <td class="r">${r.workPercent}%</td>
        <td>${e(r.method)}${r.lifeYears ? `<br><span class="muted">${r.lifeYears} yr life</span>` : ''}</td>
        <td class="r"><b>${money(r.deduction, true)}</b></td>
        <td>${r.hasReceipt ? 'Attached' : '<span class="warn">Missing</span>'}</td>
      </tr>`,
    )
    .join('');

  const receiptPages = rows
    .filter((r) => receipts[r.item.id])
    .map(
      (r) => `<figure class="receipt">
        <figcaption><b>${e(r.item.name)}</b> · ${e(formatDate(r.bought, region, 'long'))} · ${money(r.cost, true)}${
          r.item.store ? ` · ${e(r.item.store)}` : ''
        }</figcaption>
        <img src="${receipts[r.item.id]}" alt="">
      </figure>`,
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Work purchases ${e(year.label)}</title>
<style>
  @page { size: ${paper.css}; margin: 16mm 14mm; }
  body { font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1d1d1f; font-size: 10pt; line-height: 1.4; margin: 0; }
  h1 { font-size: 20pt; margin: 0 0 2pt; letter-spacing: -0.3pt; }
  .lead, .muted { color: #6e6e73; }
  .totals { display: flex; gap: 8pt; margin: 12pt 0 16pt; }
  .total { flex: 1; background: #f5f5f7; border-radius: 10pt; padding: 10pt 12pt; }
  .total b { display: block; font-size: 15pt; font-variant-numeric: tabular-nums; }
  .total span { font-size: 8pt; color: #6e6e73; text-transform: uppercase; letter-spacing: 0.4pt; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; font-size: 8pt; color: #6e6e73; text-transform: uppercase; letter-spacing: 0.4pt; padding: 0 6pt 4pt 0; border-bottom: 0.5pt solid #d2d2d7; }
  td { padding: 6pt 6pt 6pt 0; border-bottom: 0.5pt solid #e5e5ea; vertical-align: top; font-variant-numeric: tabular-nums; }
  .r { text-align: right; }
  .warn { color: #c25e00; }
  .receipt { page-break-inside: avoid; break-inside: avoid; margin: 0 0 14pt; }
  .receipt img { width: 100%; max-height: 330pt; object-fit: contain; background: #f5f5f7; border-radius: 8pt; display: block; margin-top: 4pt; }
  .receipts { page-break-before: always; }
  footer { margin-top: 16pt; font-size: 8pt; color: #6e6e73; }
</style></head>
<body>
  <h1>Work purchases, ${e(year.label)}</h1>
  <p class="lead">${e(formatDate(year.start, region, 'long'))} to ${e(formatDate(year.end, region, 'long'))} · prepared ${e(
    formatDate(today.toISOString().slice(0, 10), region, 'long'),
  )}</p>
  <div class="totals">
    <div class="total"><span>Estimated deductions</span><b>${money(total)}</b></div>
    <div class="total"><span>Bought for work this year</span><b>${money(spend)}</b></div>
    <div class="total"><span>Receipts</span><b>${withReceipts} of ${rows.length}</b></div>
  </div>
  <table>
    <tr><th>Item</th><th>Bought</th><th class="r">Cost</th><th class="r">Work</th><th>Method</th><th class="r">Deduction</th><th>Receipt</th></tr>
    ${table}
  </table>
  <footer>
    Prepared with Keep Track from the owner's records. Deductions are estimates using common
    ${region === 'AU' ? 'ATO' : 'IRS'} methods and the work-use share shown; please confirm before lodging.
  </footer>
  ${receiptPages ? `<section class="receipts">${receiptPages}</section>` : ''}
</body></html>`;
}
