// The Day — single source of truth.
// Edit THIS FILE to change the plan. App code never hard-codes schedule/meals.
// Works as an ES module in both the browser and Node (tests).

// ── Time helpers ────────────────────────────────────────────────────────────
// Times are stored as "minutes from midnight" for easy sorting + now-logic.
export const hm = (h, m = 0) => h * 60 + m;
export const fmtTime = (mins) => {
  let h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m = ((mins % 60) + 60) % 60;
  const ampm = h < 12 ? 'a' : 'p';
  h = h % 12; if (h === 0) h = 12;
  return m === 0 ? `${h}:00${ampm}` : `${h}:${String(m).padStart(2, '0')}${ampm}`;
};

// Weekday index: 0=Sun … 6=Sat. Weekend = Sat/Sun.
export const isWeekend = (dow) => dow === 0 || dow === 6;

// ── Design tokens (kept here so config is the single settings surface) ───────
export const BLOCK_TONES = ['pull', 'push', 'legs', 'rest', 'prep', 'row', 'meal', 'work', 'walk', 'meeting'];

// ── Macro targets, per phase, per day-type ──────────────────────────────────
// null in a macro slot means "intentionally TBD — do not invent".
export const PHASES = [
  {
    id: 'recomp',
    name: 'Recomp',
    badge: 'Recomp',
    start: '2026-01-01',            // effectively "now / before Oct 1"
    end: '2026-10-01',             // exclusive upper bound
    // Phase 1 targets come from the meal era (Batch week → MFF), not here.
    useEraTargets: true,
    tbd: false,
  },
  {
    id: 'build',
    name: 'Build',
    badge: 'Build',
    start: '2026-10-01',
    end: '2027-03-15',
    targets: {
      training: { kcal: 3200, p: null, c: null, f: null, fiber: null },
      rest:     { kcal: 2900, p: null, c: null, f: null, fiber: null },
    },
    tbd: true,
    tbdBanner: 'Update Phase 2 macros in config.',
  },
  {
    id: 'reveal',
    name: 'Reveal',
    badge: 'Reveal',
    start: '2027-03-15',
    end: '2027-06-01',             // "~May 2027"
    targets: {
      training: { kcal: 2400, p: 230, c: null, f: null, fiber: null },
      rest:     { kcal: 2150, p: null, c: null, f: null, fiber: null },
    },
    tbd: true,
    tbdBanner: 'Update Phase 3 macros in config.',
  },
];

// ── Check-in cadence: every 14 days anchored to Jul 26 2026 ──────────────────
export const CHECKIN_ANCHOR = '2026-07-26';
export const CHECKIN_INTERVAL_DAYS = 14;

// ── Meals as dated ERAS (exact — these sums are load-bearing, unit-tested) ────
// The user changes his meal system periodically; model meals + targets as dated
// eras so every future swap is a config edit, never a code change. Resolve by
// date, same pattern as phases. timeWk / timeWe let the first meals shift on
// weekends. Flip the whole system by editing one constant:
export const MFF_START = '2026-08-03';   // Era A → Era B boundary (Mon)

