// The Day — app orchestration. Vanilla ES module, no framework.
import { APP, WEEK, ROW } from './config.js';
import {
  isoDate, parseISO, dowOf, resolvePhase, resolveEra, targetsFor, isCheckinDay,
  buildDay, mealsFor, mealSum, fmtTime, dayDiff,
} from './engine.js';
import { Store } from './store.js';
import { buildICS, downloadICS } from './ics.js';

// ── Live clock ───────────────────────────────────────────────────────────────
const now = () => new Date();
const todayISO = () => isoDate(now());
const nowMins = () => { const d = now(); return d.getHours() * 60 + d.getMinutes(); };

// ── App state ────────────────────────────────────────────────────────────────
let state = {
  view: 'today',
  selected: todayISO(),
};
let lastToday = todayISO();
let lastUndo = null;

const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── Rendering ────────────────────────────────────────────────────────────────
function render() {
  renderTopbar();
  const isToday = state.selected === todayISO();

  $('#focus').style.display = state.view === 'today' ? '' : 'none';
  $('#spine').style.display = state.view === 'today' ? '' : 'none';
  $('#banners').style.display = state.view === 'today' ? '' : 'none';

  if (state.view === 'today') {
    renderBanners(isToday);
    renderFocus(isToday);
    renderSpine(isToday);
    renderPanelsToday(isToday);
  } else if (state.view === 'adherence') {
    renderAdherence();
  } else if (state.view === 'targets') {
    renderTargets();
  } else if (state.view === 'settings') {
    renderSettings();
  }

  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.view === state.view;
    t.classList.toggle('is-active', on);
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
}

function renderTopbar() {
  const iso = state.selected;
  const phase = resolvePhase(iso);
  const checkin = isCheckinDay(iso);
  const badges = $('#badges');
  badges.innerHTML = '';
  badges.appendChild(el(`<span class="badge phase">${escapeHtml(phase.badge)}</span>`));
  const era = resolveEra(iso);
  if (era.chip) badges.appendChild(el(`<span class="badge era">${escapeHtml(era.chip)}</span>`));
  if (checkin) badges.appendChild(el(`<span class="badge checkin">Photos + measurements</span>`));

  // Week strip: 7 days around today, today ringed, selected highlighted.
  const strip = $('#weekstrip');
  strip.innerHTML = '';
  const base = parseISO(todayISO());
  for (let i = -1; i <= 5; i++) {
    const d = new Date(base); d.setUTCDate(d.getUTCDate() + i);
    const diso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const dow = dowOf(diso);
    const tab = el(`<button class="daytab" role="tab" data-day="${diso}" aria-label="${APP.weekdayNames[dow]} ${d.getUTCDate()}">
      <span class="dow">${APP.weekdayNames[dow]}</span>
      <span class="dnum">${d.getUTCDate()}</span>
    </button>`);
    if (diso === todayISO()) tab.classList.add('is-today');
    if (diso === state.selected) { tab.classList.add('is-selected'); tab.setAttribute('aria-selected', 'true'); }
    strip.appendChild(tab);
  }
}

function renderBanners(isToday) {
  const box = $('#banners');
  box.innerHTML = '';
  const phase = resolvePhase(state.selected);
  if (phase.tbd) box.appendChild(el(`<div class="banner">⚠︎ ${escapeHtml(phase.tbdBanner)}</div>`));
}

// current + next block for the focus card
function focusBlocks(blocks, isToday) {
  if (!isToday) return { current: null, next: blocks[0] || null };
  const m = nowMins();
  let current = null, next = null;
  for (const b of blocks) {
    if (b.start <= m) current = b; else { next = b; break; }
  }
  return { current, next };
}

function countdownText(mins) {
  const delta = mins - nowMins();
  if (delta <= 0) return 'now';
  const h = Math.floor(delta / 60), mm = delta % 60;
  if (h === 0) return `in ${mm} min`;
  if (mm === 0) return `in ${h} hr`;
  return `in ${h} hr ${mm} min`;
}

