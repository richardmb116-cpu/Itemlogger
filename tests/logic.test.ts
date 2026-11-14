/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { addMonths, parseISODate, toISODate } from '../src/lib/dates';
import { parsePrice } from '../src/lib/format';
import { taxYearFor } from '../src/lib/tax';
import { warrantyStatus } from '../src/lib/warranty';

test('Australian financial year runs 1 July – 30 June', () => {
  assert.equal(taxYearFor('2025-06-30', 'AU').label, 'FY 2024–25');
  assert.equal(taxYearFor('2025-07-01', 'AU').label, 'FY 2025–26');
  assert.equal(taxYearFor('2026-01-15', 'AU').endYear, 2026);
});

test('US tax year is the calendar year', () => {
  assert.equal(taxYearFor('2025-12-31', 'US').label, 'Tax year 2025');
  assert.equal(taxYearFor('2026-01-01', 'US').endYear, 2026);
});

test('addMonths clamps to month end', () => {
  assert.equal(toISODate(addMonths(parseISODate('2024-01-31'), 1)), '2024-02-29');
  assert.equal(toISODate(addMonths(parseISODate('2023-08-31'), 6)), '2024-02-29');
  assert.equal(toISODate(addMonths(parseISODate('2024-03-15'), 24)), '2026-03-15');
});

test('warranty states', () => {
  const today = parseISODate('2026-11-14');
  assert.equal(warrantyStatus({ purchaseDate: '2026-01-01', warrantyMonths: null }, today).state, 'none');
  assert.equal(warrantyStatus({ purchaseDate: '2026-01-01', warrantyMonths: 24 }, today).state, 'active');
  const soon = warrantyStatus({ purchaseDate: '2025-12-01', warrantyMonths: 12 }, today);
  assert.equal(soon.state, 'expiring');
  assert.equal(soon.daysLeft, 17);
  assert.equal(warrantyStatus({ purchaseDate: '2024-01-01', warrantyMonths: 12 }, today).state, 'expired');
  assert.equal(warrantyStatus({ purchaseDate: '2025-11-14', warrantyMonths: 12 }, today).label, 'Expires today');
});

test('parsePrice handles symbols and commas', () => {
  assert.equal(parsePrice('$1,299.95'), 1299.95);
  assert.equal(parsePrice('A$ 80'), 80);
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice('abc'), null);
});