export const MEAL_ERAS = [
  {
    // Era A · "Batch week" — home-cooked oat bake + Boujee Mac, through Aug 2.
    id: 'batch', name: 'Batch week',
    chip: 'Batch week · MFF starts Aug 3',
    start: '2026-01-01', end: MFF_START,
    targets: {
      training: { kcal: 2767, p: 210, c: 347, f: 59, fiber: 50 },
      rest:     { kcal: 2439, p: 184, c: 265, f: 65, fiber: 42 },
    },
    meals: {
      // Identical to Era B except breakfast + lunch.
      training: [
        { id: 'a-coldbrew', timeWk: hm(6, 0),  timeWe: hm(6, 45), name: 'Cold brew', sub: 'splash oat milk · Trenta, no cold foam', p: 0,  kcal: 40 },
        { id: 'a-oatbake',  timeWk: hm(8, 0),  timeWe: hm(7, 15), name: 'Oat bake square + 2 eggs + ½ cup whites', sub: 'griddle eggs fresh, ~6 min', p: 43, kcal: 535 },
        { id: 'a-boujee',   timeWk: hm(12, 30), timeWe: hm(12, 30), name: 'Boujee Mac', sub: 'from Sunday batch', p: 59, kcal: 571 },
        { id: 'a-prelift',  timeWk: hm(14, 30), timeWe: hm(14, 30), name: '4 rice cakes + honey', sub: 'whey shake · banana', p: 28, kcal: 419, prelift: true },
        { id: 'a-yogurt',   timeWk: hm(16, 30), timeWe: hm(16, 30), name: 'Greek yogurt + berries + honey', sub: '', p: 24, kcal: 274 },
        { id: 'a-dinner',   timeWk: hm(19, 0),  timeWe: hm(19, 0),  name: 'Dinner', sub: 'larger portion', p: 50, kcal: 707, dinner: true },
        { id: 'a-froyo',    timeWk: hm(20, 30), timeWe: hm(20, 30), name: 'Umpqua froyo + berries + honey', sub: '⅔ cup', p: 6, kcal: 221 },
      ],
      rest: [
        { id: 'a-coldbrew-r', timeWk: hm(6, 0),  timeWe: hm(6, 45), name: 'Cold brew', sub: 'splash oat milk', p: 0,  kcal: 40 },
        { id: 'a-oatbake-r',  timeWk: hm(8, 0),  timeWe: hm(7, 15), name: 'Oat bake square + 2 eggs + ½ cup whites', sub: 'griddle eggs fresh, ~6 min', p: 43, kcal: 535 },
        { id: 'a-cottage',    timeWk: hm(12, 0), timeWe: hm(12, 0),  name: 'Cottage cheese + berries', sub: '', p: 25, kcal: 265 },
        { id: 'a-boujee-r',   timeWk: hm(13, 30), timeWe: hm(13, 30), name: 'Boujee Mac', sub: 'from Sunday batch', p: 59, kcal: 571 },
        { id: 'a-apple',      timeWk: hm(16, 30), timeWe: hm(16, 30), name: 'Apple + 1oz almonds', sub: '', p: 6, kcal: 250 },
        { id: 'a-dinner-r',   timeWk: hm(19, 0),  timeWe: hm(19, 0),  name: 'Dinner', sub: 'standard portion', p: 45, kcal: 557, dinner: true },
        { id: 'a-froyo-r',    timeWk: hm(20, 30), timeWe: hm(20, 30), name: 'Froyo + berries', sub: '', p: 6, kcal: 221 },
      ],
    },
  },
  {
    // Era B · "MFF" — My Fit Foods breakfast + lunch, from Aug 3 onward.
    id: 'mff', name: 'MFF',
    chip: null,
    start: MFF_START, end: '2100-01-01',
    targets: {
      training: { kcal: 2601, p: 208, c: 335, f: 47, fiber: 40 },
      rest:     { kcal: 2273, p: 182, c: 253, f: 53, fiber: 33 },
    },
    meals: {
      training: [
        { id: 't-coldbrew', timeWk: hm(6, 0),  timeWe: hm(6, 45), name: 'Cold brew', sub: 'splash oat milk · Trenta, no cold foam', p: 0,  kcal: 40 },
        { id: 't-bison',    timeWk: hm(8, 0),  timeWe: hm(7, 15), name: 'MFF Bison Breakfast', sub: '', p: 46, kcal: 390 },
        { id: 't-mash',     timeWk: hm(12, 30), timeWe: hm(12, 30), name: 'MFF Marine Corps Mash', sub: 'regular', p: 54, kcal: 550 },
        { id: 't-prelift',  timeWk: hm(14, 30), timeWe: hm(14, 30), name: '4 rice cakes + honey', sub: 'whey shake · banana', p: 28, kcal: 419, prelift: true },
        { id: 't-yogurt',   timeWk: hm(16, 30), timeWe: hm(16, 30), name: 'Greek yogurt + berries + honey', sub: '', p: 24, kcal: 274 },
        { id: 't-dinner',   timeWk: hm(19, 0),  timeWe: hm(19, 0),  name: 'Dinner', sub: 'larger portion', p: 50, kcal: 707, dinner: true },
        { id: 't-froyo',    timeWk: hm(20, 30), timeWe: hm(20, 30), name: 'Umpqua froyo + berries + honey', sub: '⅔ cup', p: 6, kcal: 221 },
      ],
      rest: [
        { id: 'r-coldbrew', timeWk: hm(6, 0),  timeWe: hm(6, 45), name: 'Cold brew', sub: 'splash oat milk', p: 0,  kcal: 40 },
        { id: 'r-bison',    timeWk: hm(8, 0),  timeWe: hm(7, 15), name: 'MFF Bison Breakfast', sub: '', p: 46, kcal: 390 },
        { id: 'r-cottage',  timeWk: hm(12, 0), timeWe: hm(12, 0),  name: 'Cottage cheese + berries', sub: '', p: 25, kcal: 265 },
        { id: 'r-mash',     timeWk: hm(13, 30), timeWe: hm(13, 30), name: 'MFF Marine Corps Mash', sub: '', p: 54, kcal: 550 },
        { id: 'r-apple',    timeWk: hm(16, 30), timeWe: hm(16, 30), name: 'Apple + 1oz almonds', sub: '', p: 6, kcal: 250 },
        { id: 'r-dinner',   timeWk: hm(19, 0),  timeWe: hm(19, 0),  name: 'Dinner', sub: 'standard portion', p: 45, kcal: 557, dinner: true },
        { id: 'r-froyo',    timeWk: hm(20, 30), timeWe: hm(20, 30), name: 'Froyo + berries', sub: '', p: 6, kcal: 221 },
      ],
    },
  },
];

