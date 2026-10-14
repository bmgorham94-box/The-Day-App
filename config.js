// The Day: single source of truth. Edit THIS FILE to change the plan;
// app code never hard codes schedule, meals, or training. ES module.
// Plan: two year classic physique build, started October 14, 2026.
// No show date, no prep timeline, no weight cap. The only gate is body fat.

// ── Time helpers ──
export const hm = (h, m = 0) => h * 60 + m;
export const fmtTime = (mins) => {
  let h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m = ((mins % 60) + 60) % 60;
  const ampm = h < 12 ? 'a' : 'p';
  h = h % 12; if (h === 0) h = 12;
  return m === 0 ? `${h}:00${ampm}` : `${h}:${String(m).padStart(2, '0')}${ampm}`;
};
export const isWeekend = (dow) => dow === 0 || dow === 6;

export const APP = {
  name: 'The Day',
  short: 'The Day',
  weekdayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

// ── THE PLAN (all values live here; UI copy uses no em dashes) ──
export const PLAN = {

  // ── Day anchors ──
  anchors: {
    wakeWeekday: hm(5, 15),
    wakeWeekend: hm(6, 30),
    workStart: hm(6, 0),                    // work about 6:00a to 2:00p Pacific
    workEnd: hm(14, 0),
    meeting: { start: hm(7, 0), end: hm(8, 0), weekdaysOnly: true },
    dogWalk: { start: hm(9, 30), end: hm(11, 30) },
    rehab1: hm(11, 35),                     // round 1, after the walk
    train: { start: hm(14, 0), end: hm(15, 0) },  // training window 2:00 to 3:00p
    postLiftMeal: hm(15, 5),
    row: hm(15, 15),                        // optional, after lifting
    rehab2: hm(16, 15),                     // round 2, after training
  },

  // ── Meals. All My Fit Foods unless marked Grocery. ──
  // Times apply every day; on weekends breakfast slides after the 6:30 wake.
  meals: {
    fixed: [
      { id: 'm-breakfast', time: hm(5, 30), timeWe: hm(6, 45), name: "Gouda Mornin' Sando, cheese removed", kcal: 300, p: 25, c: 36, f: 6, src: 'My Fit Foods, estimate without cheese' },
      { id: 'm-parfait', time: hm(9, 30), name: 'Açaí Power Parfait + Built Protein Bar', kcal: 390, p: 37, c: 47, f: 8, src: 'My Fit Foods' },
      { id: 'm-lunch', time: hm(12, 0), rotation: 'lunch', src: 'My Fit Foods' },
      { id: 'm-prelift', time: hm(14, 30), name: '4 rice cakes + whey, pre lift', kcal: 285, p: 28, c: 32, f: 2, src: 'Grocery', trainingOnly: true },
      { id: 'm-wrap', time: hm(14, 30), name: 'Chicken Salad Wrap', kcal: 350, p: 37, c: 30, f: 9, src: 'My Fit Foods', restOnly: true },
      { id: 'm-postlift', time: hm(15, 5), name: 'Whey + banana, after lift', kcal: 230, p: 25, c: 30, f: 2, src: 'Grocery', trainingOnly: true },
      { id: 'm-dinner', time: hm(18, 30), rotation: 'dinner', src: 'My Fit Foods' },
      // 8:30p: training days get the snack pack plus froyo (spec total 680/55/95/8).
      // Rest days keep the Protein Snack Pack only; its numbers are derived by
      // subtracting standard Umpqua nonfat vanilla froyo, 1.5 cups at 270/9/57/0,
      // from the combined figure. Edit here if the real label differs.
      { id: 'm-snack', time: hm(20, 30),
        training: { name: 'Protein Snack Pack + 1.5 cups Umpqua nonfat vanilla froyo', kcal: 680, p: 55, c: 95, f: 8, src: 'My Fit Foods + grocery' },
        rest: { name: 'Protein Snack Pack', kcal: 410, p: 46, c: 38, f: 8, src: 'My Fit Foods' } },
    ],
    // Lunch and dinner rotation by day of week (0=Sun). Real macros, used in totals.
    rotation: {
      1: { lunch: { name: 'BBQ Chicken Sando', kcal: 490, p: 44, c: 34, f: 20 }, dinner: { name: 'Marine Corps Mash, regular', kcal: 550, p: 54, c: 43, f: 18 } },
      2: { lunch: { name: 'Harissa Chicken Bowl', kcal: 400, p: 54, c: 30, f: 7 }, dinner: { name: 'Taco Bowl, regular', kcal: 540, p: 51, c: 48, f: 16 } },
      3: { lunch: { name: 'BBQ Chicken Sando', kcal: 490, p: 44, c: 34, f: 20 }, dinner: { name: 'The Hawaiian, regular', kcal: 560, p: 51, c: 49, f: 18 } },
      4: { lunch: { name: 'Harissa Chicken Bowl', kcal: 400, p: 54, c: 30, f: 7 }, dinner: { name: 'Marine Corps Mash, regular', kcal: 550, p: 54, c: 43, f: 18 } },
      5: { lunch: { name: 'BBQ Chicken Sando', kcal: 490, p: 44, c: 34, f: 20 }, dinner: { name: 'Fit Turkey Pasta, regular', kcal: 540, p: 50, c: 49, f: 16 } },
      6: { lunch: { name: 'BBQ Chicken Sando', kcal: 490, p: 44, c: 34, f: 20 }, dinner: { name: 'Taco Bowl, regular', kcal: 540, p: 51, c: 48, f: 16 } },
      0: { lunch: { name: 'Lean Lemon Turkey', kcal: 470, p: 47, c: 40, f: 13 }, dinner: { name: 'Moroccan Chicken, regular', kcal: 480, p: 57, c: 41, f: 10 } },
    },
  },

  // ── Weekly My Fit Foods order, shown Sunday as a check off ──
  weeklyOrder: [
    "7 Gouda Mornin' Sando",
    '7 Açaí Power Parfait',
    '7 Built Protein Bars',
    '4 BBQ Chicken Sando, 2 Harissa Chicken Bowl, 1 Lean Lemon Turkey',
    '2 Marine Corps Mash, 2 Taco Bowl, 1 The Hawaiian, 1 Fit Turkey Pasta, 1 Moroccan Chicken, all regular',
    '7 Protein Snack Pack',
    '1 Chicken Salad Wrap',
    'Grocery: whey, rice cakes, bananas, Umpqua nonfat vanilla froyo, electrolyte packets, creatine',
  ],

  // ── Training. Hevy stays the lifting log; The Day shows the session and
  //    whether it got done. Exercises render as check offs. ──
  training: {
    days: {
      mon: { title: 'Back A', where: 'Home', kind: 'upper',
        focus: 'Width: vertical pulling, stretch focused rows, lower lats, rear delts',
        exercises: [
          { id: 'ba-1', name: 'Pull ups or Athena lat pulldown', sets: '3 × 8 to 12' },
          { id: 'ba-2', name: 'Athena single arm lat pulldown', sets: '3 × 10 to 12' },
          { id: 'ba-3', name: 'Chest supported dumbbell row on the incline bench', sets: '3 × 10 to 12' },
          { id: 'ba-4', name: 'Athena straight arm pulldown', sets: '3 × 12 to 15' },
          { id: 'ba-5', name: 'Rear delt fly', sets: '3 × 15' },
          { id: 'ba-6', name: 'Dumbbell curl', sets: '3 × 10 to 12' },
        ] },
      tue: { title: 'Push', where: 'Home', kind: 'upper',
        focus: 'Chest, delts, arms at maintenance; upper chest gets the pressing priority',
        exercises: [
          { id: 'pu-1', name: 'Incline dumbbell press', sets: '3 × 8 to 10' },
          { id: 'pu-2', name: 'Flat barbell bench', sets: '3 × 6 to 8' },
          { id: 'pu-3', name: 'Athena low to high fly', sets: '3 × 12 to 15' },
          { id: 'pu-4', name: 'Seated dumbbell shoulder press', sets: '3 × 8 to 10' },
          { id: 'pu-5', name: 'Lateral raise', sets: '3 × 15' },
          { id: 'pu-6', name: 'Athena triceps pushdown', sets: '3 × 12 to 15' },
        ] },
      wed: { title: 'Lower A', where: 'LA Fitness', kind: 'legs',
        focus: 'Quads first, then calves',
        exercises: [
          { id: 'la-1', name: 'Leg press, feet mid', sets: '3 × 10 to 12' },
          { id: 'la-2', name: 'Hack squat', sets: '3 × 8 to 10', note: 'If it bothers the hip, Smith squat with heels elevated.' },
          { id: 'la-3', name: 'Leg extension, slow on the way down', sets: '3 × 12 to 15' },
          { id: 'la-4', name: 'Single leg leg press, feet mid', sets: '2 × 10 to 12 each side', tags: ['LEFT FIRST'] },
          { id: 'la-5', name: 'Seated calf raise', sets: '4 × 12 to 15' },
          { id: 'la-6', name: 'Seated leg curl, light', sets: '2 × 12' },
        ] },
      thu: { title: 'Back B', where: 'Home', kind: 'upper',
        focus: 'Thickness: heavier rows, shrugs, mid back, arms',
        exercises: [
          { id: 'bb-1', name: 'Barbell row or landmine row', sets: '3 × 8 to 10' },
          { id: 'bb-2', name: 'Single arm dumbbell row', sets: '3 × 10 to 12' },
          { id: 'bb-3', name: 'Athena seated row', sets: '3 × 10 to 12' },
          { id: 'bb-4', name: 'Barbell shrug', sets: '3 × 12 to 15' },
          { id: 'bb-5', name: 'Face pull', sets: '3 × 15' },
          { id: 'bb-6', name: 'Hammer curl', sets: '3 × 10 to 12' },
        ] },
      fri: { title: 'Upper pump', where: 'Home', kind: 'upper',
        focus: 'Light upper body pump, calves, abs, vacuum',
        exercises: [
          { id: 'up-1', name: 'Athena fly', sets: '2 × 15 to 20' },
          { id: 'up-2', name: 'Lateral raise', sets: '2 × 20' },
          { id: 'up-3', name: 'Athena pushdown', sets: '2 × 20' },
          { id: 'up-4', name: 'Dumbbell curl', sets: '2 × 20' },
          { id: 'up-5', name: 'Standing calf raise on a plate', sets: '4 × 15' },
          { id: 'up-6', name: 'Abs', sets: '3 sets' },
          { id: 'up-vac', name: 'Vacuum practice', sets: '5 holds of 10 to 15s', note: 'Building to 30 seconds over two months.' },
        ] },
      sat: { title: 'Lower B', where: 'LA Fitness', kind: 'legs',
        focus: 'Glutes and hamstrings first, then calves',
        exercises: [
          { id: 'lb-1', name: 'Hip thrust, machine or Smith', sets: '3 × 10 to 12' },
          { id: 'lb-2', name: 'Seated leg curl', sets: '3 × 10 to 12' },
          { id: 'lb-3', name: 'Leg press, feet high and wide', sets: '3 × 10 to 12' },
          { id: 'lb-4', name: 'Walking lunges or step ups', sets: '2 × 10 each side', tags: ['LEFT FIRST'] },
          { id: 'lb-5', name: 'Hip abduction machine', sets: '2 × 15' },
          { id: 'lb-6', name: 'Standing calf raise', sets: '4 × 10 to 12' },
        ] },
      sun: { title: 'Rest', where: '', kind: 'rest', focus: 'Dog walk, mobility', exercises: [] },
    },

    // Leg day pre session checklist, shown above the exercises on Wed and Sat.
    legChecklist: [
      'Electrolytes: 16 to 20 oz water with an electrolyte packet in the hour before',
      '6 to 8 minutes on the bike until warm',
      'Rehab sequence',
      'Glute bridges and banded abductions',
      'Rule: left side first on every unilateral movement',
      'Rule: cramp starts mid set, rack it, stand up, walk it off, finish lighter',
    ],

    // Reintroduction phase for legs, by date.
    reintro: {
      p1: { start: '2026-10-14', end: '2026-10-28', sets: 2,
        label: 'Phase 1: 2 sets of everything, stop 3 reps short of failure, 2 to 3 minutes rest, no drop sets' },
      p2: { start: '2026-10-28', end: '2026-11-11',
        label: 'Phase 2: 3 sets, add load' },
      banUntil: '2026-11-14',
      banNote: 'No RDLs or loaded back extensions before November 14, 2026.',
    },

    cardio: {
      note: 'Echo rower after lifting, 30 to 40 minutes. Optional, at most three times a week during a build block.',
      capPerWeek: 3,
    },
  },

  // ── Daily blocks, every day ──
  daily: {
    posture: {
      minutes: 10,
      items: [
        'Hip flexor stretch, 2 minutes per side',
        'Pec and front delt stretch, 2 minutes',
      ],
      cue: 'Ribs down, glutes on, shoulders back and down.',
    },
    supplements: ['Creatine 5 g', 'Fish oil'],
  },

  // ── Tracking ──
  tracking: {
    checkinAnchor: '2026-10-18',          // every 14 days from here
    checkinInterval: 14,
    seed: { iso: '2026-10-04', lb: 176.0, bf: 15 },
    bfGatePct: 17,
    bfGateBanner: 'Build block ends. Start the mini cut.',
    weighNote: 'Judge the 7 day average, never a single day.',
  },
};

// ── Rehab sequence, piriformis and sciatic. Kept from the existing app. ──
export const REHAB = {
  name: 'Piriformis Protocol v2',
  cadence: '2× daily: after the dog walk + after training',
  moves: [
    { name: 'Glute smash (ball or roller)', dose: '60 to 90s', cue: 'Optional primer on the left glute' },
    { name: 'Supine Figure 4', dose: '3 × 30 to 45s', cue: 'Left first. Deep hip flexion, external rotation, adduction: the position that lengthens the piriformis most' },
    { name: 'Cross Body Knee Pull', dose: '3 × 30s', cue: 'Left knee toward right shoulder. Deep buttock ache means correct' },
    { name: 'Seated Figure 4 Hinge', dose: '2 × 30s', cue: 'The desk version, use on work breaks' },
    { name: 'Sciatic Nerve Glide', dose: '8 to 10 reps', cue: 'Seated slump: extend knee + flex foot, release. Gentle, rhythmic' },
  ],
  rules: 'Deep buttock ache only. Electric, sharp, or tingling down the leg means ease off. Never bounce; breathe through every hold. Stand every hour of the workday.',
};

// ── Week map: day type + training session key per day of week ──
export const WEEK = {
  1: { dow: 1, name: 'Mon', type: 'training', session: 'mon' },
  2: { dow: 2, name: 'Tue', type: 'training', session: 'tue' },
  3: { dow: 3, name: 'Wed', type: 'training', session: 'wed' },
  4: { dow: 4, name: 'Thu', type: 'training', session: 'thu' },
  5: { dow: 5, name: 'Fri', type: 'training', session: 'fri' },
  6: { dow: 6, name: 'Sat', type: 'training', session: 'sat' },
  0: { dow: 0, name: 'Sun', type: 'rest', session: 'sun' },
};

export default { hm, fmtTime, isWeekend, APP, PLAN, REHAB, WEEK };
