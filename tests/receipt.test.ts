/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { defaultSelection, itemsFromScan, normalizeScan, receiptPrompt, totalCheck } from '../src/lib/receipt';

const today = new Date(2026, 10, 16);

const raw = {
  store: 'Best Buy',
  date: '2026-11-10',
  total: 1302.5,
  items: [
    { name: 'Samsung 65" QLED TV', model: 'Samsung QN65Q80C', quantity: 1, unitPrice: 999.99, category: 'electronics', durable: true },
    { name: 'Table lamp', model: '', quantity: 2, unitPrice: '$49.50', category: 'furniture', durable: true },
    { name: 'AA batteries 8-pack', model: '', quantity: 1, unitPrice: 9.99, category: 'other', durable: false },
    { name: '', quantity: 1, unitPrice: 5 },
    { name: 'Mystery', quantity: 500, unitPrice: -3, category: 'spaceship' },
  ],
};

test('each unit becomes its own line, and bad values are tidied', () => {
  const scan = normalizeScan(raw, today);
  assert.equal(scan.store, 'Best Buy');
  assert.equal(scan.date, '2026-11-10');
  const lamps = scan.lines.filter((l) => l.name === 'Table lamp');
  assert.equal(lamps.length, 2); // quantity 2 → two items
  assert.equal(lamps[0].price, 49.5); // "$49.50" parsed
  assert.equal(scan.lines.some((l) => l.name === ''), false); // nameless lines dropped
  const mystery = scan.lines.filter((l) => l.name === 'Mystery');
  assert.equal(mystery.length, 10); // capped, not 500
  assert.equal(mystery[0].price, null); // negative price rejected
  assert.equal(mystery[0].category, 'other'); // unknown category
  assert.equal(new Set(scan.lines.map((l) => l.key)).size, scan.lines.length); // keys unique
});

test('impossible dates and junk replies are handled', () => {
  assert.equal(normalizeScan({ ...raw, date: '2027-01-01' }, today).date, null); // future
  assert.equal(normalizeScan({ ...raw, date: 'last Tuesday' }, today).date, null);
  assert.deepEqual(normalizeScan('not json at all', today).lines, []);
  assert.deepEqual(normalizeScan(null, today).lines, []);
});

test('things worth tracking are ticked by default; the batteries are not', () => {
  const scan = normalizeScan(raw, today);
  const ticked = defaultSelection(scan);
  const batteries = scan.lines.find((l) => l.name.startsWith('AA'))!;
  assert.equal(ticked.has(batteries.key), false);
  assert.equal(ticked.has(scan.lines[0].key), true);
});

test('ticked lines become items sharing the receipt, store and date', () => {
  const scan = normalizeScan(raw, today);
  let n = 0;
  const items = itemsFromScan(scan, new Set(scan.lines.slice(0, 3).map((l) => l.key)), {
    receiptUri: 'data:image/jpeg;base64,xyz',
    newId: () => `id${n++}`,
    today,
  });
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((i) => i.id), ['id0', 'id1', 'id2']);
  for (const i of items) {
    assert.equal(i.store, 'Best Buy');
    assert.equal(i.purchaseDate, '2026-11-10');
    assert.equal(i.receiptUri, 'data:image/jpeg;base64,xyz');
    assert.equal(i.condition, 'like-new');
  }
  assert.equal(items[0].warrantyMonths, 12); // electronics
  assert.equal(items[1].warrantyMonths, null); // furniture: unknown
  // No date on the receipt: today.
  const undated = normalizeScan({ ...raw, date: null }, today);
  assert.equal(itemsFromScan(undated, defaultSelection(undated), { receiptUri: null, newId: () => 'x', today })[0].purchaseDate, '2026-11-16');
});

test('flags a receipt whose lines fall well short of the total', () => {
  const scan = normalizeScan(raw, today);
  assert.equal(totalCheck({ ...scan, lines: scan.lines.slice(0, 4), total: 1199.5 }), 'matches'); // tax on top is fine
  assert.equal(totalCheck({ ...scan, lines: scan.lines.slice(0, 1), total: 1199.5 }), 'missing-lines');
  assert.equal(totalCheck({ ...scan, total: null }), 'unknown');
});

test('the prompt names the region and today', () => {
  assert.match(receiptPrompt('AU', today), /Australian dollars/);
  assert.match(receiptPrompt('US', today), /Today is 2026-11-16/);
});

test('a receipt with nothing "worth tracking" ticks everything rather than nothing', () => {
  const scan = normalizeScan({ store: 'Hardware', items: [{ name: 'Extension cord', quantity: 1, unitPrice: 12, durable: false }] }, today);
  assert.equal(defaultSelection(scan).size, 1);
});

test('each line can be personal or work, and new items keep that', () => {
  const scan = normalizeScan(raw, today);
  assert.ok(scan.lines.every((l) => l.use === 'personal')); // the default
  const lines = scan.lines.map((l, i) => (i === 0 ? { ...l, use: 'work' as const } : l));
  const items = itemsFromScan({ ...scan, lines }, new Set(lines.slice(0, 2).map((l) => l.key)), { receiptUri: null, newId: () => 'x', today });
  assert.deepEqual(items.map((i) => [i.use, i.workPercent]), [['work', 100], ['personal', 100]]);
});
