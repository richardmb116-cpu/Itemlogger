import { parseISODate } from './dates';
import type { TaxRegion } from './types';

export type TaxYear = {
  region: TaxRegion;
  /** The year the tax year ends in. AU FY2025–26 ends June 2026 → 2026. US 2025 → 2025. */
  endYear: number;
  label: string;
  shortLabel: string;
  start: string;
  end: string;
};

/**
 * Australia: financial year runs 1 July – 30 June.
 * United States: tax year is the calendar year.
 */
export function taxYearFor(isoDate: string, region: TaxRegion): TaxYear {
  const date = parseISODate(isoDate);
  const year = date.getFullYear();
  if (region === 'AU') {
    const endYear = date.getMonth() >= 6 ? year + 1 : year;
    return taxYearByEnd(endYear, region);
  }
  return taxYearByEnd(year, region);
}

export function taxYearByEnd(endYear: number, region: TaxRegion): TaxYear {
  if (region === 'AU') {
    const startYear = endYear - 1;
    return {
      region,
      endYear,
      label: `FY ${startYear}–${String(endYear).slice(2)}`,
      shortLabel: `${String(startYear).slice(2)}–${String(endYear).slice(2)}`,
      start: `${startYear}-07-01`,
      end: `${endYear}-06-30`,
    };
  }
  return {
    region,
    endYear,
    label: `Tax year ${endYear}`,
    shortLabel: String(endYear),
    start: `${endYear}-01-01`,
    end: `${endYear}-12-31`,
  };
}

export function currencyFor(region: TaxRegion): { code: string; locale: string } {
  return region === 'AU' ? { code: 'AUD', locale: 'en-AU' } : { code: 'USD', locale: 'en-US' };
}

export function regionName(region: TaxRegion): string {
  return region === 'AU' ? 'Australia' : 'United States';
}
