import { parseISODate } from './dates';
import { formatDate, formatMoney } from './format';
import { currencyFor } from './tax';
import type { Item, TaxRegion } from './types';
import { conditionInfo } from './valuation';
import { warrantyStatus } from './warranty';

export type Listing = { title: string; body: string };

/**
 * A ready-to-post marketplace listing. Leaves out the serial number on purpose:
 * buyers can ask for it, and posting it publicly helps scammers.
 */
export function buildListing(item: Item, askingPrice: number | null, region: TaxRegion, today = new Date()): Listing {
  const condition = conditionInfo(item.condition);
  const bought = parseISODate(item.purchaseDate).toLocaleDateString(currencyFor(region).locale, {
    month: 'long',
    year: 'numeric',
  });
  // A card's extended warranty doesn't pass to a buyer.
  const warranty = warrantyStatus({ ...item, paidWith: null }, today);

  const lines = [
    `${item.name}, bought new${item.store ? ` from ${item.store}` : ''} in ${bought}.`,
    condition.listing,
  ];
  if (warranty.expires && (warranty.state === 'active' || warranty.state === 'expiring')) {
    lines.push(`Still under the manufacturer's warranty until ${formatDate(warranty.expires, region, 'long')}.`);
  }
  if (item.receiptUri) lines.push('Original receipt included.');
  if (item.serial) lines.push('Serial number available on request.');
  if (askingPrice != null) lines.push('', `Asking ${formatMoney(askingPrice, region)}.`);
  lines.push(region === 'AU' ? 'Pick up, or happy to post at cost.' : 'Local pickup, or can ship at cost.');

  return {
    title: `${item.name}, ${condition.label.toLowerCase()} condition`,
    body: lines.join('\n'),
  };
}

export function listingText(l: Listing): string {
  return `${l.title}\n\n${l.body}`;
}
