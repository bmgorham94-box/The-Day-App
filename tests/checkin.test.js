import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCheckinDay, dayDiff } from '../engine.js';

test('check-in true on the anchor 2026-07-26', () => {
  assert.equal(isCheckinDay('2026-07-26'), true);
});

test('check-in true every 14 days after the anchor', () => {
  assert.equal(isCheckinDay('2026-08-09'), true);  // +14
  assert.equal(isCheckinDay('2026-08-23'), true);  // +28
  assert.equal(isCheckinDay('2026-09-06'), true);  // +42
});

test('check-in true every 14 days before the anchor too', () => {
  assert.equal(isCheckinDay('2026-07-12'), true);  // -14
});

test('check-in false on non-cadence days', () => {
  assert.equal(isCheckinDay('2026-07-27'), false);
  assert.equal(isCheckinDay('2026-08-08'), false);
  assert.equal(isCheckinDay('2026-08-02'), false); // +7
});

test('dayDiff spans a DST boundary correctly', () => {
  // US DST began 2026-03-08; ensure whole-day math is not off-by-one.
  assert.equal(dayDiff('2026-03-01', '2026-03-15'), 14);
});
