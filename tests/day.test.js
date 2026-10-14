import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDay, fmtTime, sessionFor, isLegDay } from '../engine.js';

const MON = '2026-10-19', WED = '2026-10-21', SAT = '2026-10-24', SUN = '2026-10-25';
const find = (iso, id) => buildDay(iso).find((b) => b.id === id);

test('wake: 5:15a weekdays, 6:30a weekends', () => {
  assert.equal(fmtTime(find(MON, 'wake').start), '5:15a');
  assert.equal(fmtTime(find(SAT, 'wake').start), '6:30a');
  assert.equal(fmtTime(find(SUN, 'wake').start), '6:30a');
});

test('daily meeting 7:00a to 8:00a, weekdays only', () => {
  const m = find(MON, 'meeting');
  assert.equal(fmtTime(m.start), '7:00a');
  assert.equal(fmtTime(m.end), '8:00a');
  assert.equal(find(SAT, 'meeting'), undefined);
  assert.equal(find(SUN, 'meeting'), undefined);
});

test('dog walk 9:30 to 11:30, training window 2:00 to 3:00p', () => {
  assert.equal(fmtTime(find(MON, 'dogwalk').start), '9:30a');
  const lift = find(MON, 'lift');
  assert.equal(fmtTime(lift.start), '2:00p');
  assert.equal(fmtTime(lift.end), '3:00p');
});

test('lift block names the session and the location', () => {
  assert.match(find(MON, 'lift').title, /Back A at Home/);
  assert.match(find(WED, 'lift').title, /Lower A at LA Fitness/);
});

test('optional row block on training days only; Sunday has none', () => {
  assert.ok(find(MON, 'row'));
  assert.equal(find(SUN, 'row'), undefined);
  assert.equal(find(SUN, 'lift'), undefined);
});

test('Sunday carries the weekly order block', () => {
  assert.ok(find(SUN, 'order'));
  assert.equal(find(MON, 'order'), undefined);
});

test('every day has two rehab rounds and a posture block', () => {
  for (const d of [MON, WED, SUN]) {
    assert.ok(find(d, 'rehab1'));
    assert.ok(find(d, 'rehab2'));
    assert.ok(find(d, 'posture'));
  }
});

test('sessions: homes and gyms land on the right days', () => {
  assert.equal(sessionFor(MON).where, 'Home');
  assert.equal(sessionFor(WED).where, 'LA Fitness');
  assert.equal(sessionFor(SAT).where, 'LA Fitness');
  assert.ok(isLegDay(WED) && isLegDay(SAT) && !isLegDay(MON));
});

test('leg day lift block carries the reintroduction phase label in phase window', () => {
  assert.match(find('2026-10-21', 'lift').phaseLabel, /phase 1/i);   // Oct 21, phase 1
  assert.equal(find('2026-11-18', 'lift').phaseLabel, null);          // after Nov 11
});
