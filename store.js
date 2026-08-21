// The Day — localStorage persistence. Keyed by ISO date, pruned by age.
// All keys are additive on one JSON doc — updates never drop logged history.
const KEY = 'theday.v1';
const PRUNE_DAYS = 30;        // checks / shift
const PRUNE_DAYS_LOG = 60;    // sets / steps / row data ("last session" lookups)
const PRUNE_DAYS_SCORE = 180; // engine scores

const empty = () => ({
  checks: {},     // { "YYYY-MM-DD": { mealId: true, "prep:0": true, "rehab1:2": true, ... } }
  weight: {},     // { "YYYY-MM-DD": number }
  shift: {},      // { "YYYY-MM-DD": minutesOffset }
  loads: {},      // legacy per-exercise memory (kept for import compat)
  settings: {},   // { hevyKey: "..." }
  notes: {},      // { "YYYY-MM-DD": "sunday review note" }
  sets: {},       // { "YYYY-MM-DD": { exId: [{w, r}] } }
  steps: {},      // { "YYYY-MM-DD": number } — manual daily steps
  rowdata: {},    // { "YYYY-MM-DD": { dist, cal } }
  scores: {},     // { "YYYY-MM-DD": { engineId, value, notes } }
  engine: { used: { wed: [], sat: [] }, swaps: {}, done: {} }, // rotation state
});

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    const s = { ...empty(), ...parsed };
    s.engine = { ...empty().engine, ...(parsed.engine || {}) };
    s.engine.used = { wed: [], sat: [], ...(s.engine.used || {}) };
    return s;
  } catch {
    return empty();
  }
}
function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota / private mode */ }
}

function olderThan(iso, todayISO, days) {
  return new Date(iso + 'T12:00:00Z').getTime() < new Date(todayISO + 'T12:00:00Z').getTime() - days * 86400000;
}
// Remove dated entries past their windows. Weight + notes are kept forever.
function prune(state, todayISO) {
  const bags = [['checks', PRUNE_DAYS], ['shift', PRUNE_DAYS], ['sets', PRUNE_DAYS_LOG],
    ['steps', PRUNE_DAYS_LOG], ['rowdata', PRUNE_DAYS_LOG], ['scores', PRUNE_DAYS_SCORE]];
  for (const [bag, days] of bags) {
    for (const iso of Object.keys(state[bag])) {
      if (olderThan(iso, todayISO, days)) delete state[bag][iso];
    }
  }
  return state;
}

export const Store = {
  all: () => read(),

  // ── Checks (meals, prep steps, rehab items, lift/row/engine done) ──
  isChecked(iso, id) {
    const s = read();
    return !!(s.checks[iso] && s.checks[iso][id]);
  },
  toggleCheck(iso, id) {
    const s = read();
    s.checks[iso] = s.checks[iso] || {};
    if (s.checks[iso][id]) delete s.checks[iso][id];
    else s.checks[iso][id] = true;
    write(prune(s, iso));
    return !!s.checks[iso][id];
  },
  checksFor(iso) {
    return read().checks[iso] || {};
  },

  // ── Weight log ──
  setWeight(iso, value) {
    const s = read();
    if (value == null || value === '' || isNaN(value)) delete s.weight[iso];
    else s.weight[iso] = Number(value);
    write(s);
  },
  weightLog() { return read().weight; },

  // ── Running-late shift ──
  getShift(iso) { return read().shift[iso] || 0; },
  setShift(iso, mins) {
    const s = read();
    if (!mins) delete s.shift[iso]; else s.shift[iso] = mins;
    write(prune(s, iso));
  },

  // ── Set-by-set workout log ──
  getSets(iso, exId) {
    const s = read();
    return (s.sets[iso] && s.sets[iso][exId]) || [];
  },
  setSets(iso, exId, arr) {
    const s = read();
    s.sets[iso] = s.sets[iso] || {};
    const clean = (arr || []).filter((x) => x && (x.w !== '' || x.r !== ''));
    if (clean.length) s.sets[iso][exId] = clean;
    else { delete s.sets[iso][exId]; if (!Object.keys(s.sets[iso]).length) delete s.sets[iso]; }
    write(prune(s, iso));
  },
  // Most recent prior day (< iso) that logged this exercise → { iso, sets }.
  lastSets(iso, exId) {
    const s = read();
    const days = Object.keys(s.sets).filter((d) => d < iso && s.sets[d][exId]).sort();
    if (!days.length) return null;
    const d = days[days.length - 1];
    return { iso: d, sets: s.sets[d][exId] };
  },

  // ── Steps (manual) ──
  setSteps(iso, value) {
    const s = read();
    if (value == null || value === '' || isNaN(value)) delete s.steps[iso];
    else s.steps[iso] = Math.round(Number(value));
    write(prune(s, iso));
  },
  getSteps(iso) { return read().steps[iso]; },
  stepsLog() { return read().steps; },

  // ── Row extras ──
  setRowData(iso, data) {
    const s = read();
    if (!data || (!data.dist && !data.cal)) delete s.rowdata[iso];
    else s.rowdata[iso] = data;
    write(prune(s, iso));
  },
  getRowData(iso) { return read().rowdata[iso] || {}; },

  // ── Engine rotation + scores ──
  engineState() { return read().engine; },
  engineSwap(iso, engineId) {
    const s = read();
    s.engine.swaps[iso] = engineId;
    write(s);
  },
  getScore(iso) { return read().scores[iso] || null; },
  // Saving a score completes the day's engine: record it, consume it from the
  // cycle (used list), reset the cycle after all 8, and clear the day's swap.
  saveScore(iso, engine, value, notes) {
    const s = read();
    s.scores[iso] = { engineId: engine.id, value, notes: notes || '' };
    if (!s.engine.done[iso]) {
      s.engine.done[iso] = engine.id;
      const used = s.engine.used[engine.pool] || (s.engine.used[engine.pool] = []);
      if (!used.includes(engine.id)) used.push(engine.id);
      const poolSize = 8;
      if (used.length >= poolSize) s.engine.used[engine.pool] = [];
      delete s.engine.swaps[iso];
    }
    write(prune(s, iso));
  },

  // ── Settings (Hevy key, etc.) ──
  getSetting(k) { return read().settings[k]; },
  setSetting(k, v) {
    const s = read();
    if (v == null || v === '') delete s.settings[k]; else s.settings[k] = v;
    write(s);
  },

  // ── Sunday review notes ──
  getNote(iso) { return read().notes[iso] || ''; },
  setNote(iso, v) {
    const s = read();
    if (!v) delete s.notes[iso]; else s.notes[iso] = v;
    write(s);
  },

  // ── Import / export ──
  export() { return JSON.stringify(read(), null, 2); },
  import(json) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    const base = empty();
    const merged = { ...base, ...parsed };
    merged.engine = { ...base.engine, ...(parsed.engine || {}) };
    merged.engine.used = { wed: [], sat: [], ...(merged.engine.used || {}) };
    write(merged);
  },
  reset() { write(empty()); },
};

export default Store;
