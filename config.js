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

// ── Athlete (embedded constants — nothing fetched) ───────────────────────────
export const ATHLETE = {
  bodyweight: { iso: '2026-08-20', lb: 192.4 },   // last check-in; trend line only, no goal-weight line
  priorities: 'upper-chest shelf · lat width/flare · delt caps + rear delts · glute development · arm & forearm size · quads maintenance',
  loadRule: 'Compounds at 1–3 reps in reserve; true failure only on cable/isolation work.',
};

// ── Equipment (authoritative — the ONLY equipment programmed anywhere) ───────
// Power rack w/ J-cups + strap safeties · Rogue barbell + 560 lb plates · REP
// adjustable bench · REP Athena dual cable (2:1, any-height trolleys) ·
// landmine · pull-up bar · 125 lb adjustable dumbbell pair · weighted vest ·
// Echo rower · rubber mats.
// No kettlebells, bands, boxes, sleds, machines, or jump ropes. Low ceiling:
// no overhead BARBELL work, no jumps, no wall balls, no running; seated DB
// overhead pressing is fine; single rack-adjacent footprint (in-place lunges,
// static holds — no traveling carries). Enforced by tests/equipment.test.js.

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

// ── The training week (program v2) ───────────────────────────────────────────
// kind: 'upper' | 'legs' | 'rest' — drives hero color (rust / olive / ink).
// tags on exercises: 'LEFT FIRST' (unilateral, left side leads — piriformis
// rehab), 'VEST', 'VEST OPT'.
export const PROGRAM = {
  mon: {
    title: 'Chest + Triceps', sub: 'Priority: the upper-chest shelf', kind: 'upper',
    exercises: [
      { id: 'mon-1', name: 'Low-Incline DB Press (~30°)', scheme: '4 × 6–9',   cue: 'The shelf builder. Full stretch at the bottom, drive up-and-in.' },
      { id: 'mon-2', name: 'Barbell Bench Press',          scheme: '3 × 5–8',   cue: 'Heavy anchor. J-cups + strap safeties, no spotter needed.' },
      { id: 'mon-3', name: 'Low-to-High Cable Fly',        scheme: '3 × 12–15', cue: 'Trolleys low, sweep to collarbone height. 1s squeeze at the top.' },
      { id: 'mon-4', name: 'Vest Push-Up',                 scheme: '2 × AMRAP', cue: 'Strict tempo. Stop 1–2 shy of ugly reps.', tags: ['VEST'] },
      { id: 'mon-5', name: 'EZ-Bar Skullcrusher',          scheme: '3 × 10–12', cue: 'Elbows tucked, to the forehead or just behind.' },
      { id: 'mon-6', name: 'Single-Arm Cable Pressdown',   scheme: '3 × 12–15', cue: 'Trolley high. Full lockout, slow return.', tags: ['LEFT FIRST'] },
    ],
  },
  tue: {
    title: 'Back Width + Arms', sub: 'Priority: lat width and the flare', kind: 'upper',
    exercises: [
      { id: 'tue-1', name: 'Kneeling Athena Pulldown',     scheme: '4 × 8–12',  cue: 'Trolleys high, elbows down-and-in. Long stretch up top — the width slot.' },
      { id: 'tue-2', name: 'Straight-Arm Pulldown',        scheme: '3 × 12–15', cue: 'Hinge slightly, sweep to hips. Feel the lat lengthen.' },
      { id: 'tue-3', name: 'Chest-Supported DB Row',       scheme: '3 × 8–12',  cue: 'Incline bench ~30°. Elbows ~45° for lat, not upper back.' },
      { id: 'tue-4', name: 'Single-Arm Cable High Row',    scheme: '2 × 10–12', cue: 'Pull toward the hip; let the shoulder reach forward at the start.', tags: ['LEFT FIRST'] },
      { id: 'tue-5', name: 'EZ-Bar Curl',                  scheme: '3 × 8–12',  cue: 'The size driver. No swing below rep 8.' },
      { id: 'tue-6', name: 'DB Hammer Curl',               scheme: '3 × 10–12', cue: 'Brachialis + forearm thickness. Strict.' },
      { id: 'tue-7', name: 'Wrist Curl / Reverse Wrist Curl (superset)', scheme: '3 × 15–20', cue: 'Forearms on bench. Burn is the point.' },
      { id: 'tue-8', name: 'DB Farmer Hold',               scheme: '2 × 40s',   cue: 'Heavy pair, tall posture.' },
    ],
  },
  wed: {
    title: 'Legs A — Glute Strength', sub: 'Priority: heavy hip extension', kind: 'legs',
    exercises: [
      { id: 'wed-1', name: 'Barbell Hip Thrust',           scheme: '4 × 8–12',  cue: 'Back on bench, mat folded over the bar. Ribs down, full lockout, 2s squeeze. THE builder.' },
      { id: 'wed-2', name: 'B-Stance DB RDL',              scheme: '3 × 10–12', cue: 'Hips back, soft knee, stretch the glute-ham tie-in.', tags: ['LEFT FIRST'] },
      { id: 'wed-3', name: 'DB Bulgarian Split Squat',     scheme: '2 × 8–10',  cue: 'Torso leaned forward = glute bias.', tags: ['LEFT FIRST'] },
      { id: 'wed-4', name: 'Bench Reverse Hyper',          scheme: '2 × 12–15', cue: 'Hips on bench end, squeeze glutes + low back at the top.' },
    ],
  },
  thu: {
    title: 'Shoulders — Primary', sub: 'Priority: caps and rear delts', kind: 'upper',
    exercises: [
      { id: 'thu-1', name: 'Seated DB Shoulder Press',     scheme: '4 × 6–10',  cue: 'Bench ~80°. The heavy slot — progress it like a bench press.' },
      { id: 'thu-2', name: 'DB Lateral Raise',             scheme: '4 × 12–15', cue: 'Lead with the elbow, pinkies slightly up.' },
      { id: 'thu-3', name: 'Cable Lateral Raise',          scheme: '3 × 15–20', cue: 'Trolley low, one arm at a time. Constant tension the DBs can’t give.', tags: ['LEFT FIRST'] },
      { id: 'thu-4', name: 'Landmine Press',               scheme: '3 × 8–10',  cue: 'Standing, one arm.', tags: ['LEFT FIRST'] },
      { id: 'thu-5', name: 'Athena Face Pull',             scheme: '3 × 15–20', cue: 'Trolleys upper-mid, pull to eyebrows, thumbs back.' },
      { id: 'thu-6', name: 'Chest-Supported Rear-Delt Fly', scheme: '3 × 12–15', cue: 'Chest on incline bench, light DBs. Reach at the bottom.' },
      { id: 'thu-7', name: 'DB Shrug',                     scheme: '3 × 12–15', cue: '1s hold at the top.' },
    ],
  },
  fri: {
    title: 'Upper Density', sub: 'Chest · lats · arms — the second hit', kind: 'upper',
    exercises: [
      { id: 'fri-1', name: 'Incline DB Press (~45°)',      scheme: '3 × 8–12',  cue: 'Steeper than Monday — upper-pec bias.' },
      { id: 'fri-2', name: 'Low-to-High Cable Fly',        scheme: '2 × 15–20', cue: 'Chase the squeeze, not the stack.' },
      { id: 'fri-3', name: 'Seated Athena Pulldown',       scheme: '3 × 10–12', cue: 'Different grip than Tuesday.' },
      { id: 'fri-4', name: 'Cable Pullover',               scheme: '2 × 15',    cue: 'Straight arms, big stretch overhead.' },
      { id: 'fri-5', name: 'Incline DB Curl',              scheme: '3 × 10–12', cue: 'Bench ~55°, arms hang back. The stretch slot.' },
      { id: 'fri-6', name: 'Overhead EZ Extension',        scheme: '3 × 10–12', cue: 'Seated, elbows narrow. Long-head stretch.' },
      { id: 'fri-7', name: 'Reverse EZ Curl',              scheme: '2 × 12–15', cue: 'Forearm/brachioradialis size.' },
      { id: 'fri-8', name: 'Cable Rear-Delt Fly',          scheme: '2 × 15–20', cue: 'Cross-body, arms long.' },
    ],
  },
  sat: {
    title: 'Legs B — Glute Pump', sub: 'Volume, pump, upper-glute sweep', kind: 'legs',
    exercises: [
      { id: 'sat-1', name: 'Single-Leg DB Hip Thrust',     scheme: '3 × 12–15', cue: 'DB on the working hip. Full lockout every rep.', tags: ['LEFT FIRST'] },
      { id: 'sat-2', name: 'Cable Pull-Through',           scheme: '3 × 12–15', cue: 'Trolley low, hinge deep, snap the hips through.' },
      { id: 'sat-3', name: 'DB Step-Up',                   scheme: '3 × 10/leg', cue: 'Bench height. Knee tracks over the toes — never caves in.', tags: ['LEFT FIRST', 'VEST OPT'] },
      { id: 'sat-4', name: 'Side-Lying DB Abduction',      scheme: '2 × 15–20', cue: 'Upper-glute sweep.' },
    ],
  },
  sun: {
    title: 'Rest', sub: 'Extended stretch sequence · prep · walk', kind: 'rest',
    exercises: [],
  },
};

