/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cardExtension } from '../src/lib/cards';
import { buildListing } from '../src/lib/listing';
import { qualifyingBadges } from '../src/lib/progress';
import { normalizeScan } from '../src/lib/receipt';
import { planReminders } from '../src/lib/reminder-plan';
import { returnStatus } from '../src/lib/returns';
import type { Item } from '../src/lib/types';
import { warrantyStatus } from '../src/lib/warranty';

const today = new Date(2026, 10, 18);
function item(over: Partial<Item>): Item {
  return {
    id: 'x', name: 'TV', model: '', category: 'electronics', price: 1000, purchaseDate: '2026-01-10', store: 'Best Buy',
    serial: '', warrantyMonths: 12, use: 'personal', workPercent: 100, effectiveLifeYears: null, room: null, paidWith: null,
    returnDays: null, condition: 'good', checkedPrice: null, sold: null, notes: '', photoUri: null, receiptUri: null,
    createdAt: '', updatedAt: '', ...over,
  };
}

test('cards add a year only to warranties they cover', () => {
  assert.equal(cardExtension(item({ paidWith: 'visa-signature', warrantyMonths: 24 })), 12);
  assert.equal(cardExtension(item({ paidWith: 'visa-signature', warrantyMonths: 48 })), 0); // over 3 years
  assert.equal(cardExtension(item({ paidWith: 'amex', warrantyMonths: 48 })), 12); // Amex: up to 5 years
  assert.equal(cardExtension(item({ paidWith: 'amex', warrantyMonths: null })), 0); // nothing to extend
  assert.equal(cardExtension(item({})), 0);
});

test('the card year counts for the owner, not a buyer', () => {
  const tv = item({ paidWith: 'visa-signature' }); // 12-month warranty bought Jan 2026
  const mine = warrantyStatus(tv, today);
  assert.equal(mine.expires, '2028-01-10');
  assert.equal(mine.makerExpires, '2027-01-10');
  assert.equal(mine.cardMonths, 12);
  const listing = buildListing(tv, 500, 'US', today);
  assert.match(listing.body, /warranty until 10 January 2027|January 10, 2027/); // maker's date only
  assert.doesNotMatch(listing.body, /2028/);
});

test('return windows open, close soon, and close', () => {
  const bought = (date: string) => item({ purchaseDate: date, returnDays: 30 });
  assert.equal(returnStatus(bought('2026-11-10'), today).state, 'open'); // 22 days left
  const closing = returnStatus(bought('2026-10-22'), today);
  assert.deepEqual([closing.state, closing.daysLeft, closing.closes], ['closing', 3, '2026-11-21']);
  assert.equal(returnStatus(bought('2026-09-01'), today).state, 'closed');
  assert.equal(returnStatus(item({}), today).state, 'none');
  assert.equal(returnStatus({ ...bought('2026-11-10'), sold: { price: 1, date: '2026-11-12' } }, today).state, 'none');
});

test('reminders cover the return window and say when the card is paying', () => {
  const plan = planReminders([item({ purchaseDate: '2026-11-10', returnDays: 30, paidWith: 'amex', warrantyMonths: 12 })], [7], today);
  const ret = plan.find((p) => p.id.startsWith('return-'))!;
  assert.equal(ret.date.getDate(), 8); // two days before 10 December
  const warranty = plan.find((p) => p.id.startsWith('warranty-'))!;
  assert.match(warranty.body, /claim through the card/);
});

test('a printed return policy is read off the receipt', () => {
  assert.equal(normalizeScan({ returnDays: 30, items: [] }, today).returnDays, 30);
  assert.equal(normalizeScan({ returnDays: 'thirty', items: [] }, today).returnDays, null);
  assert.equal(normalizeScan({ returnDays: 9999, items: [] }, today).returnDays, null);
});

test('a card extension earns the Free extra year badge', () => {
  const ctx = { region: 'US' as const, style: 'balanced' as const, events: new Set<never>(), today };
  assert.ok(qualifyingBadges([item({ paidWith: 'amex' })], ctx).has('card-year'));
  assert.equal(qualifyingBadges([item({})], ctx).has('card-year'), false);
});
