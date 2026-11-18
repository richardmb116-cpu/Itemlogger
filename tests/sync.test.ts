/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { clearPushed, EMPTY_OUTBOX, mergeRemote, pendingRows, syncedSettings, type RemoteItemRow } from '../src/lib/sync-merge';
import type { Item } from '../src/lib/types';

function item(id: string, updatedAt: string, name = id): Item {
  return {
    id, name, model: '', category: 'electronics', price: 100, purchaseDate: '2026-01-01', store: '', serial: '',
    warrantyMonths: null, use: 'personal', workPercent: 100, effectiveLifeYears: null, room: null, paidWith: null, returnDays: null, condition: 'good',
    checkedPrice: null, sold: null, notes: '', photoUri: null, receiptUri: null, createdAt: updatedAt, updatedAt,
  };
}
const row = (it: Item | null, id: string, updated_at: string, deleted = false): RemoteItemRow => ({
  id, data: it, deleted, updated_at, synced_at: updated_at,
});

const T1 = '2026-11-01T10:00:00.000Z';
const T2 = '2026-11-02T10:00:00.000Z';
const T3 = '2026-11-03T10:00:00.000Z';

test('new items from another device are added at the front', () => {
  const r = mergeRemote([item('a', T1)], [row(item('b', T2), 'b', T2)], EMPTY_OUTBOX);
  assert.deepEqual(r.items.map((i) => i.id), ['b', 'a']);
  assert.equal(r.changed, true);
});

test('the most recent edit wins, either way round', () => {
  const remoteNewer = mergeRemote([item('a', T1, 'old')], [row(item('a', T2, 'new'), 'a', T2)], { ...EMPTY_OUTBOX, dirty: ['a'] });
  assert.equal(remoteNewer.items[0].name, 'new');
  assert.deepEqual(remoteNewer.outbox.dirty, []); // nothing left to push
  const localNewer = mergeRemote([item('a', T3, 'mine')], [row(item('a', T2, 'theirs'), 'a', T2)], { ...EMPTY_OUTBOX, dirty: ['a'] });
  assert.equal(localNewer.items[0].name, 'mine');
  assert.deepEqual(localNewer.outbox.dirty, ['a']); // still to push
  assert.equal(localNewer.changed, false);
});

test('deletions sync, unless the item was edited after the delete', () => {
  const gone = mergeRemote([item('a', T1)], [row(null, 'a', T2, true)], EMPTY_OUTBOX);
  assert.equal(gone.items.length, 0);
  const editedLater = mergeRemote([item('a', T3)], [row(null, 'a', T2, true)], EMPTY_OUTBOX);
  assert.equal(editedLater.items.length, 1);
  // Deleted here after their edit: stays deleted.
  const deletedHere = mergeRemote([], [row(item('a', T1), 'a', T1)], { ...EMPTY_OUTBOX, deleted: { a: T2 } });
  assert.equal(deletedHere.items.length, 0);
  // Edited there after our delete: comes back.
  const revived = mergeRemote([], [row(item('a', T3), 'a', T3)], { ...EMPTY_OUTBOX, deleted: { a: T2 } });
  assert.equal(revived.items.length, 1);
  assert.deepEqual(revived.outbox.deleted, {});
});

test('the outbox becomes rows to push, and clears only what was pushed unchanged', () => {
  const items = [item('a', T1), item('b', T2)];
  const outbox = { ...EMPTY_OUTBOX, dirty: ['a', 'b'], deleted: { c: T3 } };
  const rows = pendingRows(items, outbox);
  assert.deepEqual(rows.map((r) => [r.id, r.deleted]), [['a', false], ['b', false], ['c', true]]);
  // "b" was edited again while the push was in flight.
  const after = clearPushed(outbox, rows, [item('a', T1), item('b', T3)]);
  assert.deepEqual(after.dirty, ['b']);
  assert.deepEqual(after.deleted, {});
});

test('only account-wide settings sync', async () => {
  const { DEFAULT_REMINDER_DAYS } = await import('../src/lib/reminder-plan');
  const s = syncedSettings({
    onboarded: true, taxRegion: 'US', upgradeStyle: 'latest',
    depreciation: { auMethod: 'diminishing', auLowValuePool: false, usMethod: 'section179', showAdvanced: false },
    insurance: { insurer: 'X', policyNumber: '1', sumInsured: 5 }, remindersEnabled: true, reminderDays: DEFAULT_REMINDER_DAYS,
    birthdaysEnabled: true, remindersPromptDismissed: true, groupBy: 'none', activity: [], badges: {},
  });
  assert.equal('onboarded' in s, false);
  assert.equal('remindersEnabled' in s, false);
  assert.equal(s.upgradeStyle, 'latest');
});
