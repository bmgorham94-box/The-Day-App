import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAM, PRIMER, FREQ_NOTE } from '../config.js';

// The displayed frequency line must match what is actually programmed —
// count it in the data, don't trust the label.

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const daysWhere = (pred) => days.filter((d) => PROGRAM[d].exercises.some(pred)).length;
const name = (re) => (ex) => re.test(ex.name);

test('chest 2× — pressing/fly days', () => {
  assert.equal(daysWhere(name(/press|fly|push-up/i)), 4); // raw match includes delt days
  assert.equal(daysWhere(name(/incline .*press|bench press|cable fly|push-up/i)), 2); // Mon + Fri
});

test('lats 2× — pulldown/pullover/pull-up days', () => {
  assert.equal(daysWhere(name(/pulldown|pullover|pull-up/i)), 2); // Tue + Fri
});

test('side delts 2× — lateral raise days', () => {
  assert.equal(daysWhere(name(/lateral raise/i)), 2); // Thu + Fri
});

test('rear delts 3× — rear-delt/face-pull days', () => {
  assert.equal(daysWhere(name(/rear-delt|face pull/i)), 3); // Tue + Thu + Fri
});

test('arms 2× — curl days', () => {
  assert.equal(daysWhere(name(/\bcurl\b/i)), 4); // includes nordic + wrist curls
  assert.equal(daysWhere(name(/ez-bar curl|hammer curl|incline db curl|reverse ez curl/i)), 2); // Tue + Fri
});

test('glutes 2× — hip thrust / pull-through / lunge days', () => {
  assert.equal(daysWhere(name(/hip thrust|pull-through|lunge|step-up/i)), 2); // Wed + Sat
});

test('hamstrings 2× knee-flexion — Nordic curl days', () => {
  assert.equal(daysWhere(name(/nordic/i)), 2); // Wed + Sat
});

test('calves 2× — calf raise days', () => {
  assert.equal(daysWhere(name(/calf raise/i)), 2); // Wed standing + Sat seated
});

test('adductors 2× — Copenhagen plank runs in both leg-day primers', () => {
  const cop = PRIMER.steps.find((s) => typeof s === 'object' && /copenhagen/i.test(s.name));
  assert.ok(cop, 'Copenhagen plank present in the shared leg-day primer');
  const legDays = days.filter((d) => PROGRAM[d].kind === 'legs').length;
  assert.equal(legDays, 2);
});

test('core 3× — CORE-tagged days (Mon, Thu, Sat)', () => {
  const coreDays = days.filter((d) => PROGRAM[d].exercises.some((e) => (e.tags || []).includes('CORE')));
  assert.deepEqual(coreDays, ['mon', 'thu', 'sat']);
});

test('vacuums are programmed Mon + Thu', () => {
  assert.ok(PROGRAM.mon.exercises.some(name(/stomach vacuum/i)));
  assert.ok(PROGRAM.thu.exercises.some(name(/stomach vacuum/i)));
});

test('the FREQ_NOTE string carries every audited claim', () => {
  for (const claim of ['Chest 2×', 'Lats 2×', 'Side delts 2×', 'Rear delts 3×', 'Arms 2×',
    'Glutes 2×', 'Hamstrings 2×', 'Calves 2×', 'Adductors 2×', 'Core 3×', 'daily vacuums', 'Quads maintenance']) {
    assert.ok(FREQ_NOTE.includes(claim), `FREQ_NOTE missing "${claim}"`);
  }
});

test('history-preserving ids: unchanged exercises keep their ids', () => {
  const ids = Object.values(PROGRAM).flatMap((d) => d.exercises.map((e) => e.id));
  // spot-check pre-patch ids that carried logged history
  for (const id of ['mon-1', 'tue-1', 'tue-8', 'wed-1', 'thu-4', 'fri-5', 'sat-3', 'sat-4']) {
    assert.ok(ids.includes(id), `${id} missing — set history would orphan`);
  }
  assert.equal(new Set(ids).size, ids.length, 'ids unique');
});
