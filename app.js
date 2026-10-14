// The Day: app orchestration. Vanilla ES module, no framework.
// Tabs: Today · WOD · Fuel · Progress.
import { APP, PLAN, WEEK, REHAB, fmtTime } from './config.js';
import {
  isoDate, dowOf, addDaysISO, targetsFor, isCheckinDay, isFirstSaturday,
  buildDay, mealsFor, mealSum, streak, sessionFor, sessionMinutes, dayType,
  isLegDay, bfGateTripped, latestBodyFat,
} from './engine.js';
import { Store } from './store.js';
import { downloadICS } from './ics.js';
import { renderWOD, handleWODClick, handleWODChange, wodJumpToToday, rowsThisWeek } from './wod.js';

// ── Live clock ──
const now = () => new Date();
const todayISO = () => isoDate(now());
const nowMins = () => { const d = now(); return d.getHours() * 60 + d.getMinutes(); };

// ── App state ──
let state = { view: 'today', selected: todayISO() };
let lastToday = todayISO();

const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── Rendering ──
function render() {
  renderTopbar();
  const isToday = state.selected === todayISO();
  const onToday = state.view === 'today';

  $('#focus').style.display = onToday ? '' : 'none';
  $('#spine').style.display = onToday ? '' : 'none';
  $('#banners').style.display = onToday ? '' : 'none';
  $('#weekstrip').style.display = onToday ? '' : 'none';

  if (onToday) {
    renderBanners();
    renderFocus(isToday);
    renderPanelsToday(isToday);
    renderSpine(isToday);
  } else if (state.view === 'wod') {
    $('#panels').innerHTML = '';
    renderWOD($('#panels'));
  } else if (state.view === 'fuel') {
    renderFuel();
  } else if (state.view === 'progress') {
    renderProgress();
  }

  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.view === state.view;
    t.classList.toggle('is-active', on);
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
}

function renderTopbar() {
  const iso = state.view === 'today' ? state.selected : todayISO();
  const badges = $('#badges');
  badges.innerHTML = '';
  if (isCheckinDay(iso)) badges.appendChild(el(`<span class="badge checkin">Check in</span>`));
  if (isFirstSaturday(iso)) badges.appendChild(el(`<span class="badge phase">Photos + InBody</span>`));

  const strip = $('#weekstrip');
  strip.innerHTML = '';
  for (let i = -1; i <= 5; i++) {
    const diso = addDaysISO(todayISO(), i);
    const dow = dowOf(diso);
    const tab = el(`<button class="daytab" role="tab" data-day="${diso}" aria-label="${APP.weekdayNames[dow]} ${Number(diso.slice(8))}">
      <span class="dow">${APP.weekdayNames[dow]}</span>
      <span class="dnum">${Number(diso.slice(8))}</span>
    </button>`);
    if (diso === todayISO()) tab.classList.add('is-today');
    if (diso === state.selected) { tab.classList.add('is-selected'); tab.setAttribute('aria-selected', 'true'); }
    strip.appendChild(tab);
  }
}

// Body fat gate: the only gate in the plan.
function renderBanners() {
  const box = $('#banners');
  box.innerHTML = '';
  if (bfGateTripped(Store.bodyFatLog())) {
    box.appendChild(el(`<div class="banner">${escapeHtml(PLAN.tracking.bfGateBanner)}</div>`));
  }
}

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
    const s = sessionFor(state.selected);
    focus.innerHTML = `
      <div class="now-label">Planning view</div>
      <div class="now-title">${escapeHtml(WEEK[dowOf(state.selected)].name)}: ${escapeHtml(s.title)}</div>
      <div class="now-sub">Read only. Tap today in the strip to log.</div>`;
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
      <div><span class="next-label">Next: ${fmtTime(next.start)}</span><div class="next-title">${escapeHtml(next.title)}</div></div>
      <div class="countdown">${countdownText(next.start)}</div>
    </div>` : ''}`;
}