// Resolve a meal's time for a given day-of-week.
export const mealTime = (meal, dow) => (isWeekend(dow) ? meal.timeWe : meal.timeWk);

// ── Rowing protocol (Rogue Echo) ─────────────────────────────────────────────
export const ROW = {
  protocol: 'Zone 2 · damper 4 · 22–24 spm · ~2:20–2:30 /500m · 30–40 min',
  morningNote: 'water + electrolytes first (cramp history), easy pace only.',
};

// ── Training sessions ────────────────────────────────────────────────────────
// Each exercise is a plain string rendered as a tappable row (load memory).
export const SESSIONS = {
  day1: {
    title: 'Day 1 · Back · Lat Width', tone: 'pull',
    exercises: [
      'Wide-Grip Pull-Ups 4×6–10',
      'Wide Lat Pulldown 4×10–12',
      'Single-Arm Pulldown (L leads) 4×12ea',
      'Straight-Arm Pulldown 4×15',
      'Chest-Supported DB Row 3×10–12',
      'Cable Face Pull 3×20',
      'Cable Curl + Hammer 3×10–12',
    ],
  },
  day2: {
    title: 'Day 2 · Chest · Upper Shelf', tone: 'push',
    exercises: [
      'Incline Barbell Press 30–45° 4×6–10',
      'Low-to-High Cable Fly 4×12–15',
      'Flat DB Press 3×8–12',
      'Single-Arm Cable Lateral 4×12–20ea',
      'Reverse Cable Fly 4×12–15',
      'Overhead Cable Tricep Ext 3×12–15',
    ],
  },
  day3: {
    title: 'Day 3 · Legs · Unilateral', tone: 'legs',
    banner: 'Left leads every set — right matches, never beats. Stop shy of hip/knee pain.',
    exercises: [
      'DB Step-Up (left +1 set) L4·R3',
      'Reverse Lunge L3·R3',
      'B-Stance RDL L3·R3',
      'Single-Leg Hip Thrust L3·R3',
      'Single-Leg Calf Raise L3·R3',
      'Cable Crunch 3×15',
    ],
  },
  day4: {
    title: 'Day 4 · Back · Lat Width 2', tone: 'pull',
    exercises: [
      'Neutral-Grip Pull-Ups 4×8–10',
      'Cable Pullover 4×12–15',
      'Wide Cable Row 3×10–12',
      'Single-Arm Pulldown (L leads) 3×12ea',
      'Meadows Row 3×10ea',
      'Rear Delt Face Pull 3×20',
      'Cable Curl 3×12',
    ],
  },
  day5: {
    title: 'Day 5 · Chest + Delts 2', tone: 'push',
    note: '+10 min posing after — quarter turns, lat spread, mandatories',
    exercises: [
      'Incline DB Press 4×8–12',
      'Mid Cable Fly 3×12–15',
      'Cable Lateral Raise 4×15–20',
      'Reverse Cable Fly 4×15',
      'Triceps OH + Pushdown 3×ea',
      'Hanging Leg Raise 3×12–15',
    ],
  },
};

