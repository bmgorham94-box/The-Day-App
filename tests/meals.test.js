import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEALS } from '../config.js';
import { mealSum } from '../engine.js';

test('training meals sum to exactly 208P / 2601 kcal', () => {
  assert.deepEqual(mealSum(MEALS.training), { p: 208, kcal: 2601 });
});

test('rest meals sum to exactly 182P / 2273 kcal', () => {
  assert.deepEqual(mealSum(MEALS.rest), { p: 182, kcal: 2273 });
});

test('every meal carries non-negative protein + kcal (no invented negatives)', () => {
  for (const type of ['training', 'rest']) {
    for (const m of MEALS[type]) {
      assert.ok(m.p >= 0 && m.kcal >= 0, `${m.id} has valid macros`);
    }
  }
});
