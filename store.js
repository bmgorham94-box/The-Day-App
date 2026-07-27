// The Day — localStorage persistence. Keyed by ISO date, pruned >30 days.
const KEY = 'theday.v1';
const PRUNE_DAYS = 30;

const empty = () => ({
  checks: {},     // { "YYYY-MM-DD": { mealId: true, "prep:0": true, ... } }
  weight: {},     // { "YYYY-MM-DD": number }
  shift: {},      // { "YYYY-MM-DD": minutesOffset }
  loads: {},      // { exerciseKey: "225 x 5" }  (per-exercise memory)
  settings: {},   // { hevyKey: "..." }
  notes: {},      // { "YYYY-MM-DD": "sunday review note" }
});

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}
function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota / private mode */ }
}

// Remove check/shift entries older than PRUNE_DAYS. Weight + notes are kept.
function prune(state, todayISO) {
  const cutoff = new Date(todayISO + 'T12:00:00Z').getTime() - PRUNE_DAYS * 86400000;
  for (const bag of ['checks', 'shift']) {
    for (const iso of Object.keys(state[bag])) {
      if (new Date(iso + 'T12:00:00Z').getTime() < cutoff) delete state[bag][iso];
    }
  }
  return state;
}

export const Store = {
  all: () => read(),

  // ── Meal / step checks ─────────────────────────────────────────────────────
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

  // ── Weight log ──────────────────────────────────────────────────────────────
  setWeight(iso, value) {
    const s = read();
    if (value == null || value === '' || isNaN(value)) delete s.weight[iso];
    else s.weight[iso] = Number(value);
    write(s);
  },
  weightLog() { return read().weight; },

  // ── Running-late shift ──────────────────────────────────────────────────────
  getShift(iso) { return read().shift[iso] || 0; },
  setShift(iso, mins) {
    const s = read();
    if (!mins) delete s.shift[iso]; else s.shift[iso] = mins;
    write(prune(s, iso));
  },

  // ── Per-exercise load memory ────────────────────────────────────────────────
  getLoad(key) { return read().loads[key] || ''; },
  setLoad(key, value) {
    const s = read();
    if (!value) delete s.loads[key]; else s.loads[key] = value;
    write(s);
  },

  // ── Settings (Hevy key, etc.) ───────────────────────────────────────────────
  getSetting(k) { return read().settings[k]; },
  setSetting(k, v) {
    const s = read();
    if (v == null || v === '') delete s.settings[k]; else s.settings[k] = v;
    write(s);
  },

  // ── Sunday review notes ─────────────────────────────────────────────────────
  getNote(iso) { return read().notes[iso] || ''; },
  setNote(iso, v) {
    const s = read();
    if (!v) delete s.notes[iso]; else s.notes[iso] = v;
    write(s);
  },

  // ── Import / export ─────────────────────────────────────────────────────────
  export() { return JSON.stringify(read(), null, 2); },
  import(json) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    write({ ...empty(), ...parsed });
  },
  reset() { write(empty()); },
};

export default Store;
