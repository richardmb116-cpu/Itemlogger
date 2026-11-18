/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { deductionFor, depreciationSchedule, suggestedLife } from '../src/lib/depreciation';
import type { DepreciationSettings, Item } from '../src/lib/types';

const au: DepreciationSettings = { auMethod: 'diminishing', auLowValuePool: false, usMethod: 'section179', showAdvanced: false };

function item(over: Partial<Item>): Item {
  return {
    id: 'x', name: 'MacBook Pro', model: '', category: 'electronics', price: 3299, purchaseDate: '2026-07-12',
    store: '', serial: '', warrantyMonths: null, use: 'work', workPercent: 100, effectiveLifeYears: null, room: null,
    condition: 'good', checkedPrice: null, sold: null, notes: '', photoUri: null, receiptUri: null,
    createdAt: '', updatedAt: '', ...over,
  };
}

test('suggested effective lives', () => {
  assert.deepEqual(suggestedLife(item({ name: 'MacBook Pro' })), { years: 2, basis: 'Laptop or tablet' });
  assert.equal(suggestedLife(item({ name: 'Aeron', model: 'Herman Miller chair', category: 'furniture' })).years, 10);
  assert.equal(suggestedLife(item({ name: 'Drill', category: 'tools' })).years, 5);
});

test('AU diminishing value: first year pro-rated by days held, work share applied', () => {
  // Bought 12 Jul 2026; FY ends 30 Jun 2027 → 354 days held. Life 2 → rate 100%.
  const s = depreciationSchedule(item({ workPercent: 80 }), 'AU', au);
  assert.equal(s.method, 'Diminishing value');
  assert.equal(s.years[0].endYear, 2027);
  assert.equal(s.years[0].decline, 3199.58); // 3299 × 1 × 354/365
  assert.equal(s.years[0].deduction, 2559.66); // 80%
  assert.equal(s.years[1].decline, 99.42);
  assert.equal(s.years[1].closing, 0);
  assert.equal(deductionFor(s, 2027), 2559.66);
});

test('AU prime cost over the effective life', () => {
  // $2,150 chair, life 10, bought 12 Sep 2025 → 292 days to 30 Jun 2026.
  const s = depreciationSchedule(
    item({ name: 'Aeron chair', category: 'furniture', price: 2150, purchaseDate: '2025-09-12' }),
    'AU',
    { ...au, auMethod: 'prime' },
  );
  assert.equal(s.years[0].decline, 172);
  assert.equal(s.years[1].decline, 215);
  const total = s.years.reduce((sum, y) => sum + y.decline, 0);
  assert.ok(Math.abs(total - 2150) < 0.05);
  assert.equal(s.years.at(-1)!.closing, 0);
});

test('AU $300 or less is claimed straight away', () => {
  const s = depreciationSchedule(item({ price: 289, workPercent: 50 }), 'AU', au);
  assert.equal(s.method, 'Immediate deduction');
  assert.deepEqual(s.years, [{ endYear: 2027, decline: 289, deduction: 144.5, closing: 0 }]);
});

test('AU low-value pool for items under $1,000', () => {
  const s = depreciationSchedule(item({ price: 800 }), 'AU', { ...au, auLowValuePool: true });
  assert.equal(s.method, 'Low-value pool');
  assert.equal(s.years[0].decline, 150); // 18.75%
  assert.equal(s.years[1].decline, 243.75); // 37.5% of 650
});

test('US Section 179 and MACRS', () => {
  const s179 = depreciationSchedule(item({ purchaseDate: '2026-03-01', workPercent: 80 }), 'US', au);
  assert.equal(s179.method, 'Section 179');
  assert.deepEqual(s179.years, [{ endYear: 2026, decline: 3299, deduction: 2639.2, closing: 0 }]);

  const lowUse = depreciationSchedule(item({ purchaseDate: '2026-03-01', workPercent: 40 }), 'US', au);
  assert.equal(lowUse.method, 'MACRS'); // Section 179 needs over 50% business use
  assert.match(lowUse.note!, /over 50%/);

  const m = depreciationSchedule(item({ price: 1000, purchaseDate: '2026-03-01' }), 'US', { ...au, usMethod: 'macrs' });
  assert.deepEqual(m.years.map((y) => y.decline), [200, 320, 192, 115.2, 115.2, 57.6]);
  assert.equal(m.years.at(-1)!.closing, 0);
});

test('not eligible: personal use, no price, clothing', () => {
  assert.equal(depreciationSchedule(item({ use: 'personal' }), 'AU', au).eligible, false);
  assert.equal(depreciationSchedule(item({ price: null }), 'AU', au).eligible, false);
  assert.equal(depreciationSchedule(item({ category: 'clothing' }), 'AU', au).eligible, false);
});
