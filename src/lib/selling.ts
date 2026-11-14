import type { TaxRegion } from './types';

/**
 * What selling actually costs, by country and channel (fees as of 2026; see the study).
 *  - eBay US: 13.6% final value fee on most categories + $0.40 per order
 *  - eBay AU private sellers (under AU$25k/yr): no final value fee since April 2026
 *  - Facebook Marketplace / Gumtree / Craigslist local pickup: free
 *  - Trade-in programs pay about 60–75% of a private sale
 */
export type SaleChannel = {
  id: 'ebay-us' | 'local' | 'ebay-au';
  label: string;
  /** Share of the sale price taken in fees. */
  fee: number;
  /** Fixed fee per sale. */
  fixed: number;
  asOf: string;
};

export const CHANNELS: Record<SaleChannel['id'], SaleChannel> = {
  'ebay-us': { id: 'ebay-us', label: 'eBay', fee: 0.136, fixed: 0.4, asOf: '2026' },
  'ebay-au': { id: 'ebay-au', label: 'eBay (private seller)', fee: 0, fixed: 0, asOf: '2026-04' },
  local: { id: 'local', label: 'Local sale (Marketplace, Gumtree, Craigslist)', fee: 0, fixed: 0, asOf: '2026' },
};

/** Trade-in programs pay roughly two-thirds of a private sale (vendor commentary; low confidence). */
export const TRADE_IN_SHARE = 0.68;

/** The seller's own time and hassle: listing, messages, meeting a buyer (about an hour). */
export const EFFORT_COST = 20;

/** Below this net amount, selling isn't worth the effort; donate, bundle or trade in instead. */
export const WORTH_SELLING_MIN = 40;

/** The usual way to sell this kind of item in this country. */
export function defaultChannel(region: TaxRegion, shippable: boolean): SaleChannel {
  if (region === 'AU') return shippable ? CHANNELS['ebay-au'] : CHANNELS.local;
  return shippable ? CHANNELS['ebay-us'] : CHANNELS.local;
}

/** What actually lands in your pocket from a sale at this price, after fees and effort. */
export function netProceeds(price: number, channel: SaleChannel): number {
  return Math.max(0, price * (1 - channel.fee) - channel.fixed - EFFORT_COST);
}