function renderFocus(isToday) {
  const focus = $('#focus');
  const blocks = currentBlocks();
  const { current, next } = focusBlocks(blocks, isToday);

  if (!isToday) {
    const day = WEEK[dowOf(state.selected)];
    focus.innerHTML = `
      <div class="now-label">Planning view</div>
      <div class="now-title">${escapeHtml(day.name)} · ${day.type === 'training' ? 'Training' : 'Rest'} day</div>
      <div class="now-sub">Read-only. Tap Today to log.</div>`;
    return;
  }

  let elapsedPct = 0;
  if (current) {
    const end = current.end != null ? current.end : (next ? next.start : current.start + 60);
    elapsedPct = Math.max(0, Math.min(100, ((nowMins() - current.start) / Math.max(1, end - current.start)) * 100));
  }

  focus.innerHTML = `
    <div class="now-label">${current ? 'Right now' : 'Up first'}</div>
    <div class="now-title">${escapeHtml(current ? current.title : (next ? next.title : 'Day complete'))}</div>
    <div class="now-sub">${escapeHtml(current ? (current.sub || fmtTime(current.start)) : (next ? fmtTime(next.start) : 'rest up'))}</div>
    ${current ? `<div class="elapsed"><i style="width:${elapsedPct}%"></i></div>` : ''}
    ${next ? `<div class="next-row">
      <div><span class="next-label">Next · ${fmtTime(next.start)}</span><div class="next-title">${escapeHtml(next.title)}</div></div>
      <div class="countdown">${countdownText(next.start)}</div>
    </div>` : ''}`;
}

function currentBlocks() {
  const shift = Store.getShift(state.selected);
  return buildDay(state.selected, shift);
}

function renderSpine(isToday) {
  const spine = $('#spine');
  const blocks = currentBlocks();
  const m = nowMins();
  const { current } = focusBlocks(blocks, isToday);
  spine.innerHTML = '';

  for (const b of blocks) {
    const isNow = isToday && current && b === current;
    const isPast = isToday && b.start < m && !isNow;
    const checkable = b.kind === 'meal' || b.kind === 'lift' || b.kind === 'row';
    const checked = checkable && Store.isChecked(state.selected, b.id);

    const wrap = el(`<div class="block ${b.kind === 'lift' || b.kind === 'prep' ? 'session' : ''} ${checked ? 'checked' : ''}"></div>`);
    if (isNow) wrap.classList.add('is-now');
    if (isPast) wrap.classList.add('is-past');

    wrap.appendChild(el(`<div class="rail"><span class="t">${fmtTime(b.start)}</span></div>`));
    wrap.appendChild(el(`<span class="dot"></span>`));

    const chips = [];
    if (b.kind === 'meal') { chips.push(`<span class="chip">${b.p}P</span>`); chips.push(`<span class="chip">${b.kcal} kcal</span>`); }
    if (b.slidable) chips.push(`<span class="chip">slidable → ${fmtTime(b.slidable)}</span>`);

    const card = el(`<div class="card"></div>`);
    card.appendChild(el(`<div class="tone-strip t-${b.tone}"></div>`));
    const body = el(`<div class="body" style="flex:1"></div>`);

    const top = el(`<div class="top"></div>`);
    const info = el(`<div style="flex:1">
      <div class="title">${escapeHtml(b.title)}</div>
      ${b.sub ? `<div class="sub">${escapeHtml(b.sub)}</div>` : ''}
      ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
    </div>`);
    top.appendChild(info);

    if (checkable && isToday) {
      top.appendChild(el(`<button class="check ${checked ? 'on' : ''}" data-check="${b.id}" aria-pressed="${checked}" aria-label="Mark ${escapeHtml(b.title)} done">${checked ? '✓' : ''}</button>`));
    } else if (checkable && checked) {
      top.appendChild(el(`<span class="check on" aria-hidden="true">✓</span>`));
    }
    body.appendChild(top);

    if (b.note && b.kind === 'row') body.appendChild(el(`<div class="hydration-note">${escapeHtml(b.note)}</div>`));
    if (b.banner) body.appendChild(el(`<div class="banner-note">${escapeHtml(b.banner)}</div>`));

    // Session exercises (externalized memory)
    if (b.kind === 'lift' && b.exercises) {
      const det = el(`<details class="disclosure" ${isNow ? 'open' : ''}></details>`);
      det.appendChild(el(`<summary>${b.exercises.length} exercises${b.note ? ' · ' + escapeHtml(b.note) : ''}</summary>`));
      const ul = el(`<ul class="ex-list"></ul>`);
      b.exercises.forEach((ex, i) => {
        const key = `${b.id}:${state.selected.slice(0, 7)}:${i}`; // month-scoped load memory
        const load = Store.getLoad(`${b.id}:${i}`);
        ul.appendChild(el(`<li data-load="${b.id}:${i}">
          <span>${escapeHtml(ex)}</span>
          <span class="load ${load ? '' : 'empty'}">${load ? escapeHtml(load) : 'log load'}</span>
        </li>`));
      });
      det.appendChild(ul);
      body.appendChild(det);
    }

    // Prep sub-checklist
    if (b.kind === 'prep' && b.steps) {
      const det = el(`<details class="disclosure" ${isNow ? 'open' : ''}></details>`);
      det.appendChild(el(`<summary>${b.steps.length} steps</summary>`));
      const ul = el(`<ul class="steps"></ul>`);
      b.steps.forEach((step, i) => {
        const done = Store.isChecked(state.selected, `prep:${i}`);
        ul.appendChild(el(`<li class="${done ? 'done' : ''}" data-step="${i}">
          <span class="box">${done ? '✓' : ''}</span><span>${escapeHtml(step)}</span>
        </li>`));
      });
      det.appendChild(ul);
      body.appendChild(det);
    }

    card.appendChild(body);
    wrap.appendChild(card);
    spine.appendChild(wrap);
  }
}

