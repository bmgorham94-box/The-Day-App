// The Day — WOD tab: the single training surface.
// Hero → primer/rehab → strength (set logging) → engine (leg days, with timer)
// → row → finish sequence. Today is loggable; other days are view-only plans.
import {
  PROGRAM, WEEK, APP, REHAB, PRIMER, ROWS, ROW_PROTOCOL, CRAMP_NOTE,
  ENGINE_RULES, ATHLETE, fmtTime,
} from './config.js';
import {
  isoDate, dowOf, addDaysISO, engineFor, engineCycleInfo, engineShuffleOptions,
} from './engine.js';
import { Store } from './store.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const todayISO = () => isoDate(new Date());

// selected date within the WOD tab (defaults to today on each app open)
let selected = null;

// ── Timer (timestamp-based — survives backgrounding without drift) ───────────
const Timer = {
  running: false, mode: null, startTs: 0, durationSec: 0, beepedMin: -1,
  intervalId: null, wakeLock: null, doneFired: false,

  async start(mode, durationMin) {
    this.stop(true);
    this.mode = mode;                       // 'emom' | 'stopwatch'
    this.durationSec = (durationMin || 0) * 60;
    this.startTs = Date.now();              // elapsed derives from wall clock
    this.running = true; this.beepedMin = 0; this.doneFired = false;
    this.intervalId = setInterval(() => this.tick(), 250);
    this.acquireLock();
    this.tick();
  },
  stop(silent) {
    this.running = false;
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    if (this.wakeLock) { try { this.wakeLock.release(); } catch {} this.wakeLock = null; }
    if (!silent) this.render();
  },
  reset() { this.stop(true); this.mode = null; this.render(); },
  elapsedSec() { return this.running ? (Date.now() - this.startTs) / 1000 : 0; },

  async acquireLock() {
    try { if ('wakeLock' in navigator) this.wakeLock = await navigator.wakeLock.request('screen'); } catch {}
  },

  tick() {
    if (!this.running) return;
    const e = this.elapsedSec();
    if (this.mode === 'emom') {
      const min = Math.floor(e / 60);
      if (min > this.beepedMin && e < this.durationSec) { this.beepedMin = min; this.beep(1); }
      if (e >= this.durationSec && !this.doneFired) { this.doneFired = true; this.beep(3); this.stop(true); }
    }
    this.render();
  },
  beep(times) {
    try {
      const ctx = this.audio || (this.audio = new (window.AudioContext || window.webkitAudioContext)());
      for (let i = 0; i < times; i++) {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = 880; o.type = 'sine';
        o.connect(g); g.connect(ctx.destination);
        const t0 = ctx.currentTime + i * 0.25;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.start(t0); o.stop(t0 + 0.2);
      }
    } catch {}
    try { if (navigator.vibrate) navigator.vibrate(times === 1 ? 100 : [150, 80, 150, 80, 150]); } catch {}
  },

  render() {
    const face = document.getElementById('timerFace');
    const sub = document.getElementById('timerSub');
    if (!face) return;
    const e = this.elapsedSec();
    if (!this.running && !this.mode) { face.textContent = '—:—'; if (sub) sub.textContent = 'timer idle'; return; }
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    if (this.mode === 'emom') {
      const total = this.durationSec;
      const remInMin = this.running ? 60 - (e % 60) : 0;
      const min = Math.min(Math.floor(e / 60) + 1, total / 60);
      face.textContent = this.running ? fmt(remInMin === 60 ? 0 : remInMin) : 'done';
      if (sub) sub.textContent = this.running ? `minute ${min} of ${total / 60} · total ${fmt(Math.min(e, total))}` : `finished · ${fmt(total)}`;
    } else {
      face.textContent = fmt(e);
      if (sub) sub.textContent = this.running ? 'stopwatch running' : 'stopwatch';
    }
  },
};
// Re-acquire the wake lock when the tab returns to the foreground mid-timer.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Timer.running) Timer.acquireLock();
});

