import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePhase, isCheckinDay, targetsFor } from '../engine.js';

test('phase resolver — Recomp on 2026-09-30', () => {
  assert.equal(resolvePhase('2026-09-30').id, 'recomp');
});

test('phase resolver — Build on 2026-10-01', () => {
  assert.equal(resolvePhase('2026-10-01').id, 'build');
});

test('phase resolver — Reveal on 2027-03-15', () => {
  assert.equal(resolvePhase('2027-03-15').id, 'reveal');
});

test('phase resolver — still Build the day before Reveal', () => {
  assert.equal(resolvePhase('2027-03-14').id, 'build');
});

test('Recomp macro targets are exact and complete', () => {
  assert.deepEqual(targetsFor('2026-09-30', 'training'), { kcal: 2601, p: 208, c: 335, f: 47, fiber: 40 });
  assert.deepEqual(targetsFor('2026-09-30', 'rest'), { kcal: 2273, p: 182, c: 253, f: 53, fiber: 33 });
});

test('Build/Reveal splits stay TBD — never invented', () => {
  assert.equal(targetsFor('2026-10-01', 'training').p, null);
  assert.equal(targetsFor('2026-10-01', 'training').kcal, 3200);
  assert.equal(targetsFor('2027-03-15', 'training').p, 230);
  assert.equal(targetsFor('2027-03-15', 'training').c, null);
});
