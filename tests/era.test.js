import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEra, targetsFor, mealsFor } from '../engine.js';
import { MFF_START } from '../config.js';

test('era resolver returns Batch week on 2026-08-02 (the last Era A day)', () => {
  assert.equal(resolveEra('2026-08-02').id, 'batch');
});

test('era resolver returns MFF on 2026-08-03 (MFF_START)', () => {
  assert.equal(resolveEra('2026-08-03').id, 'mff');
});

test('MFF_START is the exact boundary', () => {
  assert.equal(MFF_START, '2026-08-03');
});

test('Phase 1 targets are drawn from the active meal era', () => {
  // 2026-08-02 is a Sunday → rest day, Era A.
  assert.deepEqual(targetsFor('2026-08-02', 'rest'), { kcal: 2439, p: 184, c: 265, f: 65, fiber: 42 });
  // 2026-08-03 is a Monday → training day, Era B.
  assert.deepEqual(targetsFor('2026-08-03', 'training'), { kcal: 2601, p: 208, c: 335, f: 47, fiber: 40 });
});

test('mealsFor returns the era-correct list for the date', () => {
  // Monday training. Era A breakfast is the oat bake; Era B is the Bison Breakfast.
  const monBefore = mealsFor('2026-07-27'); // Era A Monday (training)
  const monAfter = mealsFor('2026-08-03');  // Era B Monday (training)
  assert.ok(monBefore.some((m) => m.id === 'a-oatbake'));
  assert.ok(monAfter.some((m) => m.id === 't-bison'));
});
