/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MAX_SCHEDULED, planBirthdays, planNotifications, planReminders, reminderSummary } from '../src/lib/reminder-plan';
import type { Item } from '../src/lib/types';

const now = new Date(2026, 10, 14, 12, 0); // 14 Nov 2026, noon local

function item(id: string, purchaseDate: string, warrantyMonths: number | null): Item {
  return {
    id, name: `Item ${id}`, model: '', checkedPrice: null, workPercent: 100, effectiveLifeYears: null, room: null, paidWith: null, returnDays: null, category: 'other', price: 100, purchaseDate, store: '', serial: '',
    warrantyMonths, use: 'personal', condition: 'good', sold: null, notes: '', photoUri: null, receiptUri: null, createdAt: '', updatedAt: '',
  };
}

test('schedules 30-day and 7-day reminders at 9am local', () => {
  // Bought 1 Jun 2025 with 2 yr warranty → ends 1 Jun 2027.
  const plan = planReminders([item('a', '2025-06-01', 24)], [30, 7], now);
  assert.equal(plan.length, 2);
  assert.deepEqual(plan.map((p) => p.date.toString()), [
    new Date(2027, 4, 2, 9).toString(), // 30 days before 1 Jun = 2 May
    new Date(2027, 4, 25, 9).toString(), // 7 days before = 25 May
  ]);
  assert.equal(plan[0].id, 'warranty-a-30');
  assert.equal(plan[0].itemId, 'a');
  assert.match(plan[1].title, /ends in a week/);
});

test('skips reminders already in the past, keeps upcoming ones', () => {
  // Ends 1 Dec 2026: 30-day reminder (1 Nov) has passed, 7-day (24 Nov) and on-the-day remain.
  const plan = planReminders([item('b', '2025-12-01', 12)], [30, 7, 0], now);
  assert.deepEqual(plan.map((p) => p.id), ['warranty-b-7', 'warranty-b-0']);
  assert.match(plan[1].title, /ends today/);
});

test('ignores items with no warranty or an expired one', () => {
  const plan = planReminders([item('c', '2026-01-01', null), item('d', '2020-01-01', 12)], [30, 7], now);
  assert.equal(plan.length, 0);
});

test('sold items get no reminders', () => {
  const sold = { ...item('s', '2025-06-01', 24), sold: { price: 500, date: '2026-10-01' } };
  assert.equal(planReminders([sold], [30, 7], now).length, 0);
});

test('caps at the iOS pending-notification limit, soonest first', () => {
  const many = Array.from({ length: 50 }, (_, i) => item(`m${i}`, `2026-0${(i % 9) + 1}-15`, 24));
  const plan = planReminders(many, [30, 7], now);
  assert.equal(plan.length, MAX_SCHEDULED);
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i].date >= plan[i - 1].date);
});

test('summary text', () => {
  assert.equal(reminderSummary([30, 7]), '30 days and 1 week before');
  assert.equal(reminderSummary([7]), '1 week before');
  assert.equal(reminderSummary([0]), 'On the day it ends');
  assert.equal(reminderSummary([30, 7, 0]), '30 days and 1 week before, and on the day');
  assert.equal(reminderSummary([]), 'No reminders');
});

test('birthday notifications: next anniversary at 9am with value, skipping today if 9am passed', () => {
  // now = 14 Nov 2026, noon. Bought 14 Nov 2025: today's 9am has passed, so next is its 2nd birthday.
  const [b] = planBirthdays([item('b1', '2025-11-14', 12)], 'US', now);
  assert.equal(b.id, 'birthday-b1-2');
  assert.equal(b.date.toString(), new Date(2027, 10, 14, 9).toString());
  assert.match(b.title, /^Happy 2nd birthday, Item b1$/);
  assert.match(b.body, /worth about \$\d+ now, down \d+% from what you paid/);
  const [c] = planBirthdays([item('c1', '2024-12-01', null)], 'US', now);
  assert.equal(c.id, 'birthday-c1-2');
  assert.equal(c.date.toString(), new Date(2026, 11, 1, 9).toString());
});

test('combined plan puts warranties first and respects the limit', () => {
  const many = Array.from({ length: 40 }, (_, i) => item(`w${i}`, `2026-0${(i % 9) + 1}-15`, 24));
  const plan = planNotifications(many, { warranties: true, leadDays: [30, 7], birthdays: true, region: 'US' }, now);
  assert.equal(plan.length, MAX_SCHEDULED);
  assert.ok(plan.slice(0, 60).every((p) => p.id.startsWith('warranty-')));
  const only = planNotifications(many.slice(0, 2), { warranties: false, leadDays: [30], birthdays: true, region: 'US' }, now);
  assert.ok(only.length === 2 && only.every((p) => p.id.startsWith('birthday-')));
});
