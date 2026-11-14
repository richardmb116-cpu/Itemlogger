import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { addMonths, toISODate } from './dates';
import { deleteImage } from './images';
import { DEFAULT_REMINDER_DAYS } from './reminder-plan';
import { kv } from './storage';
import type { Item, Settings } from './types';

const ITEMS_KEY = 'items.v1';
const SETTINGS_KEY = 'settings.v1';

const DEFAULT_SETTINGS: Settings = {
  taxRegion: 'AU',
  remindersEnabled: false,
  reminderDays: DEFAULT_REMINDER_DAYS,
  remindersPromptDismissed: false,
};

type Store = {
  items: Item[];
  settings: Settings;
  getItem: (id: string) => Item | undefined;
  saveItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addSampleItems: () => void;
  deleteAllItems: () => void;
};

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
  return { condition: 'good', sold: null, ...item } as Item;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>(() => load<Item[]>(ITEMS_KEY, []).map(normalize));
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load(SETTINGS_KEY, {}) }));

  const writeItems = useCallback((updater: (prev: Item[]) => Item[]) => {
    setItems((prev) => {
      const next = updater(prev);
      void kv.set(ITEMS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      items,
      settings,
      getItem: (id) => items.find((i) => i.id === id),
      saveItem: (item) =>
        writeItems((prev) => {
          const exists = prev.some((i) => i.id === item.id);
          return exists ? prev.map((i) => (i.id === item.id ? item : i)) : [item, ...prev];
        }),
      deleteItem: (id) =>
        writeItems((prev) => {
          const gone = prev.find((i) => i.id === id);
          if (gone) {
            deleteImage(gone.photoUri);
            deleteImage(gone.receiptUri);
          }
          return prev.filter((i) => i.id !== id);
        }),
      updateSettings: (patch) =>
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          void kv.set(SETTINGS_KEY, JSON.stringify(next));
          return next;
        }),
      addSampleItems: () => writeItems((prev) => [...sampleItems(), ...prev]),
      deleteAllItems: () =>
        writeItems((prev) => {
          prev.forEach((i) => {
            deleteImage(i.photoUri);
            deleteImage(i.receiptUri);
          });
          return [];
        }),
    }),
    [items, settings, writeItems],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Newest purchases first. */
export function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate) || b.createdAt.localeCompare(a.createdAt));
}

function sampleItems(): Item[] {
  const now = new Date();
  const ago = (months: number, day = 12) => toISODate(addMonths(new Date(now.getFullYear(), now.getMonth(), day), -months));
  const stamp = new Date().toISOString();
  const base = { notes: '', photoUri: null, receiptUri: null, sold: null, createdAt: stamp, updatedAt: stamp };
  const rows: Omit<Item, 'id' | 'notes' | 'photoUri' | 'receiptUri' | 'sold' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'MacBook Pro 14"', category: 'electronics', price: 3299, purchaseDate: ago(4), store: 'Apple Store', serial: 'C02XK1J2MD6R', warrantyMonths: 24, condition: 'like-new', use: 'work' },
    { name: 'Dyson V15 Detect', category: 'appliances', price: 1249, purchaseDate: ago(23, 3), store: 'JB Hi-Fi', serial: 'SV22-AU-48120', warrantyMonths: 24, condition: 'good', use: 'personal' },
    { name: 'Herman Miller Aeron', category: 'furniture', price: 2150, purchaseDate: ago(14), store: 'Living Edge', serial: 'AER1B23DW', warrantyMonths: 144, condition: 'good', use: 'work' },
    { name: 'Breville Barista Express', category: 'kitchen', price: 899, purchaseDate: ago(30), store: 'Myer', serial: 'BES870BSS', warrantyMonths: 24, condition: 'fair', use: 'personal' },
    { name: 'Sony WH-1000XM6', category: 'electronics', price: 649.95, purchaseDate: ago(1), store: 'Amazon', serial: '5512093', warrantyMonths: 12, condition: 'like-new', use: 'work' },
    { name: 'Makita drill kit', category: 'tools', price: 389, purchaseDate: ago(8), store: 'Bunnings', serial: 'DHP487Z-0921', warrantyMonths: 36, condition: 'worn', use: 'personal' },
  ];
  return rows.map((r, i) => ({ ...base, ...r, id: `sample-${i}-${newId()}` }));
}
