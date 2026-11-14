import type { Item, TaxRegion } from './types';

export type MarketLink = {
  id: 'ebay' | 'facebook' | 'gumtree';
  label: string;
  /** Short note on what the search shows. */
  hint: string;
  url: string;
};

/** The words to search for: the model when given, otherwise the item's name. */
export function searchQuery(item: Pick<Item, 'name' | 'model'>): string {
  return (item.model.trim() || item.name.trim()).replace(/\s+/g, ' ');
}

/**
 * Free searches the user opens in their browser. eBay's sold filter shows what things
 * actually sold for, which beats asking prices. No scraping, no API keys.
 */
export function marketLinks(item: Pick<Item, 'name' | 'model'>, region: TaxRegion): MarketLink[] {
  const q = searchQuery(item);
  const encoded = encodeURIComponent(q);
  const ebayHost = region === 'AU' ? 'www.ebay.com.au' : 'www.ebay.com';

  const links: MarketLink[] = [
    {
      id: 'ebay',
      label: 'eBay sold prices',
      hint: 'What it actually sold for recently',
      url: `https://${ebayHost}/sch/i.html?_nkw=${encoded}&LH_Sold=1&LH_Complete=1`,
    },
    {
      id: 'facebook',
      label: 'Facebook Marketplace',
      hint: 'What people near you are asking',
      url: `https://www.facebook.com/marketplace/search/?query=${encoded}`,
    },
  ];
  if (region === 'AU') {
    const slug = q
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    links.push({
      id: 'gumtree',
      label: 'Gumtree',
      hint: 'What people near you are asking',
      url: `https://www.gumtree.com.au/s-${slug}/k0`,
    });
  }
  return links;
}
