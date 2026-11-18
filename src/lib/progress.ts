import { accountantRows } from './accountant-export';
import { ageOf } from './birthdays';
import { cardExtension } from './cards';
import { ROOMS } from './rooms';
import { streak } from './streaks';
import { taxYearFor } from './tax';
import type { Category, DepreciationSettings, Item, TaxRegion, UpgradeStyle } from './types';
import { sellPlan } from './upgrade';
import { currentValue } from './valuation';

/**
 * Progress: a protection score, money that's real, and badges. Every point is earned by
 * something that makes a claim, a sale or a tax return easier; nothing rewards just opening the app.
 */

export type Check = 'photo' | 'receipt' | 'serial' | 'price';

export const CHECK_LABEL: Record<Check, { add: string; icon: 'camera' | 'receipt' | 'barcode' | 'pricetag' }> = {
  photo: { add: 'Add a photo', icon: 'camera' },
  receipt: { add: 'Add the receipt', icon: 'receipt' },
  serial: { add: 'Add the serial number', icon: 'barcode' },
  price: { add: 'Add what you paid', icon: 'pricetag' },
};

/** Things that carry a serial number insurers and police ask for. Sofas and shirts don't. */
const SERIAL_CATEGORIES: Category[] = ['electronics', 'appliances', 'tools', 'sports'];

export function checksFor(item: Item): Check[] {
  return SERIAL_CATEGORIES.includes(item.category) ? ['photo', 'receipt', 'serial', 'price'] : ['photo', 'receipt', 'price'];
}

export function isDone(item: Item, check: Check): boolean {
  switch (check) {
    case 'photo':
      return !!item.photoUri;
    case 'receipt':
      return !!item.receiptUri;
    case 'serial':
      return item.serial.trim().length > 0;
    case 'price':
      return item.price != null && item.price > 0;
  }
}

/** Valuable things count for more: losing the receipt for a laptop matters more than for a lamp. */
function weight(item: Item): number {
  return Math.max(25, currentValue(item)?.amount ?? item.price ?? 100);
}

export type NextStep = { itemId: string; name: string; check: Check; points: number };

export type Protection = {
  /** 0–100: how claim-ready the inventory is, weighted by value. */
  score: number;
  /** The gaps, most points first. */
  steps: NextStep[];
  /** Items with every check done. */
  complete: number;
  total: number;
};

export function protection(items: Item[]): Protection {
  const owned = items.filter((i) => !i.sold);
  const totalWeight = owned.reduce((s, i) => s + weight(i), 0);
  if (owned.length === 0 || totalWeight === 0) return { score: 0, steps: [], complete: 0, total: 0 };
  let earned = 0;
  let complete = 0;
  const steps: NextStep[] = [];
  for (const item of owned) {
    const checks = checksFor(item);
    const share = weight(item) / totalWeight / checks.length;
    let done = 0;
    for (const check of checks) {
      if (isDone(item, check)) done++;
      else steps.push({ itemId: item.id, name: item.name, check, points: share * 100 });
    }
    earned += share * done;
    if (done === checks.length) complete++;
  }
  steps.sort((a, b) => b.points - a.points);
  return { score: Math.round(earned * 100), steps, complete, total: owned.length };
}

/** How a step's points read: never "+0", since every gap counts for something. */
export function pointsLabel(points: number): string {
  return points >= 1 ? `+${Math.round(points)}` : '+1';
}

export type Money = {
  /** What things were sold for, as recorded. */
  sold: number;
  soldCount: number;
  /** Estimated deductions on work items for the current tax year. */
  deductions: number;
  /** Current value of everything with full records: what a claim could recover without argument. */
  protectedValue: number;
  /** Things with a year (or more) of warranty added by the card they were paid with. */
  cardExtended: number;
};

export function money(items: Item[], region: TaxRegion, dep: DepreciationSettings, today = new Date()): Money {
  const soldItems = items.filter((i) => i.sold?.price != null);
  const endYear = taxYearFor(today.toISOString().slice(0, 10), region).endYear;
  const deductions = accountantRows(items, region, dep, endYear).reduce((s, r) => s + r.deduction, 0);
  const protectedValue = items
    .filter((i) => !i.sold && checksFor(i).every((c) => isDone(i, c)))
    .reduce((s, i) => s + (currentValue(i)?.amount ?? 0), 0);
  return {
    sold: soldItems.reduce((s, i) => s + (i.sold!.price ?? 0), 0),
    soldCount: soldItems.length,
    deductions,
    protectedValue,
    cardExtended: items.filter((i) => !i.sold && cardExtension(i) > 0).length,
  };
}

// Room quests

/** A room is done when it has at least this many things, all fully recorded. */
export const ROOM_DONE_MIN = 3;

export type RoomQuest = { room: string; label: string; count: number; score: number; done: boolean };

