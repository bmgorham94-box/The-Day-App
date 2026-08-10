import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SESSIONS } from '../config.js';

// Hard constraint: no dumbbells exist in the home gym — no session may render a
// "DB" or "dumbbell" movement anywhere.
const BANNED = /\bDB\b|dumbbell/i;

test('no session contains a dumbbell movement', () => {
  for (const [key, session] of Object.entries(SESSIONS)) {
    for (const ex of session.exercises) {
      assert.ok(!BANNED.test(ex), `${key} has a banned dumbbell movement: "${ex}"`);
    }
  }
});

test('the four rebuilt lifts use the equipment-correct variants', () => {
  const all = Object.values(SESSIONS).flatMap((s) => s.exercises).join('\n');
  assert.match(all, /Chest-Supported Cable Row/);
  assert.match(all, /Flat Barbell Press/);
  assert.match(all, /Plate Step-Up/);
  assert.match(all, /Incline Cable Press/);
});
