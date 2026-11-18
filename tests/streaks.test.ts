/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { groupByRoom } from '../src/lib/item-filter';
import { qualifyingBadges, roomQuests } from '../src/lib/progress';
import { isProgress, recordWeek, streak, weekKey } from '../src/lib/streaks';
import type { Item } from '../src/lib/types';

const wed = new Date(2026, 10, 18); // Wednesday 18 Nov 2026

let n = 0;
function item(over: Partial<Item>): Item {
  return {
    id: `i${n++}`, name: 'Thing', model: '', category: 'furniture', price: 100, purchaseDate: '2026-01-01', store: '',
    serial: '', warrantyMonths: null, use: 'personal', workPercent: 100, effectiveLifeYears: null, room: null, paidWith: null, returnDays: null,
    condition: 'good', checkedPrice: null, sold: null, notes: '', photoUri: null, receiptUri: null, createdAt: '', updatedAt: '', ...over,
  };
}

test('weeks start on Monday', () => {
  assert.equal(weekKey(wed), '2026-11-16');
  assert.equal(weekKey(new Date(2026, 10, 16)), '2026-11-16'); // Monday itself
  assert.equal(weekKey(new Date(2026, 10, 22)), '2026-11-16'); // Sunday
});

test('the streak counts back from this week, and this week not done yet does not break it', () => {
  const weeks = ['2026-10-26', '2026-11-02', '2026-11-09'];
  assert.deepEqual([streak(weeks, wed).current, streak(weeks, wed).thisWeek], [3, false]);
  assert.equal(streak([...weeks, '2026-11-16'], wed).current, 4);
  assert.equal(streak(['2026-10-26'], wed).current, 0); // a gap breaks it
  assert.equal(streak(['2026-09-07', '2026-09-14', '2026-09-21', '2026-10-26'], wed).best, 3);
  assert.deepEqual(streak(['2026-11-16'], wed, 3).recent, [false, false, true]);
});

test('recording a week is idempotent and kept in order', () => {
  const once = recordWeek([], wed);
  assert.deepEqual(once, ['2026-11-16']);
  assert.equal(recordWeek(once, wed), once);
});

test('only real improvements count toward the streak', () => {
  const a = item({});
  assert.equal(isProgress(undefined, a), true); // new item
  assert.equal(isProgress(a, { ...a, receiptUri: 'r' }), true);
  assert.equal(isProgress(a, { ...a, serial: 'S1' }), true);
  assert.equal(isProgress(a, { ...a, notes: 'tidied' }), false);
  assert.equal(isProgress({ ...a, receiptUri: 'r' }, { ...a, receiptUri: 'r2' }), false);
});

test('room quests and room grouping', () => {
  const full = { photoUri: 'p', receiptUri: 'r' };
  const kitchen = [1, 2, 3].map(() => item({ ...full, room: 'kitchen' }));
  const items = [...kitchen, item({ room: 'office' }), item({})];
  const quests = roomQuests(items);
  const k = quests.find((q) => q.room === 'kitchen')!;
  assert.deepEqual([k.count, k.score, k.done], [3, 100, true]);
  assert.equal(quests.find((q) => q.room === 'office')!.done, false);
  assert.ok(quests.findIndex((q) => q.count === 0) > quests.findIndex((q) => q.room === 'office')); // started first
  assert.deepEqual(groupByRoom(items).map((g) => [g.room, g.items.length]), [['kitchen', 3], ['office', 1], [null, 1]]);
  const badges = qualifyingBadges(items, { region: 'US', style: 'balanced', events: new Set(), today: wed, weeks: ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16'] });
  assert.ok(badges.has('room-done'));
  assert.ok(badges.has('streak-4'));
  assert.equal(badges.has('rooms-3'), false);
});
