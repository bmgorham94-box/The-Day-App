// The Day: WOD tab, the training surface.
// Hero, leg checklist or rehab, exercise check offs, optional row, finish.
// Hevy is the lifting log; The Day shows the session and whether it got done.
import { PLAN, WEEK, APP, REHAB } from './config.js';
import {
  isoDate, dowOf, addDaysISO, sessionFor, isLegDay, dayType,
  reintroPhase, reintroBanActive, setsForPhase, sessionMinutes,
} from './engine.js';
import { Store } from './store.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const todayISO = () => isoDate(new Date());

// selected WOD date (defaults to today)
let selected = null;

// ── Checklist helper ──
function checklist(iso, prefix, items, editable) {
  const ul = el('<ul class="steps"></ul>');
  items.forEach((it, i) => {
    const id = `${prefix}:${i}`;
    const done = Store.isChecked(iso, id);
    const name = typeof it === 'string' ? it : it.name;
    const dose = typeof it === 'string' ? '' : it.dose;
    const cue = typeof it === 'string' ? '' : it.cue;
    ul.appendChild(el(`<li class="${done ? 'done' : ''}" ${editable ? `data-checkitem="${id}"` : ''} style="${editable ? 'cursor:pointer' : ''}">
      <span class="box">${done ? '✓' : ''}</span>
      <span style="flex:1"><span class="s-name">${esc(name)}</span>${cue ? `<div class="s-cue">${esc(cue)}</div>` : ''}</span>
      ${dose ? `<span class="s-dose">${esc(dose)}</span>` : ''}
    </li>`));
  });
  return ul;
}

// ── Sections ──
function heroCard(iso) {
  const s = sessionFor(iso);
  const mins = sessionMinutes(iso);
  const est = mins ? `, about ${mins} min` : '';
  const where = s.where ? ` · ${s.where}` : '';
  return el(`<div class="hero tone-${s.kind}">
    <div class="eyebrow">${esc(APP.weekdayNames[dowOf(iso)])} · ${esc(iso)}${esc(where)}${esc(est)}</div>
    <div class="hero-title">${esc(s.title)}</div>
    <div class="hero-sub">${esc(s.focus)}</div>
  </div>`);
}

function phaseCard(iso) {
  const phase = reintroPhase(iso);
  const ban = reintroBanActive(iso);
  if (!phase && !ban) return null;
  const card = el(`<div class="panel-card"></div>`);
  if (phase) {
    card.appendChild(el(`<h2>Reintroduction, phase ${phase.n}</h2>`));
    card.appendChild(el(`<div class="desc">${esc(phase.label)}</div>`));
  } else {
    card.appendChild(el(`<h2>Leg day note</h2>`));
  }
  if (ban) card.appendChild(el(`<div class="callout">${esc(PLAN.training.reintro.banNote)}</div>`));
  return card;
}

function legChecklistCard(iso, editable) {
  const card = el(`<div class="panel-card"></div>`);
  card.appendChild(el(`<h2>Pre session checklist</h2>`));
  card.appendChild(el(`<div class="desc">Run it before the first working set.</div>`));
  card.appendChild(checklist(iso, 'legprep', PLAN.training.legChecklist, editable));
  return card;
}

function rehabCard(iso, editable, round) {
  const card = el(`<div class="panel-card"></div>`);
  card.appendChild(el(`<h2>${esc(REHAB.name)}</h2>`));
  card.appendChild(el(`<div class="desc">${esc(REHAB.cadence)}. This is round ${round === 'rehab1' ? '1' : '2'} of 2.</div>`));
  card.appendChild(checklist(iso, round, REHAB.moves, editable));
  if (round === 'rehab1') card.appendChild(el(`<div class="callout" style="margin-top:10px">${esc(REHAB.rules)}</div>`));
  return card;
}