// Today-only panels: meal totals + running late
function renderPanelsToday(isToday) {
  const panels = $('#panels');
  panels.innerHTML = '';
  if (!isToday) { panels.appendChild(el(`<div class="read-only-note">Read-only planning view · totals + logging live on Today.</div>`)); return; }

  // Running late
  const shift = Store.getShift(state.selected);
  const late = el(`<div class="late-ctl">
    <span class="lab">Running late?</span>
    <button class="late-btn ${shift === 30 ? 'active' : ''}" data-late="30">+30</button>
    <button class="late-btn ${shift === 60 ? 'active' : ''}" data-late="60">+60</button>
    <button class="late-btn" data-late="0">Reset</button>
  </div>`);
  panels.appendChild(late);

  // Meal totals + progress
  const meals = mealsFor(state.selected);
  const day = WEEK[dowOf(state.selected)];
  const target = targetsFor(state.selected, day.type);
  let gotP = 0, gotK = 0;
  for (const meal of meals) if (Store.isChecked(state.selected, meal.id)) { gotP += meal.p; gotK += meal.kcal; }
  const remP = Math.max(0, (target.p ?? mealSum(meals).p) - gotP);
  const remK = Math.max(0, (target.kcal ?? mealSum(meals).kcal) - gotK);
  const tp = target.p ?? mealSum(meals).p;
  const tk = target.kcal ?? mealSum(meals).kcal;

  panels.appendChild(el(`<div class="totals">
    <div class="bar-row">
      <div class="bar-top"><span>Protein · ${gotP} / ${tp}g</span><span class="hint">${remP}g to land</span></div>
      <div class="bar"><i class="p" style="width:${Math.min(100, gotP / tp * 100)}%"></i></div>
    </div>
    <div class="bar-row">
      <div class="bar-top"><span>Calories · ${gotK} / ${tk}</span><span class="hint">${remK} kcal to land</span></div>
      <div class="bar"><i class="k" style="width:${Math.min(100, gotK / tk * 100)}%"></i></div>
    </div>
  </div>`));

  // Sunday review card (Sun after 6p)
  if (dowOf(state.selected) === 0 && nowMins() >= 18 * 60) panels.appendChild(sundayReview());
}

function sundayReview() {
  const r = weekRatios();
  const note = Store.getNote(state.selected);
  const card = el(`<div class="panel-card review-card">
    <h2>Sunday review</h2>
    <div class="desc">The week, in ratios. Judge the trend.</div>
    <div class="ratios">
      <span class="ratio">Protein ${r.protein.hit}/${r.protein.n}</span>
      <span class="ratio">Calories ±5% ${r.kcal.hit}/${r.kcal.n}</span>
      <span class="ratio">Lifted ${r.lift.hit}/${r.lift.n}</span>
      <span class="ratio">Rowed ${r.row.hit}/${r.row.n}</span>
    </div>
    <div class="field"><label for="trendnote">Bodyweight trend note</label>
      <input id="trendnote" data-note type="text" inputmode="text" placeholder="e.g. avg down ~0.4 lb, mirror steady" value="${escapeHtml(note)}" /></div>
  </div>`);
  return card;
}