// Weekly frequency note (Today tab).
export const FREQ_NOTE = 'Chest 2× · Lats 2× · Delts 2× · Rear delts 3× · Arms 2× · Glutes 2× · Quads maintenance';

// ── Rehab: "Piriformis Protocol v2" (2× daily) ───────────────────────────────
export const REHAB = {
  name: 'Piriformis Protocol v2',
  cadence: '2× daily · after the dog walk + after training',
  moves: [
    { name: 'Glute smash (ball/roller)', dose: '60–90s',     cue: 'Optional primer on the left glute' },
    { name: 'Supine Figure-4',           dose: '3 × 30–45s', cue: 'Left first. Deep hip flexion + external rotation + adduction — the position that lengthens the piriformis most' },
    { name: 'Cross-Body Knee Pull',      dose: '3 × 30s',    cue: 'Left knee toward right shoulder. Deep buttock ache = correct' },
    { name: 'Seated Figure-4 Hinge',     dose: '2 × 30s',    cue: 'The desk version — use on work breaks' },
    { name: 'Sciatic Nerve Glide',       dose: '8–10 reps',  cue: 'Seated slump: extend knee + flex foot, release. Gentle, rhythmic' },
  ],
  rules: 'Deep buttock ache only — electric, sharp, or tingling down the leg means ease off. Never bounce; breathe through every hold. Flare-up days: run it 3× and skip the vest. Stand every hour of the workday.',
  strengthNote: 'Clamshells, side-lying abduction, bridges, and the step-up knee-tracking cue are the strengthening half — an equal partner to stretching, not a warm-up formality.',
};

