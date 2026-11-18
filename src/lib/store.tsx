import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { addMonths, toISODate } from './dates';
import { deleteImage } from './images';
import { bundledUri } from './photos';
import { DEFAULT_REMINDER_DAYS } from './reminder-plan';
import { markChanged, markDeleted, markSettingsChanged } from './outbox';
import { kv } from './storage';
import { isProgress, recordWeek } from './streaks';
import { SYNCED_SETTING_KEYS, type SyncedSettings } from './sync-merge';
import type { SyncHost } from './sync';
import type { Item, Settings, TaxRegion } from './types';

const ITEMS_KEY = 'items.v1';
const SETTINGS_KEY = 'settings.v1';

const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  taxRegion: 'US',
  upgradeStyle: 'balanced',
  depreciation: { auMethod: 'diminishing', auLowValuePool: false, usMethod: 'section179', showAdvanced: false },
  insurance: { insurer: '', policyNumber: '', sumInsured: null },
  remindersEnabled: false,
  birthdaysEnabled: true,
  reminderDays: DEFAULT_REMINDER_DAYS,
  remindersPromptDismissed: false,
  groupBy: 'none',
  activity: [],
  badges: {},
};

type Store = {
  items: Item[];
  settings: Settings;
  getItem: (id: string) => Item | undefined;
  saveItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addSampleItems: (region?: TaxRegion) => void;
  deleteAllItems: () => void;
  /** For the sync engine: read the latest data and apply server changes without re-queuing them. */
  syncHost: SyncHost;
};

/** The latest committed data, readable outside React (the sync engine runs between renders). */
const latest: { items: Item[]; settings: Settings | null } = { items: [], settings: null };

const StoreContext = createContext<Store | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = kv.get(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Fill in fields added after an item was first saved. */
function normalize(item: Partial<Item> & Pick<Item, 'id'>): Item {
  return {
    model: '',
    condition: 'good',
    checkedPrice: null,
    sold: null,
    workPercent: 100,
    effectiveLifeYears: null,
    room: null,
    ...item,
  } as Item;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>(() => {
    latest.items = load<Item[]>(ITEMS_KEY, []).map(normalize);
    return latest.items;
  });
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = load<Partial<Settings> & { groupByCategory?: boolean }>(SETTINGS_KEY, {});
    if (saved.groupBy == null && saved.groupByCategory) saved.groupBy = 'category';
    delete saved.groupByCategory;
    latest.settings = {
      ...DEFAULT_SETTINGS,
      ...saved,
      depreciation: { ...DEFAULT_SETTINGS.depreciation, ...saved.depreciation },
      insurance: { ...DEFAULT_SETTINGS.insurance, ...saved.insurance },
    };
    return latest.settings;
  });

  const writeItems = useCallback((updater: (prev: Item[]) => Item[]) => {
    setItems((prev) => {
      const next = updater(prev);
      latest.items = next;
      void kv.set(ITEMS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const writeSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      latest.settings = next;
      void kv.set(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      items,
      settings,
      getItem: (id) => items.find((i) => i.id === id),
      saveItem: (item) => {
        const stamped = { ...item, updatedAt: new Date().toISOString() };
        markChanged([stamped.id]);
        // Adding or improving something keeps the weekly streak going.
        const current = latest.settings ?? DEFAULT_SETTINGS;
        if (isProgress(latest.items.find((i) => i.id === stamped.id), stamped)) {
          const activity = recordWeek(current.activity);
          if (activity !== current.activity) {
            markSettingsChanged(new Date().toISOString());
            writeSettings({ activity });
          }
        }
        writeItems((prev) => {
          const exists = prev.some((i) => i.id === stamped.id);
          return exists ? prev.map((i) => (i.id === stamped.id ? stamped : i)) : [stamped, ...prev];
        });
      },
      deleteItem: (id) => {
        markDeleted([id], new Date().toISOString());
        writeItems((prev) => {
          const gone = prev.find((i) => i.id === id);
          if (gone) {
            deleteImage(gone.photoUri);
            deleteImage(gone.receiptUri);
          }
          return prev.filter((i) => i.id !== id);
        });
      },
      updateSettings: (patch) => {
        if (SYNCED_SETTING_KEYS.some((k) => k in patch)) markSettingsChanged(new Date().toISOString());
        writeSettings(patch);
      },
      addSampleItems: (region) => {
        const samples = sampleItems(region ?? settings.taxRegion);
        markChanged(samples.map((i) => i.id));
        writeItems((prev) => [...samples, ...prev]);
      },
      deleteAllItems: () => {
        markDeleted(
          latest.items.map((i) => i.id),
          new Date().toISOString(),
        );
        writeItems((prev) => {
          prev.forEach((i) => {
            deleteImage(i.photoUri);
            deleteImage(i.receiptUri);
          });
          return [];
        });
      },
      syncHost: {
        getItems: () => latest.items,
        setItems: (next) => writeItems(() => next),
        getSettings: () => latest.settings ?? DEFAULT_SETTINGS,
        applySettings: (synced: SyncedSettings) => writeSettings(synced),
      },
    }),
    [items, settings, writeItems, writeSettings],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Most recently added first, so something just added (even an old purchase) is at the top. */
export function sortRecent(items: Item[]): Item[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.purchaseDate.localeCompare(a.purchaseDate));
}

/** Newest purchases first. */
export function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate) || b.createdAt.localeCompare(a.createdAt));
}