// ── Adherence (last 14 days) ─────────────────────────────────────────────────
function dayStats(iso) {
  const day = WEEK[dowOf(iso)];
  const target = targetsFor(iso, day.type);
  const meals = mealsFor(iso);
  const checks = Store.checksFor(iso);
  let p = 0, k = 0;
  for (const meal of meals) if (checks[meal.id]) { p += meal.p; k += meal.kcal; }
  const hasRow = !!day.row;
  const isTraining = day.type === 'training';
  return {
    proteinLanded: target.p != null && p >= target.p,
    kcalInRange: target.kcal != null && Math.abs(k - target.kcal) <= target.kcal * 0.05 && k > 0,
    lifted: isTraining ? (checks['lift'] === true) : 'na',
    rowed: hasRow ? (checks['row'] === true) : 'na',
    proteinKnown: target.p != null,
    kcalKnown: target.kcal != null,
    isTraining, hasRow,
  };
}

function lastNDays(n) {
  const out = [];
  const base = parseISO(todayISO());
  for (let i = 0; i < n; i++) {
    const d = new Date(base); d.setUTCDate(d.getUTCDate() - i);
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
  }
  return out;
}

function weekRatios() {
  const days = lastNDays(7);
  const acc = { protein: { hit: 0, n: 0 }, kcal: { hit: 0, n: 0 }, lift: { hit: 0, n: 0 }, row: { hit: 0, n: 0 } };
  for (const iso of days) {
    const s = dayStats(iso);
    if (s.proteinKnown) { acc.protein.n++; if (s.proteinLanded) acc.protein.hit++; }
    if (s.kcalKnown) { acc.kcal.n++; if (s.kcalInRange) acc.kcal.hit++; }
    if (s.isTraining) { acc.lift.n++; if (s.lifted === true) acc.lift.hit++; }
    if (s.hasRow) { acc.row.n++; if (s.rowed === true) acc.row.hit++; }
  }
  return acc;
}

function renderAdherence() {
  const panels = $('#panels');
  $('#focus').innerHTML = '';
  panels.innerHTML = '';
  const days = lastNDays(14);

  const acc = { protein: { hit: 0, n: 0 }, kcal: { hit: 0, n: 0 }, lift: { hit: 0, n: 0 }, row: { hit: 0, n: 0 } };
  const rows = days.map((iso) => {
    const s = dayStats(iso);
    const dow = dowOf(iso);
    if (s.proteinKnown) { acc.protein.n++; if (s.proteinLanded) acc.protein.hit++; }
    if (s.kcalKnown) { acc.kcal.n++; if (s.kcalInRange) acc.kcal.hit++; }
    if (s.isTraining) { acc.lift.n++; if (s.lifted === true) acc.lift.hit++; }
    if (s.hasRow) { acc.row.n++; if (s.rowed === true) acc.row.hit++; }
    const dot = (label, hit, na) => `<span class="adh-dot ${na ? 'na' : (hit ? 'hit' : '')}"><i></i>${label}</span>`;
    return `<div class="adh-row">
      <span class="adh-date">${APP.weekdayNames[dow]} ${iso.slice(8)}</span>
      <div class="adh-dots">
        ${dot('P', s.proteinLanded, !s.proteinKnown)}
        ${dot('kcal', s.kcalInRange, !s.kcalKnown)}
        ${dot('lift', s.lifted === true, !s.isTraining)}
        ${dot('row', s.rowed === true, !s.hasRow)}
      </div>
    </div>`;
  }).join('');

  panels.appendChild(el(`<div class="panel-card">
    <h2>Adherence · last 14 days</h2>
    <div class="desc">Neutral dots. No streaks — just ratios and the mirror.</div>
    <div class="ratios">
      <span class="ratio">Protein landed ${acc.protein.hit} of ${acc.protein.n}</span>
      <span class="ratio">Calories ±5% ${acc.kcal.hit} of ${acc.kcal.n}</span>
      <span class="ratio">Lifted ${acc.lift.hit} of ${acc.lift.n}</span>
      <span class="ratio">Rowed ${acc.row.hit} of ${acc.row.n}</span>
    </div>
    <div style="margin-top:14px">${rows}</div>
  </div>`));
}

