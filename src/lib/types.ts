export type TaxRegion = 'AU' | 'US';

export type ItemUse = 'personal' | 'work';

export type Condition = 'like-new' | 'good' | 'fair' | 'worn';

/** A price the user looked up themselves, e.g. from eBay sold listings. */
export type CheckedPrice = {
  amount: number;
  /** ISO date, yyyy-mm-dd. */
  checkedAt: string;
};

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
  /** Make and model, used to search for real second-hand prices. */
  model: string;
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
  /** Share of use that's for work, 1–100. Only applies when use is "work". */
  workPercent: number;
  /** Effective life in years for depreciation; null uses the suggested life. */
  effectiveLifeYears: number | null;
  condition: Condition;
  /** Overrides the estimate when set. */
  checkedPrice: CheckedPrice | null;
  /** Set once the item has been sold; sold items drop out of totals and reminders. */
  sold: Sale | null;
  notes: string;
  photoUri: string | null;
  receiptUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InsuranceDetails = {
  insurer: string;
  policyNumber: string;
  /** Contents sum insured, in the region's currency. */
  sumInsured: number | null;
};

export type AuMethod = 'diminishing' | 'prime';
export type UsMethod = 'section179' | 'macrs';

export type DepreciationSettings = {
  auMethod: AuMethod;
  /** Pool items under $1,000 (ATO low-value pool). */
  auLowValuePool: boolean;
  usMethod: UsMethod;
  /** Show methods, effective lives and year-by-year schedules (for people who want the detail). */
  showAdvanced: boolean;
};

/** How much the owner values having the latest version: sets how heavily obsolescence counts. */
export type UpgradeStyle = 'value' | 'balanced' | 'latest';

export type Settings = {
  /** The welcome screens have been seen. */
  onboarded: boolean;
  taxRegion: TaxRegion;
  upgradeStyle: UpgradeStyle;
  depreciation: DepreciationSettings;
  insurance: InsuranceDetails;
  /** Warranty expiry notifications switched on by the user. */
  remindersEnabled: boolean;
  /** Days before expiry to remind; 0 = on the day. */
  reminderDays: number[];
  /** Notify on each purchase anniversary ("Happy 1st birthday"). */
  birthdaysEnabled: boolean;
  /** The "turn on reminders" card on the Items screen was dismissed. */
  remindersPromptDismissed: boolean;
};