// Leg-day primer (renders FIRST on leg days, stretch sequence + activation).
export const PRIMER = {
  minutes: 6,
  steps: [
    'Stretch sequence (short pass) — left first',
    'Clamshells ×15/side — left first',
    'Side-lying DB abduction ×12/side — left first',
    'Glute bridge ×15',
  ],
};

// ── Rowing (all rows POST-lift — never programmed in the morning) ────────────
// Per dow: {min,max} = Z2 row after the lift · 'engine' = rowing lives inside
// the engine · null = off.
export const ROWS = {
  1: { min: 20, max: 30 }, 2: { min: 20, max: 30 }, 4: { min: 20, max: 30 },
  5: { min: 25, max: 40 },                       // the long one
  3: 'engine', 6: 'engine',
  0: null,
};
export const ROW_PROTOCOL = 'Zone 2 · conversational · damper 3–5 · ~120–140 bpm';
export const CRAMP_NOTE = 'Easy pace only on Z2 days. Electrolytes on every training day. If a quad tightens mid-row or the left hip flares at the catch — stop, shorten the stroke next session, lower the damper.';

// ── Engine library (16) — all overhead-free, jump-free, one-footprint ────────
export const ENGINE_RULES = {
  load: 'Pick loads you could do 20+ reps with — this is an engine, not a max. If a minute runs past :45, cut the calories by 2–3 next round.',
  flare: 'Left hip flared? Take the flareSwap version and drop the vest.',
};