function currentBlocks() {
  return buildDay(state.selected, Store.getShift(state.selected));
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
    const mealCheckable = b.kind === 'meal';
    const checked = mealCheckable && Store.isChecked(state.selected, b.id);
    const wodLink = ['lift', 'rehab', 'row', 'order', 'posture'].includes(b.kind);

    const wrap = el(`<div class="block ${checked ? 'checked' : ''}"></div>`);
    if (isNow) wrap.classList.add('is-now');
    if (isPast) wrap.classList.add('is-past');

    wrap.appendChild(el(`<div class="rail"><span class="t">${fmtTime(b.start)}</span></div>`));
    wrap.appendChild(el(`<span class="dot"></span>`));

    const chips = [];
    if (b.kind === 'meal') {
      chips.push(`<span class="chip">${b.kcal} cal</span>`);
      chips.push(`<span class="chip">${b.p}P</span>`);
      chips.push(`<span class="chip">${b.c}C</span>`);
      chips.push(`<span class="chip">${b.f}F</span>`);
    }
    if (b.kind === 'lift') {
      chips.push(`<span class="chip">${b.exerciseCount} lifts, open WOD</span>`);
      if (b.phaseLabel) chips.push(`<span class="chip">${escapeHtml(b.phaseLabel)}</span>`);
    }
    if (b.kind === 'rehab' || b.kind === 'order') chips.push(`<span class="chip">open WOD</span>`);

    const card = el(`<div class="card" ${wodLink ? 'data-goto-wod style="cursor:pointer"' : ''}></div>`);
    card.appendChild(el(`<div class="tone-strip t-${b.tone}"></div>`));
    const body = el(`<div class="body" style="flex:1"></div>`);
    const top = el(`<div class="top"></div>`);
    top.appendChild(el(`<div style="flex:1">
      <div class="title">${escapeHtml(b.title)}</div>
      ${b.sub ? `<div class="sub">${escapeHtml(b.sub)}</div>` : ''}
      ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
    </div>`));

    if (mealCheckable && isToday) {
      top.appendChild(el(`<button class="check ${checked ? 'on' : ''}" data-check="${b.id}" aria-pressed="${checked}" aria-label="Mark ${escapeHtml(b.title)} done">${checked ? '✓' : ''}</button>`));
    } else if (mealCheckable && checked) {
      top.appendChild(el(`<span class="check on" aria-hidden="true">✓</span>`));
    }
    body.appendChild(top);
    card.appendChild(body);
    card.style.display = 'flex';
    card.style.gap = '10px';
    wrap.appendChild(card);
    spine.appendChild(wrap);
  }
}

// ── Day scoring helpers ──
function rehabRoundDone(iso, prefix) {
  let hit = 0;
  for (let i = 0; i < REHAB.moves.length; i++) if (Store.isChecked(iso, `${prefix}:${i}`)) hit++;
  return hit >= 3;
}
function rehabDayDone(iso) { return rehabRoundDone(iso, 'rehab1') && rehabRoundDone(iso, 'rehab2'); }
function proteinLanded(iso) {
  const target = targetsFor(iso);
  const checks = Store.checksFor(iso);
  let p = 0;
  for (const meal of mealsFor(iso)) if (checks[meal.id]) p += meal.p;
  return p >= target.p;
}
function trainedDay(iso) { return Store.isChecked(iso, 'lift'); }
// Daily vacuum: the one tap check, or Friday's in session vacuum practice.
function vacuumDone(iso) {
  if (Store.isChecked(iso, 'vacuum')) return true;
  return dowOf(iso) === 5 && Store.isChecked(iso, 'ex:up-vac');
}

