/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ageOf, isBirthdayToday, nextBirthday, ordinal } from '../src/lib/birthdays';

const today = new Date(2026, 10, 14); // 14 Nov 2026

test('age labels', () => {
  assert.equal(ageOf('2026-11-14', today).label, 'New today');
  assert.equal(ageOf('2026-11-01', today).label, '13 days old');
  assert.equal(ageOf('2026-07-12', today).label, '4 months old');
  assert.equal(ageOf('2025-11-14', today).label, '1 year old');
  assert.equal(ageOf('2024-07-20', today).label, '2 yr 3 mo old');
  assert.equal(ageOf('2025-11-15', today).label, '11 months old'); // not quite a year
});

test('next birthday and what it turns', () => {
  assert.deepEqual(nextBirthday('2025-11-14', today), { date: '2026-11-14', turning: 1, daysUntil: 0 });
  assert.deepEqual(nextBirthday('2024-11-20', today), { date: '2026-11-20', turning: 2, daysUntil: 6 });
  assert.deepEqual(nextBirthday('2024-03-01', today), { date: '2027-03-01', turning: 3, daysUntil: 107 });
  // Bought this year: first birthday is next year.
  assert.deepEqual(nextBirthday('2026-07-12', today), { date: '2027-07-12', turning: 1, daysUntil: 240 });
  // Bought today: first birthday a year from now, not today.
  assert.equal(nextBirthday('2026-11-14', today).turning, 1);
  assert.equal(nextBirthday('2026-11-14', today).daysUntil, 365);
});

test('leap-day purchases celebrate on 28 Feb in other years', () => {
  assert.equal(nextBirthday('2024-02-29', today).date, '2027-02-28');
  assert.equal(nextBirthday('2024-02-29', new Date(2027, 2, 1)).date, '2028-02-29');
});

test('birthday today and ordinals', () => {
  assert.equal(isBirthdayToday({ purchaseDate: '2025-11-14' }, today), true);
  assert.equal(isBirthdayToday({ purchaseDate: '2026-11-14' }, today), false);
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal), [
    '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st',
  ]);
});
