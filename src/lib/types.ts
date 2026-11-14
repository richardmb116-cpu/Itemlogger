export type TaxRegion = 'AU' | 'US';

export type ItemUse = 'personal' | 'work';

export type Condition = 'like-new' | 'good' | 'fair' | 'worn';

export type Sale = {
  /** What it actually sold for; null if not recorded. */
  price: number | null;
  /** ISO date, yyyy-mm-dd. */
  date: string;
};

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
  condition: Condition;
  /** Set once the item has been sold; sold items drop out of totals and reminders. */
  sold: Sale | null;
  notes: string;
  photoUri: string | null;
  receiptUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  taxRegion: TaxRegion;
  /** Warranty expiry notifications switched on by the user. */
  remindersEnabled: boolean;
  /** Days before expiry to remind; 0 = on the day. */
  reminderDays: number[];
  /** The "turn on reminders" card on the Items screen was dismissed. */
  remindersPromptDismissed: boolean;
};
