# The Day

A personal daily-planner PWA for one user. It answers one question instantly —
**"what am I doing right now, and what's next?"** — and tracks meals against exact
macro targets with one-tap check-offs.

No frameworks. No backend. No accounts. Vanilla JS + HTML + CSS, <100 KB of shipped
JavaScript, installable to the iOS home screen and fully offline-capable.

---

## What it does

- **Focus card**: current block big, next block + live countdown small. Tap to scroll the spine to now.
- **Day spine**: the timeline with the now dot. Meals carry cal/P/C/F chips and one tap check offs; training, rehab, posture, and the Sunday order deep link into WOD.
- **Morning weigh in** at the top of Today with the 7 day rolling average. A single day is never shown as a trend.
- **WOD tab**: session name, location (Home or LA Fitness), focus line, exercise check offs with sets and reps, the leg day pre session checklist, the reintroduction phase label (through Nov 10, 2026), an optional row with a weekly cap of 3, and both rehab rounds. Hevy stays the lifting log.
- **Meals**: My Fit Foods plan with a weekday lunch and dinner rotation, real macros in the totals, a rest day variant on Sunday, and the weekly order as a Sunday check off.
- **Tracking**: check in badge every 14 days (anchored Oct 18, 2026), first Saturday photos + InBody card with a body fat field, and the body fat gate: 17 percent or higher shows "Build block ends. Start the mini cut."
- **Running late** (+30/+60) shifts the afternoon for today only. Adherence view, `.ics` export with alarms, JSON export/import, auto updating offline first PWA with self hosted fonts.

### A note on notifications

iOS home-screen PWAs cannot schedule local notifications without a push server, and
there is no server here. Nothing fakes or promises push. Time-awareness is in-app
(countdowns, the now-marker) **plus** the exportable `.ics` with native calendar
alarms. That is the notification layer, honestly.

---

## Editing the plan: `config.js` is the settings

Everything lives in one plain data object, `PLAN`, at the top of `config.js`: anchors, meals and the rotation, the weekly order, training days and exercises, the leg checklist, the reintroduction phase dates, cardio cap, daily blocks, and tracking (check in anchor, seed, body fat gate). The rehab sequence is `REHAB`. Edit values there; app code never hard codes content. UI copy uses no em dashes (unit tested).

After editing, just deploy. Updates reach installed copies automatically (network first service worker + a one time self reload); offline still works from the last cached version.

## Re-exporting the calendar (`.ics`)

Open the app → **Progress** → **Export 7-day .ics**. It generates a week of events
starting today, each with a 10-minute alarm (meals, rows, engines, lifts, the daily meeting). Open the
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

- Monday totals exactly 2,925 cal / 268P from the real rotation macros; every training day lands 2,800 to 2,950; Sunday rest is about 2,450 with the Chicken Salad Wrap at 2:30p and no pre/post lift items.
- Wake 5:15a weekdays / 6:30a weekends; meeting 7 to 8a weekdays; training window 2 to 3p; sessions land on the right days and locations.
- Reintroduction phases resolve by date (2 sets through Oct 27, listed sets Oct 28 to Nov 10, nothing after) and the RDL ban holds until Nov 14, 2026.
- Check ins every 14 days from Oct 18, 2026; first Saturday detection; the 17 percent body fat gate; the Oct 4 seed (176.0 lb, 15 percent).
- No em or en dashes in any plan or rehab copy. Store round trips, pruning, and the `.ics` export stay covered.

---

## Repo layout

```
index.html            App shell
styles.css            Design system — locked "printed program" palette as tokens
app.js                UI orchestration (Today · WOD · Fuel · Progress)
wod.js                WOD tab: session check offs, leg checklist, weekly order
config.js             ← single source of truth (the plan)
engine.js             Pure date / phase / day-building logic (imported by app + tests)
store.js              localStorage persistence
ics.js                Calendar export
sw.js                 Service worker (offline-first)
manifest.webmanifest  PWA manifest
icons/                192 / 512 / maskable / apple-touch-180
fonts/                Self-hosted Inter + Bricolage Grotesque (woff2)
scripts/gen-icons.mjs Icon generator
tests/                node:test unit tests
```
