/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildListing } from '../src/lib/listing';
import type { Item } from '../src/lib/types';
import { curveAt, formatAge, roundPrice, valueItem } from '../src/lib/valuation';

const today = new Date(2026, 10, 14);

function item(over: Partial<Item>): Item {
  return {
    id: 'x', name: 'Test thing', category: 'electronics', price: 1000, purchaseDate: '2025-11-14', store: 'JB Hi-Fi',
    serial: 'SN1', warrantyMonths: null, use: 'personal', condition: 'good', sold: null, notes: '',
    photoUri: null, receiptUri: null, createdAt: '', updatedAt: '', ...over,
  };
}

test('curve: first drop, then compounding yearly loss, never below the floor', () => {
  assert.equal(curveAt('electronics', 0), 0.8);
  assert.ok(Math.abs(curveAt('electronics', 1) - 0.8 * 0.78) < 1e-9);
  assert.equal(curveAt('electronics', 30), 0.08);
  assert.equal(curveAt('jewellery', 50), 0.4);
});

test('one-year-old electronics in good condition, no warranty', () => {
  const v = valueItem(item({}), today)!;
  // 1000 × 0.8 × 0.78 = 624 → rounds to 620
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