export const ENGINES = [
  // WEDNESDAY POOL (strength-leaning)
  { id: 'wed-1', name: 'Front Rack Four', pool: 'wed', format: 'EMOM 16 · 4 rounds', durationMin: 16, scoreType: 'completed',
    blocks: [['Min 1', 'Row 12–15 cal'], ['Min 2', 'DB front-rack squat ×10 — DBs racked at the collarbones'], ['Min 3', 'DB sumo deadlift ×10'], ['Min 4', 'Rest']],
    loadNote: null, flareSwap: 'Replace sumo deadlift with glute bridge ×20' },
  { id: 'wed-2', name: 'Thrust Blocks', pool: 'wed', format: 'E2MOM 20 · 10 rounds', durationMin: 20, scoreType: 'completed',
    blocks: [['Every 2:00', '8 barbell hip thrusts → row 20 cal → rest the remainder of the window']],
    loadNote: 'Hip thrust at ~50% of your Wednesday working weight — speed and lockout, not grind.',
    flareSwap: 'Single-leg hip thrust ×6/side, bodyweight' },
  { id: 'wed-3', name: 'Pull-Through Climb', pool: 'wed', format: 'Ascending ladder 1→8 · cap 20 min', durationMin: 20, scoreType: 'time',
    blocks: [['Round n', '(n × 2) cable pull-throughs + 10 cal row — rounds 1 through 8']],
    loadNote: null, flareSwap: 'Swap pull-through for glute bridge, same reps' },
  { id: 'wed-4', name: 'Unilateral Three', pool: 'wed', format: 'EMOM 18 · 6 rounds', durationMin: 18, scoreType: 'completed',
    blocks: [['Min 1', 'B-stance DB RDL ×8/side'], ['Min 2', 'Row 14 cal'], ['Min 3', 'Rear-foot-elevated split squat ×8/side']],
    loadNote: null, flareSwap: 'Split squat to bodyweight, reps to 6/side' },
  { id: 'wed-5', name: 'Hinge Engine', pool: 'wed', format: 'AMRAP 14', durationMin: 14, scoreType: 'rounds',
    blocks: [['Round', '12 cal row → DB swing ×15 (hinge — DB stops at eye level) → glute bridge ×20']],
    loadNote: null, flareSwap: 'Replace DB swing with cable pull-through ×15' },
  { id: 'wed-6', name: 'Classic Three', pool: 'wed', format: '21-15-9 for time · cap 18 min', durationMin: 18, scoreType: 'time',
    blocks: [['21-15-9', 'Calorie row + goblet squat + single-leg hip thrust (total, alternating sides)']],
    loadNote: null, flareSwap: 'Two-leg hip thrust, same reps' },
  { id: 'wed-7', name: 'Sprint & Hinge', pool: 'wed', format: 'Every 90s × 14 · 21 min', durationMin: 21, scoreType: 'completed',
    blocks: [['Odd', '10 cal HARD row'], ['Even', 'Barbell good morning ×8 — light; a hinge pattern, not a max']],
    loadNote: null, flareSwap: 'Replace good morning with bench reverse hyper ×12' },
  { id: 'wed-8', name: 'Tabata Triple', pool: 'wed', format: '3 × tabata (8 × 20s/10s) · 2:00 rest between · ~16 min', durationMin: 16, scoreType: 'completed',
    blocks: [['Block 1', 'Rower'], ['Block 2', 'Cable pull-through'], ['Block 3', 'Glute bridge hold — isometric through every 20s']],
    loadNote: null, flareSwap: 'Replace block 2 with side-lying abduction' },

  // SATURDAY POOL (volume/pump)
  { id: 'sat-1', name: 'Vest Step Engine', pool: 'sat', format: 'EMOM 20 · 5 rounds', durationMin: 20, scoreType: 'completed',
    blocks: [['Min 1', 'Row 14–16 cal'], ['Min 2', 'Vest step-ups ×12'], ['Min 3', 'Goblet squat ×12'], ['Min 4', 'Rest']],
    loadNote: null, flareSwap: 'Drop the vest, step-ups to a lower surface' },
  { id: 'sat-2', name: 'Three-Piece', pool: 'sat', format: 'AMRAP 12', durationMin: 12, scoreType: 'rounds',
    blocks: [['Round', 'Row 12 cal → goblet squat ×10 → vest step-ups ×10']],
    loadNote: null, flareSwap: 'Drop the vest' },
  { id: 'sat-3', name: 'The Fifty', pool: 'sat', format: 'Chipper for time · cap 22 min', durationMin: 22, scoreType: 'time',
    blocks: [['Chipper', '50 cal row → 40 in-place reverse lunges (alt) → 30 DB swings → 20 single-leg hip thrusts (10/side) → 10 curtsy lunges/side']],
    loadNote: null, flareSwap: 'Reverse lunges bodyweight, curtsy lunges → glute bridge ×20' },
  { id: 'sat-4', name: 'Four Corners', pool: 'sat', format: 'EMOM 24 · 6 rounds', durationMin: 24, scoreType: 'completed',
    blocks: [['Min 1', 'Row 12 cal'], ['Min 2', 'Cable pull-through ×15'], ['Min 3', 'In-place reverse lunge ×10/side'], ['Min 4', 'Rest']],
    loadNote: null, flareSwap: 'Reverse lunge → step-up ×8/side' },
  { id: 'sat-5', name: 'The 500s', pool: 'sat', format: '5 × 500m on a 4:00 clock · ~20 min', durationMin: 20, scoreType: 'time',
    blocks: [['Each 4:00', '500m row → 15 frog pumps + 20s glute bridge hold → rest until the next 4:00 — log all five splits']],
    loadNote: null, flareSwap: null },
  { id: 'sat-6', name: 'Down the Stack', pool: 'sat', format: 'Descending ladder 10→1 · cap 20 min', durationMin: 20, scoreType: 'time',
    blocks: [['Round n', 'Single-leg DB hip thrust ×n per side + 8 cal row']],
    loadNote: null, flareSwap: 'Two-leg hip thrust, ×n total' },
  { id: 'sat-7', name: 'Death by Step-Up', pool: 'sat', format: 'Ascending to failure · cap 16 min', durationMin: 16, scoreType: 'completed',
    blocks: [['Min 1', '3 step-ups/leg, +2 reps per leg each minute'], ['Every 4th min', 'Row 12 cal instead of step-ups'], ['End', 'Continue until a minute can’t be completed — log the last full minute']],
    loadNote: null, flareSwap: 'Start at 2/leg, +1 per minute, no vest' },
  { id: 'sat-8', name: 'Tempo Engine', pool: 'sat', format: 'EMOM 20 · 5 rounds', durationMin: 20, scoreType: 'completed',
    blocks: [['Min 1', 'Row 15 cal'], ['Min 2', 'Goblet squat ×8 — 3-second lowering'], ['Min 3', 'DB RDL ×8 — 3-second lowering'], ['Min 4', 'Rest']],
    loadNote: 'Tempo days go lighter than they feel like they should. The eccentric is the work.',
    flareSwap: 'RDL → glute bridge ×20, same tempo' },
];

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
// dow: 0=Sun … 6=Sat. type drives meals (training/rest); session keys PROGRAM.
export const WEEK = {
  1: { dow: 1, name: 'Mon', type: 'training', session: 'mon', dinner: 'Salmon · sear fresh' },
  2: { dow: 2, name: 'Tue', type: 'training', session: 'tue', dinner: 'Sirloin · sear fresh' },
  3: { dow: 3, name: 'Wed', type: 'training', session: 'wed', dinner: 'Ground turkey · from prep' },
  4: { dow: 4, name: 'Thu', type: 'training', session: 'thu', dinner: 'Chicken · from prep' },
  5: { dow: 5, name: 'Fri', type: 'training', session: 'fri', dinner: 'Sirloin · sear fresh' },
  6: { dow: 6, name: 'Sat', type: 'training', session: 'sat', dinner: 'Ground turkey · from prep' },
  0: { dow: 0, name: 'Sun', type: 'rest',     session: 'sun', dinner: 'Leftovers', prep: hm(15, 30) },
};

