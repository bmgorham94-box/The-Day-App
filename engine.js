// The Day: pure date, meal, and day building logic. No DOM. Used by app + tests.
import { hm, fmtTime, isWeekend, PLAN, WEEK } from './config.js';

// ── Date helpers (calendar date safe, no timezone drift) ──
export function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}
export function dayDiff(aISO, bISO) {
  return Math.round((parseISO(bISO) - parseISO(aISO)) / 86400000);
}
export function dowOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}
export function addDaysISO(iso, n) {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ── Day type ──
export function dayType(iso) { return WEEK[dowOf(iso)].type; }   // 'training' | 'rest'

// ── Meals: resolve the day's list from fixed slots + the rotation ──
export function mealsFor(iso) {
  const dow = dowOf(iso);
  const type = dayType(iso);
  const rot = PLAN.meals.rotation[dow];
  const out = [];
  for (const m of PLAN.meals.fixed) {
    if (m.trainingOnly && type !== 'training') continue;
    if (m.restOnly && type !== 'rest') continue;
    let entry;
    if (m.rotation) {
      const r = rot[m.rotation];
      entry = { id: m.id, name: r.name, kcal: r.kcal, p: r.p, c: r.c, f: r.f, src: m.src };
    } else if (m.training || m.rest) {
      const v = type === 'training' ? m.training : m.rest;
      entry = { id: m.id, name: v.name, kcal: v.kcal, p: v.p, c: v.c, f: v.f, src: v.src };
    } else {
      entry = { id: m.id, name: m.name, kcal: m.kcal, p: m.p, c: m.c, f: m.f, src: m.src };
    }
    entry.time = (isWeekend(dow) && m.timeWe != null) ? m.timeWe : m.time;
    out.push(entry);
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}
export function mealSum(list) {
  return list.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }),
    { kcal: 0, p: 0, c: 0, f: 0 });
}
// The day's target is the day's own meal total; real rotation macros, no tildes.
export function targetsFor(iso) { return mealSum(mealsFor(iso)); }

// ── Check ins: every 14 days from the anchor ──
export function isCheckinDay(iso) {
  const diff = dayDiff(PLAN.tracking.checkinAnchor, iso);
  return diff >= 0 && diff % PLAN.tracking.checkinInterval === 0;
}

// ── Monthly: first Saturday of the month (photos + InBody + body fat field) ──
export function isFirstSaturday(iso) {
  return dowOf(iso) === 6 && Number(iso.slice(8)) <= 7;
}

// ── Reintroduction phase for leg days ──
// Returns { n: 1|2, label, sets? } during the ramp, or null once overload is normal.
export function reintroPhase(iso) {
  const r = PLAN.training.reintro;
  if (iso >= r.p1.start && iso < r.p1.end) return { n: 1, label: r.p1.label, sets: r.p1.sets };
  if (iso >= r.p2.start && iso < r.p2.end) return { n: 2, label: r.p2.label };
  return null;
}
export function reintroBanActive(iso) { return iso < PLAN.training.reintro.banUntil; }
// Render a set scheme under the active phase: phase 1 caps every lift at 2 sets.
export function setsForPhase(sets, phase) {
  if (!phase || !phase.sets) return sets;
  return sets.replace(/^\d+/, (n) => String(Math.min(Number(n), phase.sets)));
}

// ── Sessions ──
export function sessionFor(iso) { return PLAN.training.days[WEEK[dowOf(iso)].session]; }
export function isLegDay(iso) { return sessionFor(iso).kind === 'legs'; }

// Session length estimate: set count × 2.5 min + setup. Rounded to 5.
export function sessionMinutes(iso) {
  const s = sessionFor(iso);
  if (!s.exercises.length) return 0;
  const phase = s.kind === 'legs' ? reintroPhase(iso) : null;
  let sets = 0;
  for (const ex of s.exercises) sets += parseInt(setsForPhase(ex.sets, phase), 10) || 3;
  return Math.round((5 + sets * 2.5) / 5) * 5;
}