// 7 day rolling average of logged weights, ending at iso.
function rolling7(iso) {
  const log = Store.weightLog();
  const vals = [];
  for (let i = 0; i < 7; i++) {
    const v = log[addDaysISO(iso, -i)];
    if (v != null) vals.push(v);
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function renderPanelsToday(isToday) {
  const panels = $('#panels');
  panels.innerHTML = '';
  const iso = state.selected;
  const session = sessionFor(iso);

  if (!isToday) { panels.appendChild(el(`<div class="read-only-note">Read only planning view. Totals and logging live on Today.</div>`)); return; }

  // Morning weigh in, top of the day. Average over single days, always.
  const wToday = Store.weightLog()[iso];
  const avg = rolling7(iso);
  panels.appendChild(el(`<div class="panel-card" style="display:flex;gap:10px;align-items:center">
    <input id="weightField" class="num-in" style="max-width:110px" type="number" inputmode="decimal" step="0.1" min="0" placeholder="lb" value="${wToday ?? ''}" aria-label="Morning weight" />
    <button class="btn primary" data-weight-save>Log</button>
    <div style="flex:1">
      <div style="font-weight:700;font-size:14px">${wToday != null ? wToday.toFixed(1) + ' lb today' : 'Morning weigh in'}</div>
      <div class="spark-note" style="margin-top:1px">7 day avg: <strong>${avg != null ? avg.toFixed(1) : 'no data'}</strong>. ${escapeHtml(PLAN.tracking.weighNote)}</div>
    </div>
  </div>`));

  // Session hero + start
  const mins = sessionMinutes(iso);
  const est = mins ? `, about ${mins} min` : '';
  panels.appendChild(el(`<div class="hero tone-${session.kind}" style="margin-bottom:14px">
    <div class="eyebrow">${escapeHtml(WEEK[dowOf(iso)].name)}${session.where ? ' · ' + escapeHtml(session.where) : ''}${escapeHtml(est)}</div>
    <div class="hero-title">${escapeHtml(session.title)}</div>
    <div class="hero-sub">${escapeHtml(session.focus)}</div>
  </div>`));
  panels.appendChild(el(`<div class="btn-row" style="margin:0 0 14px"><button class="btn primary big" data-goto-wod>${dayType(iso) === 'rest' ? 'Open the rest day' : "Start today's session"}</button></div>`));

  // Stats
  const t = todayISO();
  const trainStreak = streak(t, trainedDay, (d) => dayType(d) !== 'training');
  const protStreak = streak(t, proteinLanded);
  const rehabStreak = streak(t, rehabDayDone);
  const r1 = rehabRoundDone(iso, 'rehab1'), r2 = rehabRoundDone(iso, 'rehab2');
  const rowN = rowsThisWeek(iso);
  panels.appendChild(el(`<div class="panel-card">
    <h2>The day, in numbers</h2>
    <div class="statline">
      <div class="stat"><div class="v">${trainStreak}</div><div class="l">training streak</div></div>
      <div class="stat"><div class="v">${protStreak}</div><div class="l">protein streak</div></div>
      <div class="stat"><div class="v">${rehabStreak}</div><div class="l">rehab streak</div></div>
      <div class="stat"><div class="v">${r1 ? '✓' : '·'} / ${r2 ? '✓' : '·'}</div><div class="l">rehab rounds</div></div>
      <div class="stat"><div class="v">${Math.min(rowN, PLAN.training.cardio.capPerWeek)} of ${PLAN.training.cardio.capPerWeek}</div><div class="l">rows this week</div></div>
      <div class="stat"><div class="v">${latestBodyFat(Store.bodyFatLog()) ?? '·'}</div><div class="l">body fat, latest</div></div>
    </div>
  </div>`));

  // Daily blocks: posture, supplements, vacuum
  const vacToday = vacuumDone(iso);
  const daily = el(`<div class="panel-card"><h2>Every day</h2>
    <div class="desc">Posture block, ${PLAN.daily.posture.minutes} minutes. ${escapeHtml(PLAN.daily.posture.cue)}</div></div>`);
  const items = [...PLAN.daily.posture.items, ...PLAN.daily.supplements];
  const ul = el('<ul class="steps"></ul>');
  items.forEach((name, i) => {
    const id = `daily:${i}`;
    const done = Store.isChecked(iso, id);
    ul.appendChild(el(`<li class="${done ? 'done' : ''}" data-dailyitem="${id}" style="cursor:pointer">
      <span class="box">${done ? '✓' : ''}</span><span class="s-name">${escapeHtml(name)}</span></li>`));
  });
  daily.appendChild(ul);
  daily.appendChild(el(`<div style="display:flex;align-items:center;gap:12px;margin-top:10px">
    <button class="check ${vacToday ? 'on' : ''}" data-vacuum aria-pressed="${vacToday}" aria-label="Mark stomach vacuum done">${vacToday ? '✓' : ''}</button>
    <div style="flex:1">
      <div style="font-weight:700;font-size:14px">Vacuum, morning on an empty stomach, optional</div>
      <div class="spark-note" style="margin-top:1px">Friday's in session practice counts. Streak: <strong>${streak(t, vacuumDone)}</strong></div>
    </div>
  </div>`));
  panels.appendChild(daily);

  // First Saturday of the month: photos + InBody + body fat field
  if (isFirstSaturday(iso)) {
    const bf = Store.bodyFatLog()[iso];
    const card = el(`<div class="panel-card review-card"><h2>First Saturday</h2>
      <div class="desc">Same spot, same light. Scan at the My Fit Foods store.</div></div>`);
    const monthly = ['Relaxed photos: front, side, back', 'InBody scan'];
    const mul = el('<ul class="steps"></ul>');
    monthly.forEach((name, i) => {
      const id = `monthly:${i}`;
      const done = Store.isChecked(iso, id);
      mul.appendChild(el(`<li class="${done ? 'done' : ''}" data-dailyitem="${id}" style="cursor:pointer">
        <span class="box">${done ? '✓' : ''}</span><span class="s-name">${escapeHtml(name)}</span></li>`));
    });
    card.appendChild(mul);
    card.appendChild(el(`<div class="weight-in" style="margin-top:10px">
      <input id="bfField" type="number" inputmode="decimal" step="0.1" min="0" max="60" placeholder="body fat %" value="${bf ?? ''}" aria-label="Body fat percent" />
      <button data-bf-save>Log</button>
    </div>`));
    card.appendChild(el(`<div class="spark-note">The gate: ${PLAN.tracking.bfGatePct} percent or higher ends the build block.</div>`));
    panels.appendChild(card);
  }

  // Running late
  const shift = Store.getShift(iso);
  panels.appendChild(el(`<div class="late-ctl">
    <span class="lab">Running late?</span>
    <button class="late-btn ${shift === 30 ? 'active' : ''}" data-late="30">+30</button>
    <button class="late-btn ${shift === 60 ? 'active' : ''}" data-late="60">+60</button>
    <button class="late-btn" data-late="0">Reset</button>
  </div>`));

  // Meal totals
  const meals = mealsFor(iso);
  const target = targetsFor(iso);
  let gotP = 0, gotK = 0;
  for (const meal of meals) if (Store.isChecked(iso, meal.id)) { gotP += meal.p; gotK += meal.kcal; }
  panels.appendChild(el(`<div class="totals">
    <div class="bar-row">
      <div class="bar-top"><span>Protein: ${gotP} / ${target.p} g</span><span class="hint">${Math.max(0, target.p - gotP)} g to land</span></div>
      <div class="bar"><i class="p" style="width:${Math.min(100, gotP / target.p * 100)}%"></i></div>
    </div>
    <div class="bar-row">
      <div class="bar-top"><span>Calories: ${gotK} / ${target.kcal}</span><span class="hint">${Math.max(0, target.kcal - gotK)} to land</span></div>
      <div class="bar"><i class="k" style="width:${Math.min(100, gotK / target.kcal * 100)}%"></i></div>
    </div>
    <div class="spark-note" style="margin-top:8px">Day plan: ${target.kcal} cal, ${target.p}P, ${target.c}C, ${target.f}F</div>
  </div>`));
}

// ── Adherence ──
function dayStats(iso) {
  const target = targetsFor(iso);
  const checks = Store.checksFor(iso);
  let p = 0, k = 0;
  for (const meal of mealsFor(iso)) if (checks[meal.id]) { p += meal.p; k += meal.kcal; }
  const isTraining = dayType(iso) === 'training';
  return {
    proteinLanded: p >= target.p,
    kcalInRange: Math.abs(k - target.kcal) <= target.kcal * 0.05 && k > 0,
    lifted: isTraining ? (checks['lift'] === true) : 'na',
    rowed: isTraining ? (checks['row'] === true) : 'na',
    isTraining,
  };
}
function lastNDays(n) { return [...Array(n)].map((_, i) => addDaysISO(todayISO(), -i)); }

// ── Fuel ──
function renderFuel() {
  const panels = $('#panels');
  panels.innerHTML = '';
  const iso = todayISO();
  const meals = mealsFor(iso);
  const target = targetsFor(iso);

  const card = el(`<div class="panel-card"><h2>Today's food</h2>
    <div class="desc">All My Fit Foods unless marked grocery. Check meals off on Today.</div></div>`);
  const ul = el('<ul class="steps"></ul>');
  for (const m of meals) {
    ul.appendChild(el(`<li><span style="flex:1"><span class="s-name">${fmtTime(m.time)}: ${escapeHtml(m.name)}</span>
      <div class="s-cue">${m.kcal} cal, ${m.p}P, ${m.c}C, ${m.f}F${m.src ? '. ' + escapeHtml(m.src) : ''}</div></span></li>`));
  }
  card.appendChild(ul);
  card.appendChild(el(`<div class="callout" style="margin-top:10px">Day total: ${target.kcal} cal, ${target.p}P, ${target.c}C, ${target.f}F</div>`));
  panels.appendChild(card);

  panels.appendChild(weightCard());
}

function weightCard() {
  const log = Store.weightLog();
  const bf = latestBodyFat(Store.bodyFatLog());
  return el(`<div class="panel-card">
    <h2>Weight</h2>
    <div class="desc">Two year build. No weight cap; the only gate is body fat${bf != null ? `, latest ${bf} percent` : ''}.</div>
    ${sparkline(log)}
    <div class="spark-note">7 day rolling average. ${escapeHtml(PLAN.tracking.weighNote)}</div>
  </div>`);
}

function sparkline(log) {
  const entries = Object.keys(log).sort();
  if (entries.length < 2) return `<div class="spark-note">Log a few mornings to see the average.</div>`;
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
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="7 day rolling average weight">
    <polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${pts}" />
  </svg>`;
}

// ── Progress ──
function renderProgress() {
  const panels = $('#panels');
  panels.innerHTML = '';
  const days = lastNDays(14);

  const acc = { protein: { hit: 0, n: 0 }, kcal: { hit: 0, n: 0 }, lift: { hit: 0, n: 0 }, row: { hit: 0, n: 0 } };
  const rows = days.map((iso) => {
    const s = dayStats(iso);
    const dow = dowOf(iso);
    acc.protein.n++; if (s.proteinLanded) acc.protein.hit++;
    acc.kcal.n++; if (s.kcalInRange) acc.kcal.hit++;
    if (s.isTraining) { acc.lift.n++; if (s.lifted === true) acc.lift.hit++; }
    if (s.isTraining) { acc.row.n++; if (s.rowed === true) acc.row.hit++; }
    const dot = (label, hit, na) => `<span class="adh-dot ${na ? 'na' : (hit ? 'hit' : '')}"><i></i>${label}</span>`;
    return `<div class="adh-row">
      <span class="adh-date">${APP.weekdayNames[dow]} ${iso.slice(8)}</span>
      <div class="adh-dots">
        ${dot('P', s.proteinLanded, false)}
        ${dot('cal', s.kcalInRange, false)}
        ${dot('lift', s.lifted === true, !s.isTraining)}
        ${dot('row', s.rowed === true, !s.isTraining)}
      </div>
    </div>`;
  }).join('');

  panels.appendChild(el(`<div class="panel-card">
    <h2>Last 14 days</h2>
    <div class="desc">Neutral dots. Rows are optional; the dot just records them.</div>
    <div class="ratios">
      <span class="ratio">Protein landed ${acc.protein.hit} of ${acc.protein.n}</span>
      <span class="ratio">Calories within 5%: ${acc.kcal.hit} of ${acc.kcal.n}</span>
      <span class="ratio">Lifted ${acc.lift.hit} of ${acc.lift.n}</span>
      <span class="ratio">Rowed ${acc.row.hit} of ${acc.row.n}</span>
    </div>
    <div style="margin-top:14px">${rows}</div>
  </div>`));

  panels.appendChild(el(`<div class="panel-card">
    <h2>Calendar</h2>
    <div class="desc">Export the week as an .ics with 10 minute alarms. iOS Calendar is the notification layer.</div>
    <div class="btn-row"><button class="btn primary" data-ics>Export 7 day .ics</button></div>
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

  panels.appendChild(el(`<div class="panel-card">
    <h2>About</h2>
    <div class="desc">The Day: two year classic physique build, started October 14, 2026. No show date; the gate is body fat. Hevy is the lifting log. Edit the plan in <strong>config.js</strong>.</div>
  </div>`));
}

// ── Toast ──
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

// ── Events ──
function onClick(e) {
  const t = e.target;

  if (state.view === 'wod' && handleWODClick(e, () => render(), toast)) return;

  const dayTab = t.closest('[data-day]');
  if (dayTab) { state.selected = dayTab.dataset.day; state.view = 'today'; render(); return; }

  const tab = t.closest('.tab');
  if (tab) {
    state.view = tab.dataset.view;
    if (state.view === 'today') state.selected = todayISO();
    render(); return;
  }

  if (t.closest('[data-goto-wod]')) { state.view = 'wod'; wodJumpToToday(); render(); return; }

  const check = t.closest('[data-check]');
  if (check && check.tagName === 'BUTTON') {
    const id = check.dataset.check;
    const on = Store.toggleCheck(state.selected, id);
    toast(on ? 'Logged ✓' : 'Undone', () => { Store.toggleCheck(state.selected, id); render(); });
    render();
    return;
  }

  const daily = t.closest('[data-dailyitem]');
  if (daily) { Store.toggleCheck(todayISO(), daily.dataset.dailyitem); render(); return; }

  if (t.closest('[data-vacuum]')) {
    const on = Store.toggleCheck(todayISO(), 'vacuum');
    toast(on ? 'Vacuum logged ✓' : 'Vacuum undone');
    render();
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
  if (t.closest('[data-bf-save]')) { saveBodyFat(); return; }

  if (t.closest('#focus') && state.selected === todayISO() && state.view === 'today') {
    const nowBlock = $('#spine .is-now');
    if (nowBlock) nowBlock.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    return;
  }
}

function onChange(e) {
  if (state.view === 'wod' && handleWODChange(e)) return;

  const f = e.target.closest('[data-import-file]');
  if (f && f.files && f.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try { Store.import(reader.result); toast('Data imported'); render(); }
      catch { toast('Import failed, invalid file'); }
    };
    reader.readAsText(f.files[0]);
  }
}

function saveWeight() {
  const field = $('#weightField');
  if (!field) return;
  Store.setWeight(todayISO(), field.value);
  toast('Weight logged');
  render();
}
function saveBodyFat() {
  const field = $('#bfField');
  if (!field) return;
  Store.setBodyFat(todayISO(), field.value);
  toast('Body fat logged');
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

// ── Live tick ──
function tick() {
  const t = todayISO();
  if (t !== lastToday) {
    if (state.selected === lastToday) state.selected = t;
    lastToday = t;
    render();
    return;
  }
  if (state.view === 'today' && state.selected === t) {
    renderFocus(true);
    renderSpine(true);
  }
}

// ── Boot ──
function boot() {
  // Seed the log once: October 4, 2026, 176.0 lb, body fat estimate 15 percent.
  const seed = PLAN.tracking.seed;
  if (!Object.keys(Store.weightLog()).length) Store.setWeight(seed.iso, seed.lb);
  if (!Object.keys(Store.bodyFatLog()).length) Store.setBodyFat(seed.iso, seed.bf);

  document.body.addEventListener('click', onClick);
  document.body.addEventListener('change', onChange);
  render();
  setInterval(tick, 30 * 1000);

  registerServiceWorker();
}

// ── Service worker ──
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const hadController = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.register('sw.js');
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloaded) return;
        reloaded = true;
        window.location.reload();
      });
      const check = () => reg.update().catch(() => {});
      check();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    } catch { /* SW blocked; app still works, just not offline */ }
  });
}

boot();