// ── Fixed daily anchors ──────────────────────────────────────────────────────
export const ANCHORS = {
  wakeWeekday: hm(4, 30),
  wakeWeekend: hm(6, 30),
  workStart: hm(6, 0),
  meeting: { start: hm(5, 30), end: hm(6, 0), weekdaysOnly: true }, // Mon–Fri
  dogWalk: { start: hm(10, 0), end: hm(11, 30) }, // 1000 Acre, home ~11a–12p
  liftDefault: { start: hm(15, 15), end: hm(16, 15) },
  rehab1: hm(12, 0),          // round 1 · after the dog walk
  engineStart: hm(16, 15),    // leg-day engine, right after the lift
  rowStart: hm(16, 20),       // Z2 row, right after the lift
};

export const APP = {
  name: 'The Day',
  short: 'The Day',
  weekdayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export default {
  hm, fmtTime, isWeekend, mealTime,
  PHASES, CHECKIN_ANCHOR, CHECKIN_INTERVAL_DAYS,
  MFF_START, MEAL_ERAS, ATHLETE, PROGRAM, FREQ_NOTE, REHAB, PRIMER,
  ROWS, ROW_PROTOCOL, CRAMP_NOTE, ENGINES, ENGINE_RULES,
  PREP_STEPS, WEEK, ANCHORS, APP,
};