/** One quest per room: get everything in it recorded. Rooms with nothing yet come last. */
export function roomQuests(items: Item[]): RoomQuest[] {
  const owned = items.filter((i) => !i.sold);
  return ROOMS.map((r) => {
    const inRoom = owned.filter((i) => i.room === r.id);
    const score = inRoom.length ? protection(inRoom).score : 0;
    return { room: r.id, label: r.label, count: inRoom.length, score, done: inRoom.length >= ROOM_DONE_MIN && score === 100 };
  }).sort((a, b) => Number(b.count > 0) - Number(a.count > 0));
}

// Badges

export type BadgeId =
  | 'first-item'
  | 'first-scan'
  | 'ten'
  | 'fifty'
  | 'hundred'
  | 'collector'
  | 'covered'
  | 'protected'
  | 'perfect-timing'
  | 'tax-ready'
  | 'birthday-club'
  | 'streak-4'
  | 'streak-12'
  | 'room-done'
  | 'rooms-3'
  | 'card-year';

export type Badge = { id: BadgeId; title: string; how: string; icon: string };

export const BADGES: Badge[] = [
  { id: 'first-item', title: 'First keep', how: 'Add your first item.', icon: 'sparkles' },
  { id: 'first-scan', title: 'Receipt reader', how: 'Add items by scanning a receipt.', icon: 'scan' },
  { id: 'ten', title: 'Ten things', how: 'Track 10 things.', icon: 'albums' },
  { id: 'fifty', title: 'Fifty things', how: 'Track 50 things.', icon: 'layers' },
  { id: 'hundred', title: 'The century', how: 'Track 100 things.', icon: 'trophy' },
  { id: 'collector', title: 'Well rounded', how: 'Track things in 5 categories.', icon: 'grid' },
  { id: 'covered', title: 'Fully covered', how: 'Receipts for 3+ things, everything over $100.', icon: 'receipt' },
  { id: 'protected', title: '100% protected', how: 'Score 100 with 5 or more things.', icon: 'shield-checkmark' },
  { id: 'perfect-timing', title: 'Perfect timing', how: 'Sell something inside its best window to sell.', icon: 'pricetag' },
  { id: 'tax-ready', title: 'Tax ready', how: 'A receipt for every work item.', icon: 'briefcase' },
  { id: 'birthday-club', title: 'Built to last', how: 'Keep something for 5 years.', icon: 'gift' },
  { id: 'streak-4', title: 'On a roll', how: 'Add or improve something 4 weeks in a row.', icon: 'flame' },
  { id: 'streak-12', title: 'Creature of habit', how: 'Keep a 12-week streak.', icon: 'bonfire' },
  { id: 'room-done', title: 'Room complete', how: `Fully record 3+ things in one room.`, icon: 'home' },
  { id: 'rooms-3', title: 'Room by room', how: 'Complete 3 rooms.', icon: 'business' },
  { id: 'card-year', title: 'Free extra year', how: 'Get a year of warranty from the card you paid with.', icon: 'card' },
];

/** Badges the current data qualifies for. Events that leave no trace in the data (a scan) are passed in. */
export function qualifyingBadges(
  items: Item[],
  ctx: { region: TaxRegion; style: UpgradeStyle; events: Set<BadgeId>; today?: Date; weeks?: string[] },
): Set<BadgeId> {
  const today = ctx.today ?? new Date();
  const owned = items.filter((i) => !i.sold);
  const earned = new Set<BadgeId>(ctx.events);
  const n = items.length;
  if (n >= 1) earned.add('first-item');
  if (n >= 10) earned.add('ten');
  if (n >= 50) earned.add('fifty');
  if (n >= 100) earned.add('hundred');
  if (new Set(items.map((i) => i.category)).size >= 5) earned.add('collector');

  const pricey = owned.filter((i) => (i.price ?? 0) >= 100);
  if (pricey.length >= 3 && pricey.every((i) => !!i.receiptUri)) earned.add('covered');
  if (owned.length >= 5 && protection(items).score === 100) earned.add('protected');

  const work = owned.filter((i) => i.use === 'work');
  if (work.length >= 1 && work.every((i) => !!i.receiptUri)) earned.add('tax-ready');
  if (owned.some((i) => ageOf(i.purchaseDate, today).years >= 5)) earned.add('birthday-club');
  if (owned.some((i) => cardExtension(i) > 0)) earned.add('card-year');

  const s = streak(ctx.weeks ?? [], today);
  if (Math.max(s.current, s.best) >= 4) earned.add('streak-4');
  if (Math.max(s.current, s.best) >= 12) earned.add('streak-12');
  const roomsDone = roomQuests(items).filter((q) => q.done).length;
  if (roomsDone >= 1) earned.add('room-done');
  if (roomsDone >= 3) earned.add('rooms-3');

  for (const item of items) {
    if (!item.sold) continue;
    const plan = sellPlan({ ...item, sold: null }, ctx.region, ctx.style, new Date(`${item.sold.date}T12:00:00`));
    if (plan?.status === 'window') {
      earned.add('perfect-timing');
      break;
    }
  }
  return earned;
}
