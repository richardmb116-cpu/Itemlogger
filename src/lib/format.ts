import { parseISODate } from './dates';
import { currencyFor } from './tax';
import type { TaxRegion } from './types';

export function formatMoney(amount: number | null, region: TaxRegion, opts: { cents?: boolean } = {}): string {
  if (amount == null) return '—';
  const { code, locale } = currencyFor(region);
  const cents = opts.cents ?? !Number.isInteger(amount);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(amount);
}

export function formatDate(iso: string, region: TaxRegion, style: 'short' | 'long' = 'short'): string {
  const { locale } = currencyFor(region);
  return parseISODate(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  });
}

/** Parse a user-typed price like "$1,299.95" → 1299.95. Returns null for empty/invalid. */
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}