// Sunday prep sub-checklist (rendered as tappable steps inside the block).
export const PREP_STEPS = [
  'Rice cooker on',
  "1 oat-bake batch in the oven (Joey's breakfasts — not Brandon's from Aug 3)",
  'Sheet-pan sweet potatoes + Brussels + broccoli',
  'Griddle chicken (Thu)',
  'Brown/season turkey (Wed & Sat)',
  'Simmer lentils',
  'Portion everything',
];

// ── Week schedule: what each day-of-week is made of ──────────────────────────
// dow: 0=Sun … 6=Sat
export const WEEK = {
  1: { dow: 1, name: 'Mon', type: 'training', session: 'day1', dinner: 'Salmon · sear fresh',          row: null },
  2: { dow: 2, name: 'Tue', type: 'training', session: 'day2', dinner: 'Sirloin · sear fresh',         row: { start: hm(6, 15), end: hm(6, 55), morning: true } },
  3: { dow: 3, name: 'Wed', type: 'training', session: 'day3', dinner: 'Ground turkey · from prep',    row: null },
  4: { dow: 4, name: 'Thu', type: 'rest',     session: null,   dinner: 'Chicken · from prep',          row: { start: hm(6, 15), end: hm(6, 55), morning: true, slidable: hm(14, 30) } },
  5: { dow: 5, name: 'Fri', type: 'training', session: 'day4', dinner: 'Sirloin · sear fresh',         row: null },
  6: { dow: 6, name: 'Sat', type: 'training', session: 'day5', dinner: 'Ground turkey · from prep',    row: { start: hm(11, 0), end: hm(11, 40), morning: false } },
  0: { dow: 0, name: 'Sun', type: 'rest',     session: null,   dinner: 'Leftovers',                     row: { start: hm(11, 0), end: hm(11, 40), morning: false }, prep: hm(15, 30) },
};

// ── Fixed daily anchors ──────────────────────────────────────────────────────
export const ANCHORS = {
  wakeWeekday: hm(4, 30),
  wakeWeekend: hm(6, 30),
  workStart: hm(6, 0),
  meeting: { start: hm(5, 30), end: hm(6, 0), weekdaysOnly: true }, // Mon–Fri
  dogWalk: { start: hm(10, 0), end: hm(11, 30) }, // 1000 Acre, home ~11a–12p
  liftDefault: { start: hm(15, 15), end: hm(16, 15) },
};

export const APP = {
  name: 'The Day',
  short: 'The Day',
  weekdayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export default {
  hm, fmtTime, isWeekend, mealTime,
  PHASES, CHECKIN_ANCHOR, CHECKIN_INTERVAL_DAYS,
  MFF_START, MEAL_ERAS, ROW, SESSIONS, PREP_STEPS, WEEK, ANCHORS, APP, BLOCK_TONES,
};