// ── Targets + weight log ─────────────────────────────────────────────────────
function renderTargets() {
  const panels = $('#panels');
  $('#focus').innerHTML = '';
  panels.innerHTML = '';
  const iso = state.selected;
  const phase = resolvePhase(iso);
  const tr = targetsFor(iso, 'training');
  const rt = targetsFor(iso, 'rest');
  const macros = (t) => {
    const part = (v, u) => v == null ? `<span class="tbd">TBD</span>` : `${v}${u}`;
    return `${part(t.p, 'P')} · ${part(t.c, 'C')} · ${part(t.f, 'F')} · ${part(t.fiber, 'g fiber')}`;
  };
  panels.appendChild(el(`<div class="panel-card">
    <h2>Phase ${phase.badge}</h2>
    <div class="desc">${phase.tbd ? escapeHtml(phase.tbdBanner) : 'Targets are load-bearing — meal sums match exactly.'}</div>
    <div class="tgt-grid">
      <div class="tgt"><h3>Training day</h3><div class="big">${tr.kcal.toLocaleString()}</div><div class="macros">${macros(tr)}</div></div>
      <div class="tgt"><h3>Rest day</h3><div class="big">${rt.kcal.toLocaleString()}</div><div class="macros">${macros(rt)}</div></div>
    </div>
  </div>`));

  panels.appendChild(weightCard());
}

function weightCard() {
  const log = Store.weightLog();
  const card = el(`<div class="panel-card">
    <h2>Weight</h2>
    <div class="desc">One number a day. Judge the average and the mirror, not the daily.</div>
    <div class="weight-in">
      <input id="weightField" type="number" inputmode="decimal" step="0.1" min="0" placeholder="lb" value="${Store.weightLog()[todayISO()] ?? ''}" aria-label="Today's weight" />
      <button data-weight-save>Log</button>
    </div>
    ${sparkline(log)}
    <div class="spark-note">judge the average and the mirror, not the daily number.</div>
  </div>`);
  return card;
}