// ── Body fat gate ──
export function latestBodyFat(bfLog) {
  const days = Object.keys(bfLog || {}).sort();
  return days.length ? bfLog[days[days.length - 1]] : null;
}
export function bfGateTripped(bfLog) {
  const bf = latestBodyFat(bfLog);
  return bf != null && bf >= PLAN.tracking.bfGatePct;
}

// ── Streaks (neutral counters from logged history) ──
export function streak(todayISO, hit, skip = () => false, maxBack = 120) {
  let n = 0;
  for (let i = 0; i < maxBack; i++) {
    const iso = addDaysISO(todayISO, -i);
    if (skip(iso)) continue;
    if (hit(iso)) n++;
    else if (i === 0) continue;   // today not yet done does not break the streak
    else break;
  }
  return n;
}

// ── Day builder: ordered spine blocks for a date ──
// shiftMins: the running late offset moves the afternoon (2:00p onward).
export function buildDay(iso, shiftMins = 0) {
  const dow = dowOf(iso);
  const wknd = isWeekend(dow);
  const type = dayType(iso);
  const session = sessionFor(iso);
  const A = PLAN.anchors;
  const blocks = [];

  blocks.push({ kind: 'anchor', tone: 'work', id: 'wake',
    start: wknd ? A.wakeWeekend : A.wakeWeekday, title: 'Wake', sub: wknd ? 'weekend' : '' });

  if (!A.meeting.weekdaysOnly || !wknd) {
    blocks.push({ kind: 'meeting', tone: 'meeting', id: 'meeting',
      start: A.meeting.start, end: A.meeting.end, title: 'Daily meeting',
      sub: `${fmtTime(A.meeting.start)} to ${fmtTime(A.meeting.end)}` });
  }
  blocks.push({ kind: 'anchor', tone: 'work', id: 'work-am', start: A.workStart,
    title: 'Work, morning block', sub: 'wraps 9 to 10a' });

  blocks.push({ kind: 'walk', tone: 'walk', id: 'dogwalk', start: A.dogWalk.start, end: A.dogWalk.end,
    title: 'Dog walk', sub: 'about 2 hours' });
  blocks.push({ kind: 'rehab', tone: 'rest', id: 'rehab1', start: A.rehab1,
    title: 'Rehab sequence', sub: 'round 1 of 2, after the walk, left first' });

  for (const meal of mealsFor(iso)) {
    let t = meal.time;
    if (t >= hm(14, 0)) t += shiftMins;
    blocks.push({ kind: 'meal', tone: 'meal', id: meal.id, start: t,
      title: meal.name, sub: meal.src, kcal: meal.kcal, p: meal.p, c: meal.c, f: meal.f });
  }

  if (type === 'training') {
    const phase = session.kind === 'legs' ? reintroPhase(iso) : null;
    blocks.push({ kind: 'lift', tone: session.kind, id: 'lift',
      start: A.train.start + shiftMins, end: A.train.end + shiftMins,
      title: `${session.title}${session.where ? ` at ${session.where}` : ''}`,
      sub: session.focus, exerciseCount: session.exercises.length,
      phaseLabel: phase ? `Reintroduction phase ${phase.n}` : null });
    blocks.push({ kind: 'row', tone: 'row', id: 'row',
      start: A.row + shiftMins, end: A.row + shiftMins + 40,
      title: 'Row, optional', sub: '30 to 40 minutes, cap 3 per week' });
  }

  blocks.push({ kind: 'rehab', tone: 'rest', id: 'rehab2',
    start: (type === 'training' ? A.rehab2 + shiftMins : hm(17, 0)),
    title: 'Rehab sequence', sub: type === 'training' ? 'round 2 of 2, after training' : 'round 2 of 2, take it long' });

  blocks.push({ kind: 'posture', tone: 'rest', id: 'posture', start: hm(19, 30),
    title: 'Posture block, 10 minutes', sub: PLAN.daily.posture.cue });

  if (dow === 0) {
    blocks.push({ kind: 'order', tone: 'prep', id: 'order', start: hm(15, 30),
      title: 'Weekly My Fit Foods order', sub: `${PLAN.weeklyOrder.length} items, open WOD` });
  }

  blocks.sort((a, b) => a.start - b.start);
  return blocks;
}

export { hm, fmtTime, isWeekend };
