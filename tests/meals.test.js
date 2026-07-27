import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEAL_ERAS } from '../config.js';
import { mealSum } from '../engine.js';

const eraById = (id) => MEAL_ERAS.find((e) => e.id === id);

test('Era A (Batch week) training meals sum to exactly 210P / 2767 kcal', () => {
  assert.deepEqual(mealSum(eraById('batch').meals.training), { p: 210, kcal: 2767 });
});

test('Era A (Batch week) rest meals sum to exactly 184P / 2439 kcal', () => {
  assert.deepEqual(mealSum(eraById('batch').meals.rest), { p: 184, kcal: 2439 });
});

test('Era B (MFF) training meals sum to exactly 208P / 2601 kcal', () => {
  assert.deepEqual(mealSum(eraById('mff').meals.training), { p: 208, kcal: 2601 });
});

test('Era B (MFF) rest meals sum to exactly 182P / 2273 kcal', () => {
  assert.deepEqual(mealSum(eraById('mff').meals.rest), { p: 182, kcal: 2273 });
});

test('every meal in every era carries non-negative protein + kcal', () => {
  for (const era of MEAL_ERAS) {
    for (const type of ['training', 'rest']) {
      for (const m of era.meals[type]) {
        assert.ok(m.p >= 0 && m.kcal >= 0, `${era.id}/${m.id} has valid macros`);
      }
    }
  }
});

test('meal ids are unique within each era/day-type list', () => {
  for (const era of MEAL_ERAS) {
    for (const type of ['training', 'rest']) {
      const ids = era.meals[type].map((m) => m.id);
      assert.equal(new Set(ids).size, ids.length, `${era.id}/${type} ids unique`);
    }
  }
});