function sparkline(log) {
  const entries = Object.keys(log).sort();
  if (entries.length < 2) return `<div class="spark-note">Log a few days to see the 7-day rolling average.</div>`;
  // 7-day rolling average series
  const series = entries.map((iso, i) => {
    const win = entries.slice(Math.max(0, i - 6), i + 1).map((k) => log[k]);
    return win.reduce((a, b) => a + b, 0) / win.length;
  });
  const W = 320, H = 56, pad = 4;
  const min = Math.min(...series), max = Math.max(...series);
  const span = (max - min) || 1;
  const pts = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (W - 2 * pad);
    const y = H - pad - ((v - min) / span) * (H - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="7-day rolling average weight">
    <polyline fill="none" stroke="var(--clay)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${pts}" />
  </svg>`;
}

// ── Settings ─────────────────────────────────────────────────────────────────
function renderSettings() {
  const panels = $('#panels');
  $('#focus').innerHTML = '';
  panels.innerHTML = '';

  panels.appendChild(el(`<div class="panel-card">
    <h2>Calendar</h2>
    <div class="desc">Export the week as an .ics with 10-min alarms — iOS Calendar becomes the notification layer. Regenerate any time.</div>
    <div class="btn-row"><button class="btn primary" data-ics>Export 7-day .ics</button></div>
  </div>`));

  panels.appendChild(el(`<div class="panel-card">
    <h2>Data</h2>
    <div class="desc">All state is on this device. Back it up or move it as one JSON file.</div>
    <div class="btn-row">
      <button class="btn" data-export>Export JSON</button>
      <button class="btn" data-import-trigger>Import JSON</button>
      <input class="hidden-file" type="file" accept="application/json" data-import-file />
    </div>
  </div>`));

  const hevy = Store.getSetting('hevyKey') || '';
  panels.appendChild(el(`<div class="panel-card">
    <h2>Hevy (optional)</h2>
    <div class="desc">Paste a Hevy API key to enable one-tap "log to Hevy" after finishing a lift. Fails silently offline.</div>
    <div class="field"><label for="hevyKey">Hevy API key</label>
      <input id="hevyKey" type="text" inputmode="text" placeholder="hevy_…" value="${escapeHtml(hevy)}" />
    </div>
    <div class="btn-row"><button class="btn" data-hevy-save>Save key</button></div>
  </div>`));

  panels.appendChild(el(`<div class="panel-card">
    <h2>About</h2>
    <div class="desc">The Day · Phase engine, exact macros, offline-first. Notifications are the .ics + in-app countdowns — no push server, none faked. Edit the plan in <strong>config.js</strong>.</div>
  </div>`));
}

// ── Toast / undo ─────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg, undoFn) {
  const t = $('#toast');
  t.innerHTML = escapeHtml(msg);
  if (undoFn) { const b = el(`<button>Undo</button>`); b.addEventListener('click', () => { undoFn(); hideToast(); }); t.appendChild(b); }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 3500);
}
function hideToast() { $('#toast').hidden = true; }

// ── Events ───────────────────────────────────────────────────────────────────
function onClick(e) {
  const t = e.target;

  const dayTab = t.closest('[data-day]');
  if (dayTab) { state.selected = dayTab.dataset.day; if (state.view !== 'today') state.view = 'today'; render(); return; }

  const tab = t.closest('.tab');
  if (tab) { state.view = tab.dataset.view; if (state.view !== 'today' && state.view !== 'adherence') { /* keep selected */ } render(); return; }

  const check = t.closest('[data-check]');
  if (check && check.tagName === 'BUTTON') {
    const id = check.dataset.check;
    const on = Store.toggleCheck(state.selected, id);
    toast(on ? 'Logged ✓' : 'Un-logged', () => { Store.toggleCheck(state.selected, id); render(); });
    render();
    return;
  }

  const step = t.closest('[data-step]');
  if (step) { Store.toggleCheck(state.selected, `prep:${step.dataset.step}`); render(); return; }

  const loadRow = t.closest('[data-load]');
  if (loadRow) {
    const key = loadRow.dataset.load;
    const cur = Store.getLoad(key);
    const val = window.prompt('Load used (e.g. "60 lb x 8")', cur);
    if (val !== null) { Store.setLoad(key, val.trim()); render(); }
    return;
  }

  const late = t.closest('[data-late]');
  if (late) {
    const mins = Number(late.dataset.late);
    Store.setShift(state.selected, mins);
    toast(mins ? `Shifted afternoon +${mins} min` : 'Afternoon reset');
    render();
    return;
  }

  if (t.closest('[data-ics]')) { downloadICS(todayISO()); toast('Calendar exported'); return; }
  if (t.closest('[data-export]')) { doExport(); return; }
  if (t.closest('[data-import-trigger]')) { $('[data-import-file]').click(); return; }
  if (t.closest('[data-weight-save]')) { saveWeight(); return; }
  if (t.closest('[data-hevy-save]')) { Store.setSetting('hevyKey', $('#hevyKey').value.trim()); toast('Hevy key saved'); return; }

  if (t.closest('#focus') && state.selected === todayISO()) {
    const nowBlock = $('#spine .is-now');
    if (nowBlock) nowBlock.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    return;
  }
}

function onChange(e) {
  const f = e.target.closest('[data-import-file]');
  if (f && f.files && f.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try { Store.import(reader.result); toast('Data imported'); render(); }
      catch { toast('Import failed — invalid file'); }
    };
    reader.readAsText(f.files[0]);
  }
  const note = e.target.closest('[data-note]');
  if (note) Store.setNote(state.selected, note.value.trim());
}

function saveWeight() {
  const field = $('#weightField');
  if (!field) return;
  Store.setWeight(todayISO(), field.value);
  toast('Weight logged');
  render();
}

function doExport() {
  const blob = new Blob([Store.export()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `the-day-data-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast('Data exported');
}

// ── Live tick (countdown, now-dot, midnight rollover) ────────────────────────
function tick() {
  const t = todayISO();
  if (t !== lastToday) {
    // Day rolled over — snap selection to the new today (checks auto-reset by key).
    if (state.selected === lastToday) state.selected = t;
    lastToday = t;
    render();
    return;
  }
  if (state.view === 'today' && state.selected === t) {
    renderFocus(true);
    // refresh now/past classes cheaply
    renderSpine(true);
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
function boot() {
  document.body.addEventListener('click', onClick);
  document.body.addEventListener('change', onChange);
  render();
  setInterval(tick, 30 * 1000);

  registerServiceWorker();
}

// ── Service worker: register + auto-update installed copies ──────────────────
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      // Whether a worker already controlled this page at load time. On the very
      // first visit there's none, and the initial claim() must NOT trigger a reload.
      const hadController = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.register('sw.js');

      // When a *new* worker takes over an already-controlled page, reload once
      // so the fresh assets apply.
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloaded) return;
        reloaded = true;
        window.location.reload();
      });

      // Check for a new deploy on load and whenever the app is refocused.
      const check = () => reg.update().catch(() => {});
      check();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    } catch { /* SW unsupported or blocked — app still works, just not offline */ }
  });
}

boot();
