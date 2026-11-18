/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checksFor, money, pointsLabel, protection, qualifyingBadges } from '../src/lib/progress';
import type { Item } from '../src/lib/types';

const today = new Date(2026, 10, 18);
let n = 0;
function item(over: Partial<Item>): Item {
  return {
    id: `i${n++}`, name: 'Thing', model: '', category: 'furniture', price: 100, purchaseDate: '2026-01-01', store: '',
    serial: '', warrantyMonths: null, use: 'personal', workPercent: 100, effectiveLifeYears: null, room: null, condition: 'good',
    checkedPrice: null, sold: null, notes: '', photoUri: null, receiptUri: null, createdAt: '', updatedAt: '', ...over,
  };
}
const full = { photoUri: 'p', receiptUri: 'r', serial: 'S1' };
const dep = { auMethod: 'diminishing', auLowValuePool: false, usMethod: 'section179', showAdvanced: false } as const;

test('serial numbers are only asked of things that have them', () => {
  assert.deepEqual(checksFor(item({ category: 'electronics' })), ['photo', 'receipt', 'serial', 'price']);
  assert.deepEqual(checksFor(item({ category: 'furniture' })), ['photo', 'receipt', 'price']);
});

test('score is weighted by value, and steps are ordered by points', () => {
  const laptop = item({ name: 'Laptop', category: 'electronics', price: 3000, purchaseDate: '2026-10-01', photoUri: 'p', serial: 'X' });
  const lamp = item({ name: 'Lamp', price: 40, purchaseDate: '2026-10-01', photoUri: 'p' });
  const p = protection([laptop, lamp]);
  assert.ok(p.score > 50 && p.score < 80, `score ${p.score}`);
  assert.equal(p.steps[0].name, 'Laptop'); // the laptop's receipt is worth the most
  assert.equal(p.steps[0].check, 'receipt');
  assert.ok(p.steps[0].points > p.steps[1].points * 10);
  assert.equal(protection([item(full)]).score, 100);
  assert.equal(protection([]).score, 0);
  assert.equal(pointsLabel(0.3), '+1');
});

test('sold items leave the score; money counts sales, deductions and protected value', () => {
  const items = [
    item({ ...full, price: 500, purchaseDate: '2026-11-01' }),
    item({ price: 200, sold: { price: 150, date: '2026-06-01' } }),
    item({ ...full, price: 1200, use: 'work', category: 'electronics', purchaseDate: '2026-03-01' }),
  ];
  assert.equal(protection(items).total, 2);
  const m = money(items, 'US', dep, today);
  assert.equal(m.sold, 150);
  assert.equal(m.soldCount, 1);
  assert.ok(m.deductions > 0);
  assert.ok(m.protectedValue > 0);
});

test('badges follow the data, and events are kept', () => {
  const ctx = { region: 'US' as const, style: 'balanced' as const, events: new Set<never>(), today };
  assert.deepEqual([...qualifyingBadges([], ctx)], []);
  const five = Array.from({ length: 5 }, (_, i) => item({ ...full, category: (['electronics', 'appliances', 'furniture', 'tools', 'kitchen'] as const)[i] }));
  const got = qualifyingBadges(five, ctx);
  for (const id of ['first-item', 'collector', 'covered', 'protected']) assert.ok(got.has(id as never), id);
  assert.equal(got.has('ten'), false);
  assert.ok(qualifyingBadges([item({ purchaseDate: '2020-01-01' })], ctx).has('birthday-club'));
  assert.ok(qualifyingBadges([item({ use: 'work', receiptUri: 'r' })], ctx).has('tax-ready'));
  assert.ok(qualifyingBadges([], { ...ctx, events: new Set(['first-scan'] as const) }).has('first-scan'));
  // An iPhone sold about 2.5 years in, inside its window.
  const phone = item({ name: 'iPhone 15 Pro', model: 'Apple iPhone 15 Pro', category: 'electronics', price: 1099, purchaseDate: '2023-11-01', sold: { price: 600, date: '2026-05-01' } });
  assert.ok(qualifyingBadges([phone], ctx).has('perfect-timing'));
});