function exercisesCard(iso, editable) {
  const s = sessionFor(iso);
  const phase = s.kind === 'legs' ? reintroPhase(iso) : null;
  const card = el(`<div class="panel-card"></div>`);
  card.appendChild(el(`<h2>Session</h2>`));
  card.appendChild(el(`<div class="desc">Check each lift off as it finishes. Weights live in Hevy.</div>`));
  const ul = el('<ul class="steps"></ul>');
  s.exercises.forEach((ex) => {
    const id = `ex:${ex.id}`;
    const done = Store.isChecked(iso, id);
    const tags = (ex.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join(' ');
    ul.appendChild(el(`<li class="${done ? 'done' : ''}" ${editable ? `data-checkitem="${id}"` : ''} style="${editable ? 'cursor:pointer' : ''}">
      <span class="box">${done ? '✓' : ''}</span>
      <span style="flex:1"><span class="s-name">${esc(ex.name)}</span> ${tags}${ex.note ? `<div class="s-cue">${esc(ex.note)}</div>` : ''}</span>
      <span class="s-dose">${esc(setsForPhase(ex.sets, phase))}</span>
    </li>`));
  });
  card.appendChild(ul);
  if (editable) {
    const done = Store.isChecked(iso, 'lift');
    card.appendChild(el(`<div class="btn-row"><button class="btn ${done ? '' : 'primary'} big" data-lift-done>${done ? '✓ Session logged, tap to undo' : 'Mark session done'}</button></div>`));
  }
  return card;
}

// Count optional rows checked this week (Sun through Sat around `iso`).
export function rowsThisWeek(iso) {
  const weekStart = addDaysISO(iso, -dowOf(iso));
  let n = 0;
  for (let i = 0; i < 7; i++) if (Store.isChecked(addDaysISO(weekStart, i), 'row')) n++;
  return n;
}

function rowCard(iso, editable) {
  const card = el(`<div class="panel-card"></div>`);
  const cap = PLAN.training.cardio.capPerWeek;
  const n = rowsThisWeek(iso);
  const done = Store.isChecked(iso, 'row');
  card.appendChild(el(`<h2>Row, optional</h2>`));
  card.appendChild(el(`<div class="desc">${esc(PLAN.training.cardio.note)}</div>`));
  card.appendChild(el(`<div class="spark-note">This week: ${Math.min(n, cap)} of ${cap}${n >= cap && !done ? '. Cap reached, rest the engine.' : ''}</div>`));
  if (editable) {
    card.appendChild(el(`<div class="btn-row"><button class="btn ${done ? '' : 'primary'}" data-row-done>${done ? '✓ Rowed, tap to undo' : 'Mark row done'}</button></div>`));
  }
  return card;
}

function orderCard(iso, editable) {
  const card = el(`<div class="panel-card"></div>`);
  card.appendChild(el(`<h2>Weekly My Fit Foods order</h2>`));
  card.appendChild(el(`<div class="desc">Place it today so the week is pre decided.</div>`));
  card.appendChild(checklist(iso, 'order', PLAN.weeklyOrder, editable));
  return card;
}

// ── Main render ──
export function renderWOD(root) {
  const t = todayISO();
  if (!selected || outOfWeek(selected, t)) selected = t;
  const iso = selected;
  const editable = iso === t;
  const rest = dayType(iso) === 'rest';
  const legs = isLegDay(iso);

  root.innerHTML = '';

  const strip = el(`<div class="datestrip"></div>`);
  const weekStart = addDaysISO(t, -dowOf(t));
  for (let i = 0; i < 7; i++) {
    const dISO = addDaysISO(weekStart, i);
    strip.appendChild(el(`<button class="daytab ${dISO === t ? 'is-today' : ''} ${dISO === iso ? 'is-selected' : ''}" data-wod-day="${dISO}">
      <span class="dow">${APP.weekdayNames[dowOf(dISO)]}</span>
      <span class="dnum">${Number(dISO.slice(8))}</span>
    </button>`));
  }
  root.appendChild(strip);
  if (!editable) root.appendChild(el(`<div class="read-only-note">${iso < t ? 'Past day, view only.' : 'Planning view, logging opens on the day.'}</div>`));

  root.appendChild(heroCard(iso));

  if (rest) {
    root.appendChild(rehabCard(iso, editable, 'rehab1'));
    root.appendChild(orderCard(iso, editable));
    root.appendChild(rehabCard(iso, editable, 'rehab2'));
    return;
  }

  if (legs) {
    const pc = phaseCard(iso);
    if (pc) root.appendChild(pc);
    root.appendChild(legChecklistCard(iso, editable));
  } else {
    root.appendChild(rehabCard(iso, editable, 'rehab1'));
  }
  root.appendChild(exercisesCard(iso, editable));
  root.appendChild(rowCard(iso, editable));
  root.appendChild(rehabCard(iso, editable, 'rehab2'));
}

function outOfWeek(iso, t) {
  const weekStart = addDaysISO(t, -dowOf(t));
  return iso < weekStart || iso > addDaysISO(weekStart, 6);
}

// ── Events (delegated from app.js) ──
export function handleWODClick(e, rerender, toast) {
  const t = e.target;
  const iso = selected || todayISO();

  const dayBtn = t.closest('[data-wod-day]');
  if (dayBtn) { selected = dayBtn.dataset.wodDay; rerender(); return true; }

  const check = t.closest('[data-checkitem]');
  if (check) { Store.toggleCheck(iso, check.dataset.checkitem); rerender(); return true; }

  if (t.closest('[data-lift-done]')) {
    const on = Store.toggleCheck(iso, 'lift');
    toast(on ? 'Session logged ✓' : 'Session undone');
    rerender(); return true;
  }
  if (t.closest('[data-row-done]')) {
    const on = Store.toggleCheck(iso, 'row');
    toast(on ? 'Row logged ✓' : 'Row undone');
    rerender(); return true;
  }
  return false;
}

export function handleWODChange() { return false; }
export function wodJumpToToday() { selected = todayISO(); }
