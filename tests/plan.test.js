import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN, REHAB } from '../config.js';
import {
  reintroPhase, reintroBanActive, setsForPhase, isCheckinDay, isFirstSaturday,
  bfGateTripped, latestBodyFat,
} from '../engine.js';

// ── Reintroduction phase (legs) ──
test('phase 1 runs October 14 to 27, 2026 and renders 2 sets', () => {
  for (const d of ['2026-10-14', '2026-10-21', '2026-10-27']) {
    const p = reintroPhase(d);
    assert.equal(p.n, 1, d);
    assert.equal(setsForPhase('3 × 10 to 12', p), '2 × 10 to 12');
    assert.equal(setsForPhase('4 × 12 to 15', p), '2 × 12 to 15');
    assert.equal(setsForPhase('2 × 10 each side', p), '2 × 10 each side');
  }
});

test('phase 2 runs October 28 to November 10 with listed sets', () => {
  for (const d of ['2026-10-28', '2026-11-10']) {
    const p = reintroPhase(d);
    assert.equal(p.n, 2, d);
    assert.equal(setsForPhase('3 × 10 to 12', p), '3 × 10 to 12');
  }
});

test('from November 11 there is no phase label', () => {
  assert.equal(reintroPhase('2026-11-11'), null);
  assert.equal(reintroPhase('2027-03-01'), null);
});

test('RDL and loaded back extension ban holds before November 14, 2026', () => {
  assert.equal(reintroBanActive('2026-11-13'), true);
  assert.equal(reintroBanActive('2026-11-14'), false);
});

// ── Check ins: every 14 days starting October 18, 2026 ──
test('check in on October 18 and every 14 days after', () => {
  assert.equal(isCheckinDay('2026-10-18'), true);
  assert.equal(isCheckinDay('2026-11-01'), true);
  assert.equal(isCheckinDay('2026-11-15'), true);
  assert.equal(isCheckinDay('2026-10-25'), false);
  assert.equal(isCheckinDay('2026-10-04'), false); // before the anchor
});

// ── Monthly: first Saturday ──
test('first Saturday of the month detects correctly', () => {
  assert.equal(isFirstSaturday('2026-11-07'), true);
  assert.equal(isFirstSaturday('2026-12-05'), true);
  assert.equal(isFirstSaturday('2026-11-14'), false); // second Saturday
  assert.equal(isFirstSaturday('2026-11-06'), false); // a Friday
});

// ── Body fat gate ──
test('gate trips at 17 percent or higher, latest reading wins', () => {
  assert.equal(bfGateTripped({ '2026-10-04': 15 }), false);
  assert.equal(bfGateTripped({ '2026-10-04': 15, '2026-11-07': 17 }), true);
  assert.equal(bfGateTripped({ '2026-11-07': 17, '2026-12-05': 16.2 }), false);
  assert.equal(latestBodyFat({}), null);
});

test('seed values match the spec: October 4, 2026, 176.0 lb, 15 percent', () => {
  assert.deepEqual(PLAN.tracking.seed, { iso: '2026-10-04', lb: 176.0, bf: 15 });
});

// ── Copy rules: no em or en dashes anywhere in UI strings ──
function allStrings(obj, out = [], keyName = '') {
  if (typeof obj === 'string') { if (keyName !== 'id') out.push(obj); return out; }
  if (Array.isArray(obj)) { for (const v of obj) allStrings(v, out, keyName); return out; }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) allStrings(v, out, k);
  }
  return out;
}
test('no em dashes or en dashes in any plan or rehab copy', () => {
  for (const s of [...allStrings(PLAN), ...allStrings(REHAB)]) {
    assert.ok(!/[—–]/.test(s), `dash found in: "${s}"`);
  }
});