function sampleItems(region: TaxRegion): Item[] {
  const us = region === 'US';
  const now = new Date();
  const ago = (months: number, day = 12) => toISODate(addMonths(new Date(now.getFullYear(), now.getMonth(), day), -months));
  const stamp = new Date().toISOString();
  const base = {
    notes: '',
    photoUri: null as string | null,
    receiptUri: null,
    checkedPrice: null,
    sold: null,
    effectiveLifeYears: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
  const rows: (Omit<Item, 'id' | 'notes' | 'photoUri' | 'receiptUri' | 'checkedPrice' | 'sold' | 'effectiveLifeYears' | 'createdAt' | 'updatedAt'> & { photoUri?: string })[] = [
    { room: 'office', name: 'MacBook Pro 14"', photoUri: bundledUri('laptop'), model: 'Apple MacBook Pro 14 M4', category: 'electronics', price: 3299, purchaseDate: ago(4), store: 'Apple Store', serial: 'C02XK1J2MD6R', warrantyMonths: 24, condition: 'like-new', workPercent: 80, use: 'work' },
    { room: 'storage', name: 'Dyson V15 Detect', model: 'Dyson V15 Detect Absolute', category: 'appliances', price: 1249, purchaseDate: ago(23, 3), store: us ? 'Best Buy' : 'JB Hi-Fi', serial: 'SV22-AU-48120', warrantyMonths: 24, condition: 'good', workPercent: 100, use: 'personal' },
    { room: 'office', name: 'Herman Miller Aeron', photoUri: bundledUri('chair'), model: 'Herman Miller Aeron size B', category: 'furniture', price: 2150, purchaseDate: ago(14), store: us ? 'Design Within Reach' : 'Living Edge', serial: 'AER1B23DW', warrantyMonths: 144, condition: 'good', workPercent: 100, use: 'work' },
    { room: 'kitchen', name: 'Breville Barista Express', photoUri: bundledUri('coffee'), model: 'Breville BES870', category: 'kitchen', price: 899, purchaseDate: ago(30), store: us ? 'Williams Sonoma' : 'Myer', serial: 'BES870BSS', warrantyMonths: 24, condition: 'fair', workPercent: 100, use: 'personal' },
    { room: 'living', name: 'Sony WH-1000XM6', photoUri: bundledUri('headphones'), model: 'Sony WH-1000XM6', category: 'electronics', price: 649.95, purchaseDate: ago(1), store: 'Amazon', serial: '5512093', warrantyMonths: 12, condition: 'like-new', workPercent: 50, use: 'work' },
    { room: 'bedroom', name: 'iPhone 15 Pro', model: 'Apple iPhone 15 Pro 256GB', category: 'electronics', price: 1099, purchaseDate: ago(25), store: us ? 'Apple Store' : 'JB Hi-Fi', serial: 'F2LXK9QWN8', warrantyMonths: 12, condition: 'good', workPercent: 100, use: 'personal' },
    { room: 'garage', name: 'Makita drill kit', photoUri: bundledUri('drill'), model: 'Makita DHP487', category: 'tools', price: 389, purchaseDate: ago(12, now.getDate()), store: us ? 'The Home Depot' : 'Bunnings', serial: 'DHP487Z-0921', warrantyMonths: 36, condition: 'worn', workPercent: 100, use: 'personal' },
  ];
  return rows.map((r, i) => ({ ...base, ...r, id: `sample-${i}-${newId()}` }));
}