// ── Checklist helper ─────────────────────────────────────────────────────────
function checklist(iso, prefix, items, editable) {
  const ul = el('<ul class="steps"></ul>');
  items.forEach((it, i) => {
    const id = `${prefix}:${i}`;
    const done = Store.isChecked(iso, id);
    const name = typeof it === 'string' ? it : it.name;
    const dose = typeof it === 'string' ? '' : it.dose;
    const cue = typeof it === 'string' ? '' : it.cue;
    const li = el(`<li class="${done ? 'done' : ''}" ${editable ? `data-checkitem="${id}"` : ''} style="${editable ? 'cursor:pointer' : ''}">
      <span class="box">${done ? '✓' : ''}</span>
      <span style="flex:1"><span class="s-name">${esc(name)}</span>${cue ? `<div class="s-cue">${esc(cue)}</div>` : ''}</span>
      ${dose ? `<span class="s-dose">${esc(dose)}</span>` : ''}
    </li>`);
    ul.appendChild(li);
  });
  return ul;
}

// ── Sections ─────────────────────────────────────────────────────────────────
function heroCard(iso) {
  const day = WEEK[dowOf(iso)];
  const s = PROGRAM[day.session];
  return el(`<div class="hero tone-${s.kind}">
    <div class="eyebrow">${esc(APP.weekdayNames[dowOf(iso)])} · ${esc(iso)}</div>
    <div class="hero-title">${esc(s.title)}</div>
    <div class="hero-sub">${esc(s.sub)}</div>
  </div>`);
}

function rehabCard(iso, editable, isLegDay) {
  const card = el(`<div class="panel-card"></div>`);
  if (isLegDay) {
    card.appendChild(el(`<h2>Primer · ${PRIMER.minutes}′</h2>`));
    card.appendChild(el(`<div class="desc">${esc(REHAB.name)} + activation — left first, every time.</div>`));
    card.appendChild(checklist(iso, 'primer', PRIMER.steps, editable));
    card.appendChild(el(`<div class="callout" style="margin-top:10px">${esc(REHAB.strengthNote)}</div>`));
  } else {
    card.appendChild(el(`<h2>${esc(REHAB.name)}</h2>`));
    card.appendChild(el(`<div class="desc">${esc(REHAB.cadence)} · this is round 1</div>`));
    card.appendChild(checklist(iso, 'rehab1', REHAB.moves, editable));
    card.appendChild(el(`<div class="callout" style="margin-top:10px">${esc(REHAB.rules)}</div>`));
  }
  return card;
}

function setGrid(iso, ex, editable) {
  const sets = Store.getSets(iso, ex.id);
  const defaultCount = Math.max(sets.length, parseInt(ex.scheme, 10) || 3);
  const grid = el(`<div class="set-grid" data-ex="${ex.id}"></div>`);
  for (let i = 0; i < defaultCount; i++) {
    const s = sets[i] || { w: '', r: '' };
    grid.appendChild(el(`<span class="set-cell">
      <input type="number" inputmode="decimal" placeholder="lb" value="${s.w ?? ''}" data-set-w="${ex.id}:${i}" aria-label="Set ${i + 1} weight" ${editable ? '' : 'disabled'} />
      <span class="x">×</span>
      <input type="number" inputmode="numeric" placeholder="reps" value="${s.r ?? ''}" data-set-r="${ex.id}:${i}" aria-label="Set ${i + 1} reps" ${editable ? '' : 'disabled'} />
    </span>`));
  }
  if (editable) {
    grid.appendChild(el(`<button class="set-add" data-set-add="${ex.id}" aria-label="Add set">+</button>`));
    if (defaultCount > 1) grid.appendChild(el(`<button class="set-del" data-set-del="${ex.id}" aria-label="Remove last set">−</button>`));
  }
  return grid;
}

