/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildListing } from '../src/lib/listing';
import type { Item } from '../src/lib/types';
import { fractionAt, profileFor } from '../src/lib/lifecycle';
import { formatAge, roundPrice, valueAt, valueItem } from '../src/lib/valuation';

const today = new Date(2026, 10, 14);

function item(over: Partial<Item>): Item {
  return {
    id: 'x', name: 'Test thing', category: 'electronics', price: 1000, purchaseDate: '2025-11-14', store: 'JB Hi-Fi',
    model: '', serial: 'SN1', warrantyMonths: null, use: 'personal', workPercent: 100, effectiveLifeYears: null, room: null, condition: 'good', checkedPrice: null, sold: null, notes: '',
    photoUri: null, receiptUri: null, createdAt: '', updatedAt: '', ...over,
  };
}

test('curve: day-one drop, a year-one value, compounding loss, and a floor that holds', () => {
  const p = profileFor(item({}));
  assert.ok(fractionAt(p, 0) < 1 && fractionAt(p, 0) > p.v12);
  assert.ok(Math.abs(fractionAt(p, 1) - p.v12) < 1e-9);
  assert.ok(Math.abs(fractionAt(p, 2) - p.v12 * (1 - p.perYear)) < 1e-9);
  // Headphones and lenses keep their floor; the old model sent them to 3–6% of price.
  const phones = profileFor(item({ name: 'Sony WH-1000XM6' }));
  assert.ok(fractionAt(phones, 4.5) >= phones.floor);
  const lens = profileFor(item({ name: 'Sony 24-70mm f/2.8 GM lens' }));
  assert.equal(lens.id, 'lens');
  assert.ok(fractionAt(lens, 10) > 0.55);
});

test('special cases: market-priced, no resale market, and brand premiums', () => {
  const rolex = item({ name: 'Rolex Submariner', category: 'jewellery', price: 10000 });
  assert.equal(profileFor(rolex).market, true);
  assert.equal(valueAt(rolex, 10), valueAt(rolex, 1));
  const mattress = item({ name: 'Casper mattress', category: 'furniture' });
  assert.equal(valueItem(mattress, today)!.estimate, 0);
  const shimano = item({ name: 'E-bike', model: 'Shimano EP8 e-bike', category: 'sports' });
  const plain = item({ name: 'E-bike', model: 'Generic e-bike', category: 'sports' });
  assert.ok(valueAt(shimano, 3) > valueAt(plain, 3));
});

test('one-year-old electronics in good condition, no warranty', () => {
  const v = valueItem(item({}), today)!;
  // Electronics keep about 62% after a year → 620
  assert.equal(v.estimate, 620);
  assert.equal(v.lost, 380);
  assert.ok(v.low < v.estimate && v.estimate < v.high);
  assert.ok(v.inAYear < v.estimate);
  assert.equal(v.warrantyBonus, false);
});

test('condition and live warranty move the estimate', () => {
  const good = valueItem(item({}), today)!.estimate;
  const worn = valueItem(item({ condition: 'worn' }), today)!.estimate;
  const covered = valueItem(item({ warrantyMonths: 24 }), today)!;
  assert.ok(worn < good);
  assert.ok(covered.estimate > good);
  assert.equal(covered.warrantyBonus, true);
});

test('never above the price paid; no price → no estimate', () => {
  const v = valueItem(item({ purchaseDate: '2026-11-14', condition: 'like-new', warrantyMonths: 24 }), today)!;
  assert.ok(v.estimate <= 1000 && v.high <= 1000);
  assert.equal(valueItem(item({ price: null }), today), null);
});

test('price rounding steps', () => {
  assert.equal(roundPrice(123), 125);
  assert.equal(roundPrice(624), 620);
  assert.equal(roundPrice(1234), 1250);
  assert.equal(roundPrice(1), 5);
});

test('age labels', () => {
  assert.equal(formatAge(0.02), 'Under a month');
  assert.equal(formatAge(0.5), '6 months');
  assert.equal(formatAge(1), '1 year');
  assert.equal(formatAge(1.92), '1 yr 11 mo');
});

test('listing mentions warranty and receipt, never the serial number', () => {
  const l = buildListing(item({ warrantyMonths: 24, receiptUri: 'file://r.jpg' }), 650, 'AU', today);
  assert.equal(l.title, 'Test thing, good condition');
  assert.match(l.body, /bought new from JB Hi-Fi in November 2025/);
  assert.match(l.body, /warranty until 14 November 2027/);
  assert.match(l.body, /Original receipt included/);
  assert.match(l.body, /Asking \$650/);
  assert.doesNotMatch(l.body, /SN1/);
});

test('a checked price overrides the estimate and goes stale after 90 days', async () => {
  const { currentValue } = await import('../src/lib/valuation');
  const est = currentValue(item({}), today)!;
  assert.equal(est.source, 'estimate');
  const fresh = currentValue(item({ checkedPrice: { amount: 700, checkedAt: '2026-11-01' } }), today)!;
  assert.equal(fresh.source, 'checked');
  assert.equal(fresh.amount, 700);
  assert.equal(fresh.ageDays, 13);
  assert.equal(fresh.stale, false);
  assert.ok(fresh.valuation); // estimate kept for comparison
  const old = currentValue(item({ checkedPrice: { amount: 700, checkedAt: '2026-06-01' } }), today)!;
  assert.equal(old.stale, true);
  // A checked price works even when the purchase price is unknown.
  assert.equal(currentValue(item({ price: null, checkedPrice: { amount: 50, checkedAt: '2026-11-14' } }), today)!.amount, 50);
});

test('market search links use the model, region site, and sold filter', async () => {
  const { marketLinks, searchQuery } = await import('../src/lib/market-links');
  const it = item({ name: 'Vacuum', model: 'Dyson V15  Detect' });
  assert.equal(searchQuery(it), 'Dyson V15 Detect');
  assert.equal(searchQuery(item({ name: 'Old kettle', model: '' })), 'Old kettle');
  const au = marketLinks(it, 'AU');
  assert.deepEqual(au.map((l) => l.id), ['ebay', 'facebook', 'gumtree']);
  assert.equal(au[0].url, 'https://www.ebay.com.au/sch/i.html?_nkw=Dyson%20V15%20Detect&LH_Sold=1&LH_Complete=1');
  assert.equal(au[2].url, 'https://www.gumtree.com.au/s-dyson-v15-detect/k0');
  const us = marketLinks(it, 'US');
  assert.deepEqual(us.map((l) => l.id), ['ebay', 'facebook']);
  assert.match(us[0].url, /^https:\/\/www\.ebay\.com\/sch/);
});
