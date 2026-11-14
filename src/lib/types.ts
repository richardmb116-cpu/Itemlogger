export type TaxRegion = 'AU' | 'US';

export type ItemUse = 'personal' | 'work';

export type Category =
  | 'electronics'
  | 'appliances'
  | 'furniture'
  | 'tools'
  | 'kitchen'
  | 'jewellery'
  | 'sports'
  | 'clothing'
  | 'other';

export type Item = {
  id: string;
  name: string;
  category: Category;
  /** Purchase price in whole currency units (e.g. 1299.95). */
  price: number | null;
  /** ISO date, yyyy-mm-dd. */
  purchaseDate: string;
  store: string;
  serial: string;
  /** Manufacturer warranty length in months; null when there is none. */
  warrantyMonths: number | null;
  use: ItemUse;
  notes: string;
  photoUri: string | null;
  receiptUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  taxRegion: TaxRegion;
};
