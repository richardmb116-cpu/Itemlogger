/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildClaimHtml, coverageCheck, escapeHtml, summarize } from '../src/lib/claim-pack';
import type { Item, Settings } from '../src/lib/types';

const today = new Date(2026, 10, 14);

function item(over: Partial<Item>): Item {
  return {
    id: 'a', name: 'Laptop', model: 'Acme 14', category: 'electronics', price: 2000, purchaseDate: '2026-01-10',
    store: 'Shop', serial: 'SN-1', warrantyMonths: 12, use: 'personal', workPercent: 100, effectiveLifeYears: null, condition: 'good', checkedPrice: null,
    sold: null, notes: '', photoUri: 'file://p.jpg', receiptUri: 'file://r.jpg', createdAt: '', updatedAt: '', ...over,
  };
}

const settings: Settings = {
  taxRegion: 'AU',
  depreciation: { auMethod: 'diminishing', auLowValuePool: false, usMethod: 'section179' },
  insurance: { insurer: 'Acme Insurance', policyNumber: 'HC-123', sumInsured: 2500 },
  remindersEnabled: false,
  reminderDays: [30, 7],
  remindersPromptDismissed: false,
};

test('summary totals and gap warnings', () => {
  const s = summarize(
    [item({}), item({ id: 'b', price: 800, serial: '', receiptUri: null, photoUri: null }), item({ id: 'c', price: null })],
    today,
  );
  assert.equal(s.count, 3);
  assert.equal(s.paid, 2800);
  assert.equal(s.withReceipt, 2);
  assert.deepEqual(s.warnings, [
    '1 item has no purchase price.',
    '1 item has no receipt photo.',
    '1 item has no photo of the item.',
    '1 item over $500 has no serial number.',
  ]);
});

test('coverage check against sum insured', () => {
  assert.deepEqual(coverageCheck(3000, 2500), { state: 'under', gap: 500 });
  assert.deepEqual(coverageCheck(2000, 2500), { state: 'ok', spare: 500 });
  assert.deepEqual(coverageCheck(2000, null), { state: 'unknown' });
});

test('html escapes user text and includes policy, incident, images', () => {
  const html = buildClaimHtml(
    [item({ name: 'Tom & Jerry <b>TV</b>' })],
    { includePhotos: true, includeReceipts: false, incident: { date: '2026-11-03', description: 'Break-in' } },
    settings,
    { a: { photo: 'data:image/jpeg;base64,AAA', receipt: 'data:image/jpeg;base64,BBB' } },
    today,
  );
  assert.match(html, /Tom &amp; Jerry &lt;b&gt;TV&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>TV<\/b>/);
  assert.match(html, /Insurance claim/);
  assert.match(html, /Date of loss:<\/b> 3 November 2026/);
  assert.match(html, /HC-123/);
  assert.match(html, /base64,AAA/); // photo included
  assert.doesNotMatch(html, /base64,BBB/); // receipts switched off
  assert.match(html, /size: A4/);
});

test('without incident details it is a contents inventory, US letter for US', () => {
  const html = buildClaimHtml([item({})], { includePhotos: false, includeReceipts: false, incident: null }, { ...settings, taxRegion: 'US' }, {}, today);
  assert.match(html, /<h1>Contents inventory<\/h1>/);
  assert.match(html, /size: letter/);
  assert.equal(escapeHtml(`"x'`), '&quot;x&#39;');
});
