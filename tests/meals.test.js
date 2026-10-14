import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealsFor, mealSum, targetsFor, dayType } from '../engine.js';

// Week of Mon 2026-10-12 .. Sun 2026-10-18 (plan live from Oct 14).
const MON = '2026-10-19', TUE = '2026-10-20', WED = '2026-10-21', THU = '2026-10-22',
  FRI = '2026-10-23', SAT = '2026-10-24', SUN = '2026-10-25';

test('training days are Monday through Saturday, Sunday rests', () => {
  for (const d of [MON, TUE, WED, THU, FRI, SAT]) assert.equal(dayType(d), 'training');
  assert.equal(dayType(SUN), 'rest');
});

test('Monday: BBQ Chicken Sando at noon, Marine Corps Mash at 6:30p, total 2,925', () => {
  const meals = mealsFor(MON);
  const lunch = meals.find((m) => m.id === 'm-lunch');
  const dinner = meals.find((m) => m.id === 'm-dinner');
  assert.equal(lunch.name, 'BBQ Chicken Sando');
  assert.equal(lunch.time, 12 * 60);
  assert.match(dinner.name, /Marine Corps Mash/);
  assert.equal(dinner.time, 18 * 60 + 30);
  assert.deepEqual(mealSum(meals), { kcal: 2925, p: 268, c: 317, f: 64 });
});

test('every training day totals near 2,900 using real rotation macros', () => {
  for (const d of [MON, TUE, WED, THU, FRI, SAT]) {
    const s = mealSum(mealsFor(d));
    assert.ok(s.kcal >= 2800 && s.kcal <= 2950, `${d} kcal ${s.kcal}`);
    assert.ok(s.p >= 260, `${d} protein ${s.p}`);
  }
});

test('rest day: wrap at 2:30p, no pre or post lift, snack pack only, about 2,450', () => {
  const meals = mealsFor(SUN);
  const ids = meals.map((m) => m.id);
  assert.ok(ids.includes('m-wrap'));
  assert.ok(!ids.includes('m-prelift'));
  assert.ok(!ids.includes('m-postlift'));
  const wrap = meals.find((m) => m.id === 'm-wrap');
  assert.equal(wrap.time, 14 * 60 + 30);
  assert.deepEqual({ kcal: wrap.kcal, p: wrap.p }, { kcal: 350, p: 37 });
  const snack = meals.find((m) => m.id === 'm-snack');
  assert.ok(!/froyo/i.test(snack.name), 'no froyo on rest day');
  const s = mealSum(meals);
  assert.ok(Math.abs(s.kcal - 2450) <= 60, `rest total ${s.kcal} is about 2,450`);
  assert.equal(meals.length, 6);
});

test('rotation: Sunday eats Lean Lemon Turkey and Moroccan Chicken', () => {
  const meals = mealsFor(SUN);
  assert.equal(meals.find((m) => m.id === 'm-lunch').name, 'Lean Lemon Turkey');
  assert.match(meals.find((m) => m.id === 'm-dinner').name, /Moroccan Chicken/);
});

test('training day snack is the pack plus froyo at the spec combined macros', () => {
  const snack = mealsFor(MON).find((m) => m.id === 'm-snack');
  assert.match(snack.name, /froyo/);
  assert.deepEqual({ kcal: snack.kcal, p: snack.p, c: snack.c, f: snack.f }, { kcal: 680, p: 55, c: 95, f: 8 });
});

test('weekend breakfast slides after the 6:30 wake; weekday at 5:30', () => {
  assert.equal(mealsFor(MON).find((m) => m.id === 'm-breakfast').time, 5 * 60 + 30);
  assert.equal(mealsFor(SUN).find((m) => m.id === 'm-breakfast').time, 6 * 60 + 45);
  assert.equal(mealsFor(SAT).find((m) => m.id === 'm-breakfast').time, 6 * 60 + 45);
});

test('targets equal the day meal sums, real macros, no tildes', () => {
  for (const d of [MON, SUN]) assert.deepEqual(targetsFor(d), mealSum(mealsFor(d)));
});