function strengthCard(iso, editable) {
  const day = WEEK[dowOf(iso)];
  const s = PROGRAM[day.session];
  const card = el(`<div class="panel-card"></div>`);
  card.appendChild(el(`<h2>Strength</h2>`));
  card.appendChild(el(`<div class="desc">${esc(ATHLETE.loadRule)}</div>`));
  const table = el(`<div class="ex-table"></div>`);
  table.appendChild(el(`<div class="ex-head"><span>Exercise</span><span>Target</span></div>`));
  for (const ex of s.exercises) {
    const row = el(`<div class="ex-row"></div>`);
    const tags = (ex.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join(' ');
    row.appendChild(el(`<div class="ex-name"><span>${esc(ex.name)}</span> ${tags} <span class="ex-scheme">${esc(ex.scheme)}</span></div>`));
    row.appendChild(el(`<div class="ex-cue">${esc(ex.cue)}</div>`));
    const last = Store.lastSets(iso, ex.id);
    if (last) {
      const txt = last.sets.map((x) => `${x.w || '—'}×${x.r || '—'}`).join(' · ');
      row.appendChild(el(`<div class="ex-last">Last (${esc(last.iso.slice(5))}): ${esc(txt)} — beat it</div>`));
    }
    row.appendChild(setGrid(iso, ex, editable));
    table.appendChild(row);
  }
  card.appendChild(table);
  if (editable) {
    const done = Store.isChecked(iso, 'lift');
    card.appendChild(el(`<div class="btn-row"><button class="btn ${done ? '' : 'primary'} big" data-lift-done>${done ? '✓ Session logged — tap to un-log' : 'Mark session done'}</button></div>`));
  }
  return card;
}

function engineCard(iso, editable) {
  const state = Store.engineState();
  const eng = engineFor(iso, state);
  if (!eng) return null;
  const info = engineCycleInfo(iso, state);
  const score = Store.getScore(iso);
  const card = el(`<div class="engine"></div>`);
  card.appendChild(el(`<div class="eyebrow">Engine · ${esc(eng.pool === 'wed' ? 'strength-leaning' : 'volume / pump')}</div>`));
  card.appendChild(el(`<h2>${esc(eng.name)}</h2>`));
  card.appendChild(el(`<div class="e-format">${esc(eng.format)}</div>`));
  const ul = el(`<ul class="e-blocks"></ul>`);
  for (const [label, text] of eng.blocks) ul.appendChild(el(`<li><span class="e-min">${esc(label)}</span><span>${esc(text)}</span></li>`));
  card.appendChild(ul);
  if (eng.loadNote) card.appendChild(el(`<div class="e-note"><strong>Load:</strong> ${esc(eng.loadNote)}</div>`));
  card.appendChild(el(`<div class="e-note">${esc(ENGINE_RULES.load)}</div>`));
  if (eng.flareSwap) card.appendChild(el(`<div class="e-note"><strong>Flare swap:</strong> ${esc(eng.flareSwap)} — ${esc(ENGINE_RULES.flare)}</div>`));
  card.appendChild(el(`<div class="e-note">${esc(CRAMP_NOTE)}</div>`));
  if (info) card.appendChild(el(`<div class="e-caption">Engine ${info.pos} of ${info.of} · next: ${esc(info.next.name)}</div>`));

  if (editable) {
    // timer
    card.appendChild(el(`<div class="timer-face" id="timerFace">—:—</div>`));
    card.appendChild(el(`<div class="timer-sub" id="timerSub">timer idle</div>`));
    card.appendChild(el(`<div class="timer-ctl">
      <button class="btn primary" data-timer-emom="${eng.durationMin}">Start ${eng.durationMin}′ intervals</button>
      <button class="btn" data-timer-watch>Stopwatch</button>
      <button class="btn" data-timer-stop>Stop</button>
    </div>`));

    // score
    const st = eng.scoreType;
    const label = st === 'rounds' ? 'Score — rounds + reps' : st === 'time' ? 'Score — time (mm:ss)' : 'Score — rounds completed / last full minute';
    card.appendChild(el(`<div class="field"><label style="color:var(--ember)">${esc(label)}</label>
      <input id="engineScore" type="text" inputmode="${st === 'time' ? 'numeric' : 'text'}" placeholder="${st === 'rounds' ? 'e.g. 5 + 12' : st === 'time' ? 'e.g. 14:32' : 'e.g. all 6 rounds'}" value="${esc(score ? score.value : '')}" /></div>`));
    card.appendChild(el(`<div class="field"><label style="color:var(--ember)">Notes (optional)</label>
      <input id="engineNotes" type="text" placeholder="loads, swaps, how it felt" value="${esc(score ? score.notes : '')}" /></div>`));
    const btns = el(`<div class="btn-row"></div>`);
    btns.appendChild(el(`<button class="btn primary" data-engine-save="${eng.id}">${score ? 'Update score' : 'Save score — completes this engine'}</button>`));
    if (!score && engineShuffleOptions(iso, state).length) btns.appendChild(el(`<button class="btn" data-engine-shuffle>Shuffle</button>`));
    card.appendChild(btns);
  } else if (score) {
    card.appendChild(el(`<div class="e-caption">Scored: ${esc(score.value)}${score.notes ? ` · ${esc(score.notes)}` : ''}</div>`));
  }
  return card;
}

function rowCard(iso, editable) {
  const row = ROWS[dowOf(iso)];
  const card = el(`<div class="panel-card"></div>`);
  if (row === 'engine') {
    card.appendChild(el(`<h2>Row</h2>`));
    card.appendChild(el(`<div class="desc">Engine complete — rowing lives inside today's engine. Optional 10′ easy flush after.</div>`));
    return card;
  }
  if (!row) {
    card.appendChild(el(`<h2>Row — off</h2>`));
    card.appendChild(el(`<div class="desc">Sunday. The rower rests too.</div>`));
    return card;
  }
  const done = Store.isChecked(iso, 'row');
  const data = Store.getRowData(iso);
  card.appendChild(el(`<h2>Row · ${row.min}–${row.max}′ Zone 2</h2>`));
  card.appendChild(el(`<div class="desc">${esc(ROW_PROTOCOL)} · post-lift</div>`));
  card.appendChild(el(`<div class="callout">${esc(CRAMP_NOTE)}</div>`));
  if (editable) {
    card.appendChild(el(`<div class="btn-row">
      <button class="btn ${done ? '' : 'primary'}" data-row-done>${done ? '✓ Rowed — tap to un-log' : 'Mark row done'}</button>
    </div>`));
    card.appendChild(el(`<div class="btn-row" style="margin-top:10px">
      <input class="num-in" type="number" inputmode="numeric" placeholder="meters (opt)" value="${data.dist ?? ''}" data-row-dist aria-label="Row distance meters" />
      <input class="num-in" type="number" inputmode="numeric" placeholder="cal (opt)" value="${data.cal ?? ''}" data-row-cal aria-label="Row calories" />
    </div>`));
  } else if (done) {
    card.appendChild(el(`<div class="spark-note">✓ done${data.dist ? ` · ${data.dist} m` : ''}${data.cal ? ` · ${data.cal} cal` : ''}</div>`));
  }
  return card;
}

function finishCard(iso, editable) {
  const card = el(`<div class="panel-card"></div>`);
  card.appendChild(el(`<h2>Finish · stretch sequence</h2>`));
  card.appendChild(el(`<div class="desc">${esc(REHAB.name)} — round 2 of 2, post-session.</div>`));
  card.appendChild(checklist(iso, 'rehab2', REHAB.moves, editable));
  return card;
}

// ── Main render ──────────────────────────────────────────────────────────────
export function renderWOD(root) {
  const t = todayISO();
  if (!selected || dayDiffWeek(selected, t)) selected = t;
  const iso = selected;
  const editable = iso === t;
  const dow = dowOf(iso);
  const day = WEEK[dow];
  const isLegDay = PROGRAM[day.session].kind === 'legs';
  const isRest = day.type === 'rest';

  root.innerHTML = '';

  // date strip: the week around today (Sun..Sat)
  const strip = el(`<div class="datestrip"></div>`);
  const weekStart = addDaysISO(t, -dowOf(t));
  for (let i = 0; i < 7; i++) {
    const dISO = addDaysISO(weekStart, i);
    const tab = el(`<button class="daytab ${dISO === t ? 'is-today' : ''} ${dISO === iso ? 'is-selected' : ''}" data-wod-day="${dISO}">
      <span class="dow">${APP.weekdayNames[dowOf(dISO)]}</span>
      <span class="dnum">${Number(dISO.slice(8))}</span>
    </button>`);
    strip.appendChild(tab);
  }
  root.appendChild(strip);
  if (!editable) root.appendChild(el(`<div class="read-only-note">${iso < t ? 'Past day — view only.' : 'Planning view — logging opens on the day.'}</div>`));

  root.appendChild(heroCard(iso));

  if (isRest) {
    const card = el(`<div class="panel-card"></div>`);
    card.appendChild(el(`<h2>Extended stretch sequence</h2>`));
    card.appendChild(el(`<div class="desc">${esc(REHAB.cadence)} — run both rounds, take them long.</div>`));
    card.appendChild(checklist(iso, 'rehab1', REHAB.moves, editable));
    card.appendChild(el(`<div class="callout" style="margin-top:10px">${esc(REHAB.rules)}</div>`));
    root.appendChild(card);
    root.appendChild(rowCard(iso, editable));
    root.appendChild(finishCard(iso, editable));
    return;
  }

  root.appendChild(rehabCard(iso, editable, isLegDay));
  root.appendChild(strengthCard(iso, editable));
  if (isLegDay) {
    const ec = engineCard(iso, editable);
    if (ec) root.appendChild(ec);
    Timer.render();
  }
  root.appendChild(rowCard(iso, editable));
  root.appendChild(finishCard(iso, editable));
}

// selected belongs to this week? (returns truthy if OUT of the strip range)
function dayDiffWeek(iso, t) {
  const weekStart = addDaysISO(t, -dowOf(t));
  const weekEnd = addDaysISO(weekStart, 6);
  return iso < weekStart || iso > weekEnd;
}

// ── Events (delegated from app.js body listener) ─────────────────────────────
// Returns true if the event was handled (app should re-render the WOD view).
export function handleWODClick(e, rerender, toast) {
  const t = e.target;
  const iso = selected || todayISO();

  const dayBtn = t.closest('[data-wod-day]');
  if (dayBtn) { selected = dayBtn.dataset.wodDay; rerender(); return true; }

  const check = t.closest('[data-checkitem]');
  if (check) { Store.toggleCheck(iso, check.dataset.checkitem); rerender(); return true; }

  const add = t.closest('[data-set-add]');
  if (add) {
    const exId = add.dataset.setAdd;
    const sets = collectSets(exId);
    sets.push({ w: '', r: '' });
    Store.setSets(iso, exId, sets);
    padAndRerender(iso, exId, sets.length, rerender);
    return true;
  }
  const del = t.closest('[data-set-del]');
  if (del) {
    const exId = del.dataset.setDel;
    const sets = collectSets(exId);
    sets.pop();
    Store.setSets(iso, exId, sets);
    rerender(); return true;
  }

  if (t.closest('[data-lift-done]')) {
    const on = Store.toggleCheck(iso, 'lift');
    toast(on ? 'Session logged ✓' : 'Session un-logged');
    rerender(); return true;
  }
  if (t.closest('[data-row-done]')) {
    const on = Store.toggleCheck(iso, 'row');
    toast(on ? 'Row logged ✓' : 'Row un-logged');
    rerender(); return true;
  }

  const emom = t.closest('[data-timer-emom]');
  if (emom) { Timer.start('emom', Number(emom.dataset.timerEmom)); return true; }
  if (t.closest('[data-timer-watch]')) { Timer.start('stopwatch', 0); return true; }
  if (t.closest('[data-timer-stop]')) { Timer.stop(); return true; }

  const save = t.closest('[data-engine-save]');
  if (save) {
    const state = Store.engineState();
    const eng = engineFor(iso, state);
    const value = (document.getElementById('engineScore')?.value || '').trim();
    const notes = (document.getElementById('engineNotes')?.value || '').trim();
    if (!value) { toast('Add a score first'); return true; }
    Store.saveScore(iso, eng, value, notes);
    toast('Engine scored ✓ — rotation advanced');
    rerender(); return true;
  }
  if (t.closest('[data-engine-shuffle]')) {
    const state = Store.engineState();
    const opts = engineShuffleOptions(iso, state);
    if (opts.length) {
      const pick = opts[Math.floor(Math.random() * opts.length)];
      Store.engineSwap(iso, pick.id);
      toast(`Swapped in: ${pick.name}`);
      rerender();
    }
    return true;
  }
  return false;
}

// Input persistence (sets, row extras) — saved on change, no re-render.
export function handleWODChange(e) {
  const t = e.target;
  const iso = selected || todayISO();
  if (t.matches('[data-set-w],[data-set-r]')) {
    const key = (t.dataset.setW || t.dataset.setR);
    const exId = key.slice(0, key.lastIndexOf(':'));
    Store.setSets(iso, exId, collectSets(exId));
    return true;
  }
  if (t.matches('[data-row-dist],[data-row-cal]')) {
    const dist = document.querySelector('[data-row-dist]')?.value;
    const cal = document.querySelector('[data-row-cal]')?.value;
    Store.setRowData(iso, { dist: dist ? Number(dist) : undefined, cal: cal ? Number(cal) : undefined });
    return true;
  }
  return false;
}

function collectSets(exId) {
  const ws = [...document.querySelectorAll(`[data-set-w^="${exId}:"]`)];
  const rs = [...document.querySelectorAll(`[data-set-r^="${exId}:"]`)];
  return ws.map((w, i) => ({ w: w.value, r: rs[i] ? rs[i].value : '' }));
}
function padAndRerender(iso, exId, count, rerender) { rerender(); }

export function wodJumpToToday() { selected = todayISO(); }
export { Timer };
