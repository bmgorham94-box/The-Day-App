# The Day

A personal daily-planner PWA for one user. It answers one question instantly —
**"what am I doing right now, and what's next?"** — and tracks meals against exact
macro targets with one-tap check-offs.

No frameworks. No backend. No accounts. Vanilla JS + HTML + CSS, ~50 KB of shipped
JavaScript, installable to the iOS home screen and fully offline-capable.

---

## What it does

- **Focus card** — current block big, next block + live countdown small. Tap it to
  scroll the day-spine to now.
- **Day spine** — a vertical timeline with a clay "now" dot, tone-colored cards for
  lifts / rows / prep, checkable meal cards with `P · kcal` chips, and expandable
  session lists (exercises live inside the block that needs them).
- **One-tap meal check-off** — protein + calorie progress bars, "still to land" hints,
  undo, and automatic reset at midnight.
- **Running late** — one control on the afternoon (+30 / +60 / reset) shifts the
  pre-lift meal, the lift, and everything after it — for today only.
- **Adherence** — the last 14 days as neutral dots (protein landed / calories within
  ±5% / lifted / rowed) with ratio labels. No streaks, no red, no shame.
- **Weight log** — one numeric field, a 7-day rolling-average sparkline.
- **Phase + era engine** — the phase badge and macro targets switch by date automatically, and the meal system swaps on its own date: **Era A "Batch week"** (home oat bake + Boujee Mac) flips to **Era B "MFF"** on `2026-08-03`. During Era A the header shows a *"Batch week · MFF starts Aug 3"* chip.
- **`.ics` export** — a 7-day calendar with 10-minute alarms so iOS Calendar becomes
  the notification layer. Regenerate any time from Settings.
- **Data export / import** — all state as a single JSON file.
- **Week strip + tabs** — today is ringed; other days are read-only planning views.

### A note on notifications

iOS home-screen PWAs cannot schedule local notifications without a push server, and
there is no server here. Nothing fakes or promises push. Time-awareness is in-app
(countdowns, the now-marker) **plus** the exportable `.ics` with native calendar
alarms. That is the notification layer, honestly.

---

## Editing the plan — `config.js` is the settings

There is no settings UI for the schedule. **Everything lives in `config.js`:** wake
times, meals (with exact protein + calories), training sessions, the dinner rotation,
macro targets, phases, the row protocol, and Sunday prep steps. Change the plan by
editing that one file — app code never hard-codes content.

Common edits:

| To change… | Edit in `config.js` |
|---|---|
| A meal's protein / calories / time | `MEAL_ERAS[n].meals.training` or `.rest` |
| Phase-1 macro targets | `MEAL_ERAS[n].targets` (per era) |
| When the meal system swaps | `MFF_START` (one constant) |
| Add a future meal system | append a new entry to `MEAL_ERAS` |
| Which session runs on a given day | `WEEK[dow].session` |
| A session's exercises | `SESSIONS.dayN.exercises` |
| Dinner for a day | `WEEK[dow].dinner` |
| Phase dates / Phase 2–3 anchors | `PHASES` |
| Check-in cadence | `CHECKIN_ANCHOR` / `CHECKIN_INTERVAL_DAYS` |
| Row protocol / hydration note | `ROW` |

**Meals are modeled as dated eras.** The user changes his meal system periodically, so
meals *and* their macro targets live in `MEAL_ERAS` — each era has a `[start, end)` date
window. Resolving the plan for any date picks the right era automatically; swapping to a
new system is a config edit (a new era entry + a date), never a code change. Phase 1
(Recomp) draws its targets from the active era; Phases 2–3 carry their own kcal anchors.

> **Load-bearing rule:** each era's meals must sum to its exact targets — Era A "Batch
> week" to `210P / 2767 kcal` (training) and `184P / 2439 kcal` (rest); Era B "MFF" to
> `208P / 2601 kcal` and `182P / 2273 kcal`. Unit tests enforce every era. Phase 2/3 macro
> splits are intentionally `null` (TBD); the app shows a banner until you fill them in.
> Don't invent numbers.

After editing, just reload the app (or bump the `CACHE` version in `sw.js` to force the
service worker to pick up changes on next load).

---

## Re-exporting the calendar (`.ics`)

Open the app → **Settings** → **Export 7-day .ics**. It generates a week of events
starting today, each with a 10-minute alarm (meals, rows, lift, daily meeting). Open the
downloaded file with iOS Calendar / Apple Calendar to import. Re-export whenever the plan
changes — UIDs are stable, so re-importing updates existing events rather than duplicating
them.

---

## Deploying to GitHub Pages

This is a static site — no build step.

1. Push to your repository.
2. **Settings → Pages**.
3. **Source: Deploy from a branch**, pick your branch and the **`/ (root)`** folder.
4. Save. Your app is live at `https://<user>.github.io/<repo>/`.

The `.nojekyll` file tells Pages to serve the files as-is. On iOS, open the URL in Safari
→ **Share → Add to Home Screen** to install it as a standalone app.

---

## Development & tests

```bash
# Run unit tests (Node's built-in test runner — no dependencies)
npm test        # or: node --test

# Serve locally (any static server works; a service worker needs http, not file://)
python3 -m http.server 8199
# then open http://localhost:8199

# Regenerate PWA icons (dependency-free PNG generator)
node scripts/gen-icons.mjs
```

### What the tests guarantee

- Era A meals sum to exactly `{ p: 210, kcal: 2767 }` (training) / `{ p: 184, kcal: 2439 }` (rest); Era B to `{ p: 208, kcal: 2601 }` / `{ p: 182, kcal: 2273 }`.
- Era resolver returns **Batch week** on `2026-08-02` and **MFF** on `2026-08-03`.
- Phase resolver returns **Recomp** on `2026-09-30`, **Build** on `2026-10-01`, **Reveal** on `2027-03-15`.
- Phase 2/3 splits stay `null` (never invented).
- Check-in predicate is true on `2026-07-26` and every 14 days.
- Day rollover starts a clean slate (checks are keyed by ISO date; old entries prune after 30 days).
- `.ics` export is well-formed, has 10-minute alarms, and is deterministic across re-exports.

---

## Repo layout

```
index.html            App shell
styles.css            Design system (light default + auto dark, safe-area insets)
app.js                UI orchestration
config.js             ← single source of truth (the plan)
engine.js             Pure date / phase / day-building logic (imported by app + tests)
store.js              localStorage persistence
ics.js                Calendar export
sw.js                 Service worker (offline-first)
manifest.webmanifest  PWA manifest
icons/                192 / 512 / maskable / apple-touch-180
scripts/gen-icons.mjs Icon generator
tests/                node:test unit tests
```
