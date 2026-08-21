// The Day — pure date/phase/day logic. No DOM. Imported by app + tests.
import {
  hm, fmtTime, isWeekend, mealTime,
  PHASES, CHECKIN_ANCHOR, CHECKIN_INTERVAL_DAYS,
  MEAL_ERAS, PROGRAM, ROWS, ROW_PROTOCOL, ENGINES,
  PREP_STEPS, WEEK, ANCHORS,
} from './config.js';

// ── Date helpers (calendar-date safe — no timezone drift) ──
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
export function addDaysISO(iso, n) {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ── Phase resolver ──
export function resolvePhase(iso) {
  for (const p of PHASES) {
    if (iso >= p.start && iso < p.end) return p;
  }
  if (iso < PHASES[0].start) return PHASES[0];
  return PHASES[PHASES.length - 1];
}

// ── Meal-era resolver ──
export function resolveEra(iso) {
  for (const e of MEAL_ERAS) {
    if (iso >= e.start && iso < e.end) return e;
  }
  if (iso < MEAL_ERAS[0].start) return MEAL_ERAS[0];
  return MEAL_ERAS[MEAL_ERAS.length - 1];
}

// Targets for a given date + day type ('training' | 'rest').
export function targetsFor(iso, type) {
  const phase = resolvePhase(iso);
  if (phase.useEraTargets) return resolveEra(iso).targets[type];
  return phase.targets[type];
}

// ── Check-in predicate: every 14 days anchored to CHECKIN_ANCHOR ──
export function isCheckinDay(iso) {
  const diff = dayDiff(CHECKIN_ANCHOR, iso);
  return diff % CHECKIN_INTERVAL_DAYS === 0;
}

// ── Meal helpers ──
export function mealsFor(iso) {
  const day = WEEK[dowOf(iso)];
  return resolveEra(iso).meals[day.type];
}
export function mealSum(list) {
  return list.reduce((a, m) => ({ p: a.p + m.p, kcal: a.kcal + m.kcal }), { p: 0, kcal: 0 });
}

// ── Session / row helpers ──
export function sessionFor(iso) {
  return PROGRAM[WEEK[dowOf(iso)].session];
}

// Session length estimate from set count + rest defaults (~2.5 min per working
// set incl. rest, +5 min setup, + primer on leg days). OPTIONAL work is
// excluded — the estimate is the day you actually owe. Rounded to 5 min.
export function sessionMinutes(session, primerMinutes = 0) {
  if (!session || !session.exercises.length) return 0;
  let sets = 0;
  for (const ex of session.exercises) {
    if ((ex.tags || []).includes('OPTIONAL')) continue;
    sets += parseInt(ex.scheme, 10) || 3;
  }
  const mins = 5 + sets * 2.5 + (session.kind === 'legs' ? primerMinutes : 0);
  return Math.round(mins / 5) * 5;
}
export function rowFor(iso) {
  return ROWS[dowOf(iso)]; // {min,max} | 'engine' | null
}

// ── Engine rotation ──
// State shape (persisted): { used: {wed:[ids], sat:[ids]}, swaps: {iso:id}, done: {iso:id} }
// Rotation is used-list based: the scheduled engine for a day is the first
// pool engine not yet used this cycle; completing one consumes it; after all 8
// the cycle resets. A shuffle stores swaps[iso] (still drawn from unused, so
// rotation stays honest). Past days show what was actually done.
export function enginePool(pool) {
  return ENGINES.filter((e) => e.pool === pool);
}
export function engineFor(iso, state) {
  const dow = dowOf(iso);
  const pool = dow === 3 ? 'wed' : dow === 6 ? 'sat' : null;
  if (!pool) return null;
  const s = state || { used: {}, swaps: {}, done: {} };
  if (s.done && s.done[iso]) return ENGINES.find((e) => e.id === s.done[iso]) || null;
  if (s.swaps && s.swaps[iso]) {
    const sw = ENGINES.find((e) => e.id === s.swaps[iso]);
    if (sw) return sw;
  }
  const list = enginePool(pool);
  const used = (s.used && s.used[pool]) || [];
  const next = list.find((e) => !used.includes(e.id));
  return next || list[0];
}
// Cycle caption data: position (1-based), and the engine after `current`.
export function engineCycleInfo(iso, state) {
  const dow = dowOf(iso);
  const pool = dow === 3 ? 'wed' : dow === 6 ? 'sat' : null;
  if (!pool) return null;
  const s = state || { used: {}, swaps: {}, done: {} };
  const list = enginePool(pool);
  const used = (s.used && s.used[pool]) || [];
  const current = engineFor(iso, state);
  const unused = list.filter((e) => !used.includes(e.id) && e.id !== current.id);
  return { pos: Math.min(used.length + 1, list.length), of: list.length, next: unused[0] || list[0], pool };
}
// Options a shuffle may swap to (unused this cycle, excluding current).
export function engineShuffleOptions(iso, state) {
  const info = engineCycleInfo(iso, state);
  if (!info) return [];
  const s = state || { used: {}, swaps: {}, done: {} };
  const used = (s.used && s.used[info.pool]) || [];
  const current = engineFor(iso, state);
  return enginePool(info.pool).filter((e) => !used.includes(e.id) && e.id !== current.id);
}

// ── Streaks (neutral counters computed from logged history) ──
// `hit(iso)` decides a day; `skip(iso)` marks days that don't count either way.
export function streak(todayISO, hit, skip = () => false, maxBack = 120) {
  let n = 0;
  for (let i = 0; i < maxBack; i++) {
    const iso = addDaysISO(todayISO, -i);
    if (skip(iso)) continue;
    if (hit(iso)) n++;
    else if (i === 0) continue;   // today not yet done doesn't break the streak
    else break;
  }
  return n;
}

// ── Day builder: ordered spine blocks for a date ──
// shiftMins: "running late" offset applied to blocks at/after the pre-lift meal.
export function buildDay(iso, shiftMins = 0) {
  const dow = dowOf(iso);
  const day = WEEK[dow];
  const wknd = isWeekend(dow);
  const session = PROGRAM[day.session];
  const blocks = [];

  blocks.push({
    kind: 'anchor', tone: 'work', id: 'wake',
    start: wknd ? ANCHORS.wakeWeekend : ANCHORS.wakeWeekday,
    title: 'Wake', sub: wknd ? 'weekend' : '',
  });

  // Meeting (Mon–Fri only) + work
  if (!ANCHORS.meeting.weekdaysOnly || !isWeekend(dow)) {
    blocks.push({
      kind: 'meeting', tone: 'meeting', id: 'meeting',
      start: ANCHORS.meeting.start, end: ANCHORS.meeting.end,
      title: 'Daily meeting',
      sub: `${fmtTime(ANCHORS.meeting.start)}–${fmtTime(ANCHORS.meeting.end)}`,
    });
  }
  blocks.push({ kind: 'anchor', tone: 'work', id: 'work-am', start: ANCHORS.workStart, title: 'Work · morning block', sub: '' });

  // Dog walk, then rehab round 1
  blocks.push({ kind: 'walk', tone: 'walk', id: 'dogwalk', start: ANCHORS.dogWalk.start, end: ANCHORS.dogWalk.end, title: '1000 Acre dog walk', sub: '1.5–2 hr · home ~11a–12p' });
  blocks.push({ kind: 'rehab', tone: 'rest', id: 'rehab1', start: ANCHORS.rehab1, title: 'Stretch · Piriformis Protocol', sub: 'round 1 of 2 · after the walk · left first' });

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

  // Lift (training days) — compact card that deep-links into WOD
  if (day.type === 'training' && session.exercises.length) {
    blocks.push({
      kind: 'lift', tone: session.kind, id: 'lift',
      start: ANCHORS.liftDefault.start + shiftMins,
      end: ANCHORS.liftDefault.end + shiftMins,
      title: session.title, sub: session.sub,
      exerciseCount: session.exercises.length,
    });
  }

  // Post-lift conditioning: engine (Wed/Sat) or Z2 row (Mon/Tue/Thu/Fri)
  const row = ROWS[dow];
  if (row === 'engine') {
    blocks.push({
      kind: 'engine', tone: 'legs', id: 'engine',
      start: ANCHORS.engineStart + shiftMins,
      title: 'Engine', sub: 'rotating — open WOD for today’s workout',
    });
  } else if (row) {
    blocks.push({
      kind: 'row', tone: 'row', id: 'row',
      start: ANCHORS.rowStart + shiftMins, end: ANCHORS.rowStart + shiftMins + row.max,
      title: `Row · ${row.min}–${row.max}′ Zone 2`, sub: ROW_PROTOCOL,
    });
  }

  // Rehab round 2 (post-training; on Sun it's the extended sequence)
  blocks.push({
    kind: 'rehab', tone: 'rest', id: 'rehab2',
    start: (day.type === 'training' ? hm(17, 15) + shiftMins : hm(17, 0)),
    title: 'Stretch · Piriformis Protocol',
    sub: day.type === 'training' ? 'round 2 of 2 · after training' : 'round 2 of 2 · extended — rest day',
  });

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
