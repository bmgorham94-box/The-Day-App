# PLAN — program v2 build-out ("printed program" retheme + WOD)

## Phase 0 · What the repo actually is

The prompt's expected stack (Vite + React + TS, Dexie, vite-plugin-pwa, recharts,
tabs Today/Train/Fuel/Progress) **does not match this repo**. Per the Phase-0 rule,
the code wins. Actual stack:

| Expected | Actual | Consequence |
|---|---|---|
| Vite + React + TypeScript | **Vanilla JS ES modules, no build step** | Phases implement as plain modules; `npm run build` → `node --test` + headless-Chromium smoke |
| Dexie / IndexedDB | **`localStorage` via `store.js`** (single JSON doc, ISO-date keys) | "Schema migration" = additive keys on the same doc; nothing dropped. Engine-cycle state lives here; it survives app closes and updates. A full uninstall wipes site data — JSON export/import is the backup path (pre-existing) |
| vite-plugin-pwa | Hand-written `sw.js` (network-first + cache fallback, auto-update) | Font precache added there; cache bumped `theday-v3` |
| recharts | Hand-drawn SVG sparkline | Kept |
| @fontsource packages | No node deps shipped | woff2 files vendored into `fonts/` (pulled from the @fontsource tarballs), `@font-face` in `styles.css`, precached |
| Tabs Today/Train/Fuel/Progress | Tabs were Today/Adherence/Targets/Settings | Final: **Today · WOD · Fuel · Progress**. Fuel = old Targets (macro targets + weight log). Progress = old Adherence + the old Settings panels (ics/export/import/Hevy) folded in at the bottom — keeps the bar at four tabs |
| "Train tab" to absorb | Training lived as expandable lift blocks on the Today spine | Spine lift block is now a compact card that deep-links into WOD (single training surface); the old inline exercise list + prompt()-based load memory is removed |

## File map

- `config.js` — all program data (typed constants): `PROGRAM` (7 days, exercises with schemes/cues/tags), `ENGINES` (16), `REHAB` (Piriformis Protocol v2 + rules), `PRIMER`, row prescriptions, hero tones. Meal eras/phases/check-ins untouched.
- `engine.js` — pure logic: day building (unchanged core), engine-rotation resolver (`engineFor`), streak helpers.
- `wod.js` — new module: WOD tab render (date strip, hero, rehab, strength logging, engine block + timer, row, finish), timer engine (timestamp-based, Wake Lock, WebAudio tick).
- `app.js` — tab restructure, Today refresh, Fuel/Progress views.
- `store.js` — additive keys: `sets` (per-date per-exercise set logs), `engine` (wed/sat cycle indices + per-date swaps), `steps`, `scores` (engine scores), existing `checks/weight/shift/settings/notes` untouched → **no data loss**.
- `styles.css` — full retheme to the locked palette; every color a token.
- `fonts/` — self-hosted woff2 (Inter 400/500/600/700, Bricolage 600/700/800, latin). No Google Fonts request anywhere.
- `sw.js` — cache `theday-v3`, fonts in precache.

## Deviations from the prompt (code/data wins, or honesty required)

1. **Macros**: prompt says "unchanged — do not alter existing Fuel logic, just confirm targets" but lists 300–310 g protein. The existing load-bearing, unit-tested meal system sums to 208P/2,601 kcal (training) · 182P/2,273 (rest) — the kcal bands match the prompt (2,600–2,700 / 2,200–2,300), the protein figure does not. Kept the existing tested numbers; nothing invented.
2. **Thursday** becomes a training day (Shoulders) per the new week. Meals resolve by `WEEK[dow].type`, so Thu now uses training-day meals — which is exactly what "Training days (Mon–Sat)" asks. Sunday stays rest.
3. **Rows moved post-lift** (never morning) per the new schedule; the old Tue/Thu 6:15a rows and Sun 11a row are gone. Wed/Sat rowing lives inside the engine; Sun off.
4. **Equipment flip**: dumbbells (125 lb adjustable pair) + vest now exist and are programmed. The old "no-DB" test is replaced by a banned-list test (kettlebell, band, box, sled, machine, jump rope, wall ball, running, overhead barbell, jumping) reflecting the new authoritative list + space constraints.
5. **Steps**: manual field only, honest caption. A HealthKit integration is impossible from a browser PWA and none is mocked. *Path forward (not built): an iOS Shortcuts automation could append steps to the exported JSON for import.*
6. **Wake/meeting anchors**: kept the user's explicit personalization (4:30a wake, 5:30–6:00a Mon–Fri meeting) — deliberate user request that post-dates the pasted spec.
7. **"DB survives reinstall"**: localStorage survives updates and closes; a true uninstall clears site data on iOS. JSON export/import is the durable path (already shipped).
8. Wed-1 engine "DB front-rack squat" is kept at/below shoulder height by cue ("DBs racked at the collarbones") to satisfy the ceiling rule; every library entry as given is overhead-free and verified against the banned list by a unit test.

## Phase 1 · Contrast audit (WCAG, computed)

Given tokens that fail small-text 4.5:1 got **text-safe variants** (spec's gate:
"darkened until it passes"); the raw tokens remain for large text and graphics.

| Pair (usage) | Ratio | Verdict |
|---|---|---|
| `--ink` #26241F on `--paper` #F7F4EE (body) | **14.12** | ✓ |
| `--ink` on `--card` #F1EDE1 (body) | **13.25** | ✓ |
| `--muted` #57534A on paper / card (secondary body) | **6.98 / 6.54** | ✓ |
| `--subtle` #8A8474 on paper (raw — decorative/large only) | 3.40 | ✓ large-only (≥3:1) |
| `--subtle-text` **#6E6859** on card (small labels — added variant) | **4.74** (≥4.83 on paper) | ✓ |
| `--rust` #B44A2C on paper / card (eyebrows, links, active tab — light) | **4.83 / 4.53** | ✓ |
| `--rust-bright` #D3603F on paper (raw — large text only in light) | 3.47 | ✓ large-only |
| `--cream` on `--ink` hero | **13.28** | ✓ |
| `--cream` on `--ink-deep` | **15.19** | ✓ |
| `--cream` on `--olive` #5C5B3C hero | **5.96** | ✓ |
| `--cream` on `--rust` hero / badges | **4.55** | ✓ |
| `--ember` #E08A63 on `--ink-deep` (engine minute markers, dark accents) | **6.74** | ✓ |
| Dark: `--cream` on #201F1D card | **14.11** | ✓ |
| Dark: `--rust-bright` on ink-deep (large accents) | 4.66 | ✓ large |
| Dark: eyebrows use `--ember` (small accent text) | **6.74** | ✓ |
| Dark: `--subtle-text` **#A8A193** on #201F1D | **6.42** | ✓ |

Light-mode eyebrows therefore render in `--rust` (not rust-bright), and dark-mode
eyebrows/small-accents in `--ember` — implemented as the `--kicker` alias so
components don't branch.

## Verify (Phase 6) — actual gates for this stack

1. `node --test` green (meal sums, phases, eras, check-ins, store, ics, day
   anchors, **engine rotation 8+8 no-repeat**, **equipment banned-list**).
2. Headless-Chromium smoke: all four tabs render; set-log/rehab/steps/score
   round-trip a reload; timer stays accurate across a simulated 60 s background
   (timestamp math); offline reload renders with correct self-hosted typography;
   320 px width no horizontal scroll.
3. Greps: no serif families, no `fonts.googleapis`, no banned movements, no
   hardcoded hex outside `styles.css`' token block (+ icon generator/manifest).
4. `sw.js` cache bumped v3 (+ fonts precached) so installed instances update.
