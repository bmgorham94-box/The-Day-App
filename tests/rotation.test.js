import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// localStorage shim (same pattern as store.test.js)
class LS {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
globalThis.localStorage = globalThis.localStorage || new LS();

const { Store } = await import('../store.js');
const { engineFor, engineCycleInfo, engineShuffleOptions, addDaysISO } = await import('../engine.js');
const { ENGINES } = await import('../config.js');

beforeEach(() => Store.reset());

const WED0 = '2026-08-05'; // a Wednesday
const SAT0 = '2026-08-08'; // a Saturday

function simulate(startISO, weeks) {
  const seen = [];
  for (let w = 0; w < weeks; w++) {
    const iso = addDaysISO(startISO, w * 7);
    const eng = engineFor(iso, Store.engineState());
    seen.push(eng.id);
    Store.saveScore(iso, eng, 'done', '');
  }
  return seen;
}

test('8 simulated Wednesdays hit all 8 wed engines with no repeat', () => {
  const seen = simulate(WED0, 8);
  assert.equal(new Set(seen).size, 8);
  assert.ok(seen.every((id) => id.startsWith('wed-')));
});

test('8 simulated Saturdays hit all 8 sat engines with no repeat', () => {
  const seen = simulate(SAT0, 8);
  assert.equal(new Set(seen).size, 8);
  assert.ok(seen.every((id) => id.startsWith('sat-')));
});

test('week 9 starts a fresh cycle (loop closes, then repeats)', () => {
  const seen = simulate(WED0, 9);
  assert.equal(seen[8], seen[0]);
});

test('shuffle swaps to an unused engine and rotation stays honest', () => {
  // Complete two engines, then shuffle the third Wednesday.
  simulate(WED0, 2);
  const iso = addDaysISO(WED0, 14);
  const before = engineFor(iso, Store.engineState());
  const opts = engineShuffleOptions(iso, Store.engineState());
  assert.ok(opts.length > 0);
  assert.ok(!opts.some((e) => e.id === before.id), 'shuffle options exclude the current engine');
  const pick = opts[0];
  Store.engineSwap(iso, pick.id);
  const after = engineFor(iso, Store.engineState());
  assert.equal(after.id, pick.id);
  // Completing the swapped engine consumes IT, and the full cycle still
  // reaches all 8 distinct engines: 2 + 1 (swapped) + 5 = 8, then reset.
  Store.saveScore(iso, after, 'done', '');
  simulate(addDaysISO(WED0, 21), 5);
  assert.equal(Store.engineState().used.wed.length, 0, 'cycle reset after all 8');
  const doneIds = Object.values(Store.engineState().done);
  assert.equal(new Set(doneIds).size, 8, 'all 8 distinct engines were done across the cycle');
});

test('past days keep showing the engine that was actually done', () => {
  const eng = engineFor(WED0, Store.engineState());
  Store.saveScore(WED0, eng, '5 + 12', '');
  // even after later completions change the cycle, the past day is pinned
  simulate(addDaysISO(WED0, 7), 3);
  assert.equal(engineFor(WED0, Store.engineState()).id, eng.id);
});

test('engine cycle caption reports position and a real next engine', () => {
  simulate(WED0, 3);
  const iso = addDaysISO(WED0, 21);
  const info = engineCycleInfo(iso, Store.engineState());
  assert.equal(info.pos, 4);
  assert.equal(info.of, 8);
  assert.ok(ENGINES.some((e) => e.id === info.next.id));
});
