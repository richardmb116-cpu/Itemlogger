/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { categoryCounts, filterItems, groupByCategory, matchesSearch } from '../src/lib/item-filter';
import type { Item } from '../src/lib/types';

function item(over: Partial<Item>): Item {
  return {
    id: over.name ?? 'x', name: 'Thing', model: '', category: 'other', price: 100, purchaseDate: '2026-01-01', store: '',
    serial: '', warrantyMonths: null, use: 'personal', workPercent: 100, effectiveLifeYears: null, room: null, paidWith: null, returnDays: null, condition: 'good',
    checkedPrice: null, sold: null, notes: '', photoUri: null, receiptUri: null, createdAt: '', updatedAt: '', ...over,
  };
}

const items = [
  item({ name: 'MacBook Pro', model: 'Apple MacBook Pro 14', category: 'electronics', use: 'work', store: 'Apple Store' }),
  item({ name: 'Aeron chair', model: 'Herman Miller', category: 'furniture', use: 'work', serial: 'AER123' }),
  item({ name: 'Sofa', category: 'furniture', store: 'IKEA' }),
  item({ name: 'Old iPhone', model: 'Apple iPhone 12', category: 'electronics', sold: { price: 300, date: '2026-05-01' } }),
];

test('search matches every word, across name, brand, store, serial and category', () => {
  assert.equal(matchesSearch(items[0], 'apple pro'), true);
  assert.equal(matchesSearch(items[0], 'apple sofa'), false);
  assert.equal(matchesSearch(items[1], 'aer123'), true);
  assert.equal(matchesSearch(items[2], 'furniture'), true);
  assert.equal(matchesSearch(items[1], 'work'), true);
  assert.equal(matchesSearch(items[2], '   '), true);
});

test('filters combine: use, category and search; sold items only under Sold', () => {
  const names = (f: Parameters<typeof filterItems>[1]) => filterItems(items, f).map((i) => i.name);
  assert.deepEqual(names({ query: '', category: null, use: null }), ['MacBook Pro', 'Aeron chair', 'Sofa']);
  assert.deepEqual(names({ query: '', category: 'furniture', use: 'work' }), ['Aeron chair']);
  assert.deepEqual(names({ query: 'apple', category: null, use: null }), ['MacBook Pro']);
  assert.deepEqual(names({ query: '', category: null, use: 'sold' }), ['Old iPhone']);
});

test('grouping follows category order and counts match', () => {
  const groups = groupByCategory(items.slice(0, 3));
  assert.deepEqual(groups.map((g) => [g.category, g.items.length]), [['electronics', 1], ['furniture', 2]]);
  assert.equal(categoryCounts(items.slice(0, 3)).get('furniture'), 2);
});
