import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAM, ENGINES, REHAB, PRIMER } from '../config.js';

// Equipment (authoritative): rack, barbell+plates, bench, Athena cable,
// landmine, pull-up bar, 125lb adjustable DB pair, vest, Echo rower, mats.
// Banned gear + banned-by-space movements (low ceiling, single footprint):
const BANNED = [
  /kettlebell|\bKB\b/i, /\bband\b|bands/i, /\bbox\b/i, /sled/i, /machine/i,
  /jump rope|double.under/i, /wall ball/i, /\brun\b|running/i, /burpee/i,
  /box jump|jumping|broad jump/i, /walking lunge|carry\b/i,
  // overhead BARBELL work (seated DB overhead press is allowed):
  /barbell (push )?press|overhead press(?!.*DB)|push press|thruster|snatch|jerk|overhead squat/i,
];

function allMovementText() {
  const out = [];
  for (const day of Object.values(PROGRAM)) for (const ex of day.exercises) out.push(ex.name + ' ' + ex.cue);
  for (const e of ENGINES) {
    for (const [, text] of e.blocks) out.push(text);
    if (e.flareSwap) out.push(e.flareSwap);
  }
  for (const m of REHAB.moves) out.push(m.name);
  for (const s of PRIMER.steps) out.push(typeof s === 'string' ? s : `${s.name} ${s.cue || ''}`);
  return out;
}

test('no programmed movement uses banned equipment or banned patterns', () => {
  for (const text of allMovementText()) {
    for (const re of BANNED) {
      assert.ok(!re.test(text), `banned pattern ${re} matched: "${text}"`);
    }
  }
});

test('seated DB overhead pressing is present (allowed), barbell overhead is not', () => {
  const all = Object.values(PROGRAM).flatMap((d) => d.exercises.map((e) => e.name)).join('\n');
  assert.match(all, /Seated DB Shoulder Press/);
  assert.doesNotMatch(all, /Barbell.*Overhead|Overhead.*Barbell/i);
});

test('every engine is overhead-free and jump-free by construction', () => {
  for (const e of ENGINES) {
    const text = e.blocks.map((b) => b[1]).join(' ');
    assert.ok(!/overhead|jump|wall ball/i.test(text), `${e.id} contains a banned movement`);
  }
});

test('unilateral left-first tagging exists where the program demands it', () => {
  const tagged = Object.values(PROGRAM).flatMap((d) => d.exercises).filter((e) => (e.tags || []).includes('LEFT FIRST'));
  assert.ok(tagged.length >= 6, `expected ≥6 LEFT FIRST movements, got ${tagged.length}`);
});
