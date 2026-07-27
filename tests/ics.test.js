import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildICS } from '../ics.js';

test('ics export is well-formed with alarms', () => {
  const ics = buildICS('2026-07-27'); // a Monday
  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.match(ics, /END:VCALENDAR$/);
  assert.ok(ics.includes('BEGIN:VALARM'));
  assert.ok(ics.includes('TRIGGER:-PT10M'));
  assert.ok(ics.includes('\r\n'), 'uses CRLF line endings');
});

test('ics contains a full week of events (meals + meeting every day)', () => {
  const ics = buildICS('2026-07-27');
  const events = (ics.match(/BEGIN:VEVENT/g) || []).length;
  // 7 meals + 1 meeting per day (+ rows/lifts) => at least 8*7 events.
  assert.ok(events >= 56, `expected >= 56 events, got ${events}`);
});

test('ics UIDs are deterministic across re-exports', () => {
  assert.equal(buildICS('2026-07-27'), buildICS('2026-07-27'));
});
