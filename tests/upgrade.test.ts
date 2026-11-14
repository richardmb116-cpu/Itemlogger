/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fractionAt, profileFor, resaleBrand, usefulLife } from '../src/lib/lifecycle';
import { CHANNELS, netProceeds } from '../src/lib/selling';
import type { Item } from '../src/lib/types';
import { repairAdvice, sellPlan, timingTip } from '../src/lib/upgrade';
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

const iphone = item({ name: 'iPhone 17 Pro', model: 'Apple iPhone 17 Pro', price: 1199, warrantyMonths: 12 });

test('profiles come from the item, with useful life and resale brand', () => {
  assert.deepEqual(usefulLife(item({})), { years: 6.5, basis: 'Mac' });
  assert.equal(profileFor(iphone).id, 'iphone');
  assert.equal(profileFor(item({ name: 'Galaxy S25', model: '' })).id, 'android-flagship');
  assert.equal(profileFor(item({ name: 'AirPods Pro', model: '' })).id, 'earbuds');
  assert.equal(profileFor(item({ name: 'AirPods Max', model: '' })).id, 'headphones');
  assert.equal(resaleBrand(item({})), 'Apple');
  assert.equal(resaleBrand(item({ name: 'No-name gadget', model: '' })), null);
});

test('strong brands hold more value, and the end-of-life cliff never undercuts the floor before it', () => {
  const generic = profileFor(item({ name: 'Generic laptop', model: '' }));
  const mac = profileFor(item({}));
  assert.ok(fractionAt(mac, 3) > fractionAt(generic, 3));
  assert.ok(fractionAt(generic, 10) < 0.06);
});

test('net proceeds count fees and effort', () => {
  assert.equal(netProceeds(100, CHANNELS['ebay-us']), 100 * (1 - 0.136) - 0.4 - 20);
  assert.equal(netProceeds(100, CHANNELS.local), 80);
  assert.equal(netProceeds(10, CHANNELS.local), 0);
});

test('the best age minimises average yearly cost, and keeping crosses it there', () => {
  const plan = sellPlan(iphone, 'US', 'balanced', today)!;
  const i = Math.round(plan.bestAge * 12);
  for (const p of plan.points.slice(12)) assert.ok(p.average! >= plan.bestYearlyCost - 1e-6);
  assert.ok(plan.points[i - 6].marginal < plan.bestYearlyCost);
  assert.ok(plan.points[i + 6].marginal > plan.bestYearlyCost);
  assert.ok(plan.bestAge > 2 && plan.bestAge < 4.5, `iPhone balanced: ${plan.bestAge}`);
  assert.ok(plan.windowStartAge < plan.bestAge && plan.bestAge < plan.windowEndAge);
  assert.equal(plan.status, 'early');
  assert.ok(plan.bestNet < plan.bestValue);
  assert.ok(plan.costYearLate! > 0);
});

test('caring about the latest moves the sale earlier; caring only about value uses it up', () => {
  const latest = sellPlan(iphone, 'US', 'latest', today)!;
  const balanced = sellPlan(iphone, 'US', 'balanced', today)!;
  const value = sellPlan(iphone, 'US', 'value', today)!;
  assert.ok(latest.bestAge < balanced.bestAge);
  assert.equal(value.status, 'use-up');
});

test('status moves from early to window to late as it ages', () => {
  const plan = sellPlan(iphone, 'US', 'balanced', today)!;
  const at = (months: number) => {
    const d = new Date(2026, 6, 12);
    d.setMonth(d.getMonth() + months);
    return sellPlan(iphone, 'US', 'balanced', d)!.status;
  };
  assert.equal(at(Math.round(plan.windowStartAge * 12) - 3), 'early');
  assert.equal(at(Math.round(plan.bestAge * 12)), 'window');
  assert.equal(at(Math.round(plan.windowEndAge * 12) + 3), 'late');
});

test('lenses, a Rolex and a mattress get their own answers', () => {
  const lens = sellPlan(item({ name: 'Sony 24-70mm f/2.8 GM lens', model: '', price: 2299 }), 'US', 'balanced', today)!;
  assert.equal(lens.status, 'use-up');
  assert.ok(lens.bestNet > 1000); // no rush: it holds its value
  assert.equal(sellPlan(item({ name: 'Rolex Submariner', model: '', category: 'jewellery', price: 10000 }), 'US', 'balanced', today)!.status, 'market');
  assert.equal(sellPlan(item({ name: 'Casper mattress', model: '', category: 'furniture', price: 1500 }), 'US', 'balanced', today)!.status, 'no-resale');
  // Cheap things aren't worth selling.
  assert.equal(sellPlan(item({ name: 'AirPods Pro', model: '', price: 249 }), 'US', 'balanced', today)!.status, 'use-up');
});

test('a checked price recalibrates the projection', () => {
  const checked = item({ checkedPrice: { amount: 2000, checkedAt: '2026-11-14' } });
  const ageNow = (Date.UTC(2026, 10, 14) - Date.UTC(2026, 6, 12)) / 86400000 / 365.25;
  assert.ok(Math.abs(valueAt(checked, ageNow, { calibrate: true }) - 2000) < 1);
  assert.equal(sellPlan(checked, 'US', 'balanced', today)!.calibrated, true);
  assert.equal(sellPlan(item({}), 'US', 'balanced', today)!.calibrated, false);
  assert.equal(sellPlan(item({ sold: { price: 1, date: '2026-01-01' } }), 'US', 'balanced', today), null);
});

test('timing tips, with seasons flipped for Australia', () => {
  assert.match(timingTip('iphone', 'US')!, /September/);
  assert.match(timingTip('bike', 'US')!, /March to July/);
  assert.match(timingTip('bike', 'AU')!, /September to January/);
  assert.equal(timingTip('none', 'US'), null);
});

test('repair or replace', () => {
  const young = item({ name: 'Bosch dishwasher', model: '', category: 'appliances', price: 1000, purchaseDate: '2025-11-14' });
  assert.equal(repairAdvice(young, 300, today).repair, true);
  assert.equal(repairAdvice(young, 600, today).repair, false);
  const old = { ...young, purchaseDate: '2010-01-01' };
  assert.equal(repairAdvice(old, 50, today).repair, false);
});
