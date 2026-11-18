/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { accountantHtml, accountantRows, toCsv } from '../src/lib/accountant-export';
import type { DepreciationSettings, Item } from '../src/lib/types';

const dep: DepreciationSettings = { auMethod: 'diminishing', auLowValuePool: false, usMethod: 'section179', showAdvanced: false };

function item(over: Partial<Item>): Item {
  return {
    id: 'x', name: 'MacBook Pro', model: 'M4 14"', category: 'electronics', price: 3299, purchaseDate: '2026-07-12',
    store: 'Apple', serial: 'SN', warrantyMonths: null, use: 'work', workPercent: 80, effectiveLifeYears: null, room: null,
    condition: 'good', checkedPrice: null, sold: null, notes: '', photoUri: null, receiptUri: 'file://r.jpg',
    createdAt: '', updatedAt: '', ...over,
  };
}

const items = [
  item({ id: 'mac' }),
  item({ id: 'chair', name: 'Aeron chair', model: '', category: 'furniture', price: 2150, purchaseDate: '2025-09-12', workPercent: 100, receiptUri: null }),
  item({ id: 'home', name: 'TV', use: 'personal' }),
  item({ id: 'shirt', name: 'Work shirt, "blue"', category: 'clothing', price: 80 }),
];

test('rows: bought this year plus older items still depreciating; personal excluded', () => {
  const rows = accountantRows(items, 'AU', dep, 2027);
  assert.deepEqual(rows.map((r) => r.item.id), ['chair', 'mac', 'shirt']);
  const chair = rows[0];
  assert.equal(chair.boughtThisYear, false);
  assert.equal(chair.deduction, 361.2);
  assert.equal(chair.lifeYears, 10);
  const shirt = rows[2];
  assert.equal(shirt.method, 'Not claimable');
  assert.equal(shirt.deduction, 0);
});

test('CSV quotes text with commas and quotes, and uses plain numbers', () => {
  const csv = toCsv(accountantRows(items, 'AU', dep, 2027), 'AU', 2027);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^Tax year,Item,Make and model/);
  assert.match(lines[2], /^FY 2026–27,MacBook Pro,"M4 14""",SN,2026-07-12,Apple,3299,80,Diminishing value,2,2559\.66,Yes,Yes,/);
  assert.match(lines[3], /"Work shirt, ""blue"""/);
});

test('PDF html lists items, totals and attaches receipts', () => {
  const rows = accountantRows(items, 'AU', dep, 2027);
  const html = accountantHtml(rows, 'AU', 2027, { mac: 'data:image/jpeg;base64,RRR' }, new Date(2026, 10, 14));
  assert.match(html, /Work purchases, FY 2026–27/);
  assert.match(html, /base64,RRR/);
  assert.match(html, /Missing/); // chair has no receipt
  assert.match(html, /Work shirt, &quot;blue&quot;/);
});
