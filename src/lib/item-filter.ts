import { CATEGORIES, categoryInfo } from './categories';
import type { Category, Item, ItemUse } from './types';

export type UseFilter = ItemUse | 'sold' | null;

/** Every word of the search must appear somewhere in the item (name, model, store, serial, notes, category, use). */
export function matchesSearch(item: Item, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = [
    item.name,
    item.model,
    item.store,
    item.serial,
    item.notes,
    categoryInfo(item.category).label,
    item.use === 'work' ? 'work' : 'personal',
    item.sold ? 'sold' : '',
  ]
    .join(' ')
    .toLowerCase();
  return words.every((w) => text.includes(w));
}

export function filterItems(items: Item[], f: { query: string; category: Category | null; use: UseFilter }): Item[] {
  return items.filter((item) => {
    if (f.category && item.category !== f.category) return false;
    if (f.use === 'sold') {
      if (!item.sold) return false;
    } else if (item.sold || (f.use && item.use !== f.use)) {
      return false;
    }
    return matchesSearch(item, f.query);
  });
}

export type ItemGroup = { category: Category; label: string; items: Item[] };

/** Items grouped by category, in the app's category order, keeping each group's item order. */
export function groupByCategory(items: Item[]): ItemGroup[] {
  return CATEGORIES.map((cat) => ({ category: cat.id, label: cat.label, items: items.filter((i) => i.category === cat.id) })).filter(
    (g) => g.items.length > 0,
  );
}

/** How many items fall in each category (for the filter chips). */
export function categoryCounts(items: Item[]): Map<Category, number> {
  const counts = new Map<Category, number>();
  items.forEach((i) => counts.set(i.category, (counts.get(i.category) ?? 0) + 1));
  return counts;
}
