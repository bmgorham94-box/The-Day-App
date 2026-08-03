import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDay, fmtTime } from '../engine.js';
import { ANCHORS } from '../config.js';

const meetingOf = (iso) => buildDay(iso).find((b) => b.id === 'meeting');
const wakeOf = (iso) => buildDay(iso).find((b) => b.id === 'wake');

test('daily meeting appears Mon–Fri', () => {
  for (const iso of ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']) {
    assert.ok(meetingOf(iso), `meeting present on ${iso}`);
  }
});

test('daily meeting is absent on Sat + Sun', () => {
  assert.equal(meetingOf('2026-08-08'), undefined); // Sat
  assert.equal(meetingOf('2026-08-09'), undefined); // Sun
});

test('meeting runs 5:30a–6:00a', () => {
  const m = meetingOf('2026-08-03');
  assert.equal(fmtTime(m.start), '5:30a');
  assert.equal(fmtTime(m.end), '6:00a');
  assert.equal(m.sub, '5:30a–6:00a');
});

test('weekday wake is 4:30a; weekend wake unchanged at 6:30a', () => {
  assert.equal(fmtTime(wakeOf('2026-08-03').start), '4:30a'); // Mon
  assert.equal(fmtTime(wakeOf('2026-08-08').start), '6:30a'); // Sat
  assert.equal(ANCHORS.wakeWeekday, 4 * 60 + 30);
});
