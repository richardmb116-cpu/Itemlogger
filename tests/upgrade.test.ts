/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fractionAt, profileFor, resaleBrand, usefulLife } from '../src/lib/lifecycle';
import type { Item } from '../src/lib/types';
import { sellPlan } from '../src/lib/upgrade';
import { valueAt } from '../src/lib/valuation';

const today = new Date(2026, 10, 14);

function item(over: Partial<Item>): Item {
  return {
    id: 'x', name: 'MacBook Pro 14"', model: 'Apple MacBook Pro 14 M4', category: 'electronics', price: 3299,
    purchaseDate: '2026-07-12', store: '', serial: '', warrantyMonths: 24, use: 'personal', workPercent: 100,
    effectiveLifeYears: null, condition: 'good', checkedPrice: null, sold: null, notes: '', photoUri: null,
    receiptUri: null, createdAt: '', updatedAt: '', ...over,
  };
}

test('useful life and resale brand from the item', () => {
  assert.deepEqual(usefulLife(item({})), { years: 5, basis: 'Laptop' });
  assert.equal(usefulLife(item({ name: 'iPhone 17', model: '' })).years, 4);
  assert.equal(usefulLife(item({ name: 'Thing', model: '', category: 'furniture' })).years, 15);
  assert.equal(resaleBrand(item({})), 'Apple');
  assert.equal(resaleBrand(item({ name: 'Aeron', model: '' })), 'Herman Miller');
  assert.equal(resaleBrand(item({ name: 'No-name laptop', model: '' })), null);
});

test('value holds through its prime, then falls off a cliff near end of life', () => {
  const p = profileFor(item({ name: 'Generic laptop', model: '' }));
  const prime = fractionAt(p, 2.9) / fractionAt(p, 1.9); // normal yearly decline
  const cliff = fractionAt(p, 4.5) / fractionAt(p, 3.5); // steeper near the end
  assert.ok(cliff < prime);
  assert.ok(fractionAt(p, 10) < 0.05);
  // Strong brands hold value better.
  assert.ok(fractionAt(profileFor(item({})), 2) > fractionAt(p, 2));
});

test('best time to sell is where next year’s loss meets the average yearly cost', () => {
  const plan = sellPlan(item({}), 'US', today)!;
  const i = Math.round(plan.bestAge * 12);
  const at = plan.points[i];
  const before = plan.points[i - 1];
  assert.ok(at.nextYear >= at.average!);
  assert.ok(before.nextYear < before.average!);
  assert.ok(plan.bestAge > 1 && plan.bestAge < 5);
  assert.ok(plan.windowStartAge < plan.bestAge && plan.bestAge < plan.windowEndAge);
  assert.equal(plan.status, 'early');
  assert.ok(plan.bestValue > 0.4 * 3299); // sells while it still funds a good share of the upgrade
});

test('status moves from early to window to late as it ages', () => {
  const plan = sellPlan(item({}), 'US', today)!;
  const at = (months: number) => {
    const d = new Date(2026, 6, 12);
    d.setMonth(d.getMonth() + months);
    return sellPlan(item({}), 'US', d)!.status;
  };
  const best = Math.round(plan.bestAge * 12);
  assert.equal(at(best - 9), 'early');
  assert.equal(at(best), 'window');
  assert.equal(at(best + 9), 'late');
});

test('things that lose most value early are better used up', () => {
  const plan = sellPlan(item({ name: 'Generic TV', model: '', price: 800, purchaseDate: '2023-01-01', warrantyMonths: 12 }), 'US', today)!;
  assert.equal(plan.status, 'use-up');
});

test('a checked price recalibrates the projection', () => {
  const plain = item({});
  const checked = item({ checkedPrice: { amount: 2000, checkedAt: '2026-11-14' } });
  // Checked today at $2,000: the calibrated curve passes through that price.
  const ageNow = (Date.UTC(2026, 10, 14) - Date.UTC(2026, 6, 12)) / 86400000 / 365.25;
  assert.ok(Math.abs(valueAt(checked, ageNow, { calibrate: true }) - 2000) < 1);
  assert.ok(valueAt(checked, ageNow, { calibrate: true }) < valueAt(plain, ageNow));
  assert.equal(sellPlan(checked, 'US', today)!.calibrated, true);
  assert.equal(sellPlan(plain, 'US', today)!.calibrated, false);
});

test('timing tips only where there is evidence', () => {
  assert.match(sellPlan(item({ name: 'iPhone 17 Pro', model: '' }), 'US', today)!.tip!, /September/);
  assert.match(sellPlan(item({}), 'US', today)!.tip!, /new model/);
  assert.equal(sellPlan(item({ name: 'Sofa', model: '', category: 'furniture' }), 'US', today)!.tip, null);
  assert.equal(sellPlan(item({ sold: { price: 1, date: '2026-01-01' } }), 'US', today), null);
});
