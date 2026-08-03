// The Day — pure date/phase/day logic. No DOM. Imported by app + tests.
import {
  hm, fmtTime, isWeekend, mealTime,
  PHASES, CHECKIN_ANCHOR, CHECKIN_INTERVAL_DAYS,
  MEAL_ERAS, ROW, SESSIONS, PREP_STEPS, WEEK, ANCHORS,
} from './config.js';

// ── Date helpers (calendar-date safe — no timezone drift) ────────────────────
// ISO date string "YYYY-MM-DD" for a Date, in LOCAL time.
export function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// Parse "YYYY-MM-DD" to a UTC-noon Date (stable for day-diff math).
export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}
// Whole-day difference b - a (both ISO strings), calendar-accurate.
export function dayDiff(aISO, bISO) {
  const MS = 86400000;
  return Math.round((parseISO(bISO) - parseISO(aISO)) / MS);
}
// Day-of-week 0..6 for an ISO date.
export function dowOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// ── Phase resolver ───────────────────────────────────────────────────────────
// Returns the phase whose [start, end) window contains the date.
export function resolvePhase(iso) {
  for (const p of PHASES) {
    if (iso >= p.start && iso < p.end) return p;
  }
  // Before first / after last: clamp to nearest edge phase.
  if (iso < PHASES[0].start) return PHASES[0];
  return PHASES[PHASES.length - 1];
}

// ── Meal-era resolver ────────────────────────────────────────────────────────
// Returns the meal era whose [start, end) window contains the date.
export function resolveEra(iso) {
  for (const e of MEAL_ERAS) {
    if (iso >= e.start && iso < e.end) return e;
  }
  if (iso < MEAL_ERAS[0].start) return MEAL_ERAS[0];
  return MEAL_ERAS[MEAL_ERAS.length - 1];
}

// Targets for a given date + day type ('training' | 'rest').
// Phase 1 (Recomp) draws targets from the active meal era; later phases carry
// their own kcal anchors (with intentionally-TBD splits).
export function targetsFor(iso, type) {
  const phase = resolvePhase(iso);
  if (phase.useEraTargets) return resolveEra(iso).targets[type];
  return phase.targets[type];
}

// ── Check-in predicate: every 14 days anchored to CHECKIN_ANCHOR ─────────────
export function isCheckinDay(iso) {
  const diff = dayDiff(CHECKIN_ANCHOR, iso);
  return diff % CHECKIN_INTERVAL_DAYS === 0;
}

// ── Meal helpers ─────────────────────────────────────────────────────────────
export function mealsFor(iso) {
  const day = WEEK[dowOf(iso)];
  return resolveEra(iso).meals[day.type];
}
export function mealSum(list) {
  return list.reduce((a, m) => ({ p: a.p + m.p, kcal: a.kcal + m.kcal }), { p: 0, kcal: 0 });
}

// ── Day builder: ordered spine blocks for a date ─────────────────────────────
// shiftMins: "running late" offset applied to pre-lift/lift/post blocks only.
export function buildDay(iso, shiftMins = 0) {
  const dow = dowOf(iso);
  const day = WEEK[dow];
  const wknd = isWeekend(dow);
  const blocks = [];

  // Wake
  blocks.push({
    kind: 'anchor', tone: 'work', id: 'wake',
    start: wknd ? ANCHORS.wakeWeekend : ANCHORS.wakeWeekday,
    title: 'Wake', sub: wknd ? 'weekend' : '',
  });

  // Morning row (if before work) — carries hydration note.
  if (day.row && day.row.morning) {
    blocks.push({
      kind: 'row', tone: 'row', id: 'row',
      start: day.row.start, end: day.row.end,
      title: 'Row · Rogue Echo', sub: ROW.protocol, note: ROW.morningNote,
      slidable: day.row.slidable || null,
    });
  }

  // Work start + meeting (meeting is Mon–Fri only)
  blocks.push({ kind: 'anchor', tone: 'work', id: 'work-am', start: ANCHORS.workStart, title: 'Work · morning block', sub: '' });
  if (!ANCHORS.meeting.weekdaysOnly || !isWeekend(dow)) {
    blocks.push({
      kind: 'meeting', tone: 'meeting', id: 'meeting',
      start: ANCHORS.meeting.start, end: ANCHORS.meeting.end,
      title: 'Daily meeting',
      sub: `${fmtTime(ANCHORS.meeting.start)}–${fmtTime(ANCHORS.meeting.end)}`,
    });
  }

  // Dog walk
  blocks.push({ kind: 'walk', tone: 'walk', id: 'dogwalk', start: ANCHORS.dogWalk.start, end: ANCHORS.dogWalk.end, title: '1000 Acre dog walk', sub: '1.5–2 hr · home ~11a–12p' });

  // Meals (checkable) — from the active meal era
  for (const meal of resolveEra(iso).meals[day.type]) {
    let t = mealTime(meal, dow);
    if (isShiftable(t)) t += shiftMins;
    blocks.push({
      kind: 'meal', tone: 'meal', id: meal.id,
      start: t,
      title: meal.name,
      sub: meal.dinner ? day.dinner : meal.sub,
      p: meal.p, kcal: meal.kcal,
      prelift: !!meal.prelift, dinner: !!meal.dinner,
    });
  }

  // Non-morning row (Sat/Sun 11a)
  if (day.row && !day.row.morning) {
    blocks.push({
      kind: 'row', tone: 'row', id: 'row',
      start: day.row.start, end: day.row.end,
      title: 'Row · Rogue Echo', sub: ROW.protocol,
    });
  }

  // Lift (training days only) — shiftable
  if (day.type === 'training' && day.session) {
    const s = SESSIONS[day.session];
    blocks.push({
      kind: 'lift', tone: s.tone, id: 'lift',
      start: ANCHORS.liftDefault.start + shiftMins,
      end: ANCHORS.liftDefault.end + shiftMins,
      title: s.title, sub: '', banner: s.banner || null, note: s.note || null,
      exercises: s.exercises,
    });
  }

  // Sunday prep block
  if (day.prep != null) {
    blocks.push({
      kind: 'prep', tone: 'prep', id: 'prep',
      start: day.prep, title: 'Sunday prep', sub: '~1 hr',
      steps: PREP_STEPS,
    });
  }

  blocks.sort((a, b) => a.start - b.start);
  return blocks;
}

// Blocks at/after the pre-lift meal (2:30p) move with the "running late" shift.
function isShiftable(originalMins) {
  return originalMins >= hm(14, 30);
}

export { hm, fmtTime, isWeekend };
