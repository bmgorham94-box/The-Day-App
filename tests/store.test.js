import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage shim so store.js runs under Node.
class LS {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
globalThis.localStorage = new LS();

const { Store } = await import('../store.js');

beforeEach(() => Store.reset());

test('day rollover resets checks — a new date starts clean', () => {
  Store.toggleCheck('2026-07-27', 't-bison');
  assert.equal(Store.isChecked('2026-07-27', 't-bison'), true);
  // Next calendar day has no carried-over checks.
  assert.equal(Store.isChecked('2026-07-28', 't-bison'), false);
  assert.deepEqual(Store.checksFor('2026-07-28'), {});
});

test('toggle is idempotent on/off with undo semantics', () => {
  assert.equal(Store.toggleCheck('2026-07-27', 't-mash'), true);
  assert.equal(Store.toggleCheck('2026-07-27', 't-mash'), false);
  assert.equal(Store.isChecked('2026-07-27', 't-mash'), false);
});

test('checks older than 30 days are pruned on write', () => {
  Store.toggleCheck('2026-01-01', 't-bison');       // ancient
  Store.toggleCheck('2026-07-27', 't-bison');       // today -> triggers prune
  assert.equal(Store.isChecked('2026-01-01', 't-bison'), false);
  assert.equal(Store.isChecked('2026-07-27', 't-bison'), true);
});

test('weight log persists and clears', () => {
  Store.setWeight('2026-07-27', 197.4);
  assert.equal(Store.weightLog()['2026-07-27'], 197.4);
  Store.setWeight('2026-07-27', '');
  assert.equal(Store.weightLog()['2026-07-27'], undefined);
});

test('export/import round-trips all state', () => {
  Store.toggleCheck('2026-07-27', 't-bison');
  Store.setWeight('2026-07-27', 197);
  const dump = Store.export();
  Store.reset();
  Store.import(dump);
  assert.equal(Store.isChecked('2026-07-27', 't-bison'), true);
  assert.equal(Store.weightLog()['2026-07-27'], 197);
});
