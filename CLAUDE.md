# FitRack PWA

## Project
Single-file PWA fitness tracker (app name: **FitRack**, formerly AFIF/LOG — repo renamed from `afif-log` to `FitRack-Fitness-Tracker`). One file: `index.html`. Vanilla JS, no build step, no npm, no framework.
Deployed via GitHub Pages: https://afif-ai.github.io/FitRack-Fitness-Tracker/
Support files: `manifest.json`, `sw.js`, `icons/` (real PNGs: 192, 512, 512-maskable), `fonts/archivo.woff2` (self-hosted variable font, weights 100–900 — no Google Fonts request).

## Deploy
```bash
# IMPORTANT: bump CACHE_NAME in sw.js (fitrack-shell-vN → vN+1) on EVERY deploy,
# otherwise installed users keep the old cached shell assets.
git add -A && git commit -m "msg" && git push origin main
```
GitHub Pages auto-deploys in ~1 min. The SW is network-first for HTML (so index.html updates arrive without a bump), but static assets (icons, font, manifest) are cache-first — the bump is what refreshes those and clears the old cache.

## Storage layer
Two stores:
- **localStorage** via the `LS` helper for all structured data:
  - `LS.get(key, default)` — reads + JSON.parses
  - `LS.set(key, value)` — JSON.stringifies then writes; **returns `true`/`false`** — callers that must not lose data (e.g. `commitWorkout`) check the return and keep their draft on failure
  - **NEVER** call `JSON.stringify()` before passing to `LS.set()` — it already stringifies. Double-stringify corrupts data.
- **IndexedDB** (db `fitrack`, store `photos`, autoIncrement `id`) via the promise-wrapped `PDB` helper (`all/add/del/clear`) for progress photos only — they're too big for localStorage. `migratePhotosToIDB()` (one-shot, boot) moves any legacy `photos` localStorage key into IDB; `photosReady` is the migration promise every photo reader awaits. `photoCache` (newest-first, by `id` desc) backs the lightbox.

### localStorage keys
| Key | Type | Content |
|-----|------|---------|
| `profile` | Object | `{name, goal_kg?, start_w?}` — user identity + weight goal. Read via `profile()`/`userName()`/`goalKg()`/`startW()` (getters fall back to `GOAL_HIGH`/`START_W` constants). `name` is user input: `sanitizeName` on write, **`esc()` at every render site**. Missing key + existing records = pre-profile install → boot seeds `{name:"Afif"}` silently; missing key + no records → onboarding (`needsOnboarding()`). |
| `weights` | Array | `{date, kg}[]` ascending by date |
| `workouts` | Array | `{date, session, entries[], durationMin?}[]` newest-first, **uncapped** |
| `cardio_sessions` | Array | `{date, type, duration_min, intensity, run_ratio}[]` newest-first, uncapped |
| `weekly_checkins` | Array | `{week_ending, weight_kg, sessions_completed, notes}[]` max 52 (old entries may carry `energy_avg`; render it only if present) |
| `body_comp_scans` | Array | `{date, body_fat_pct, visceral_fat_level, muscle_kg, notes}[]` (upsert by date) |
| `lift_draft` | Object | `{sess, log, startedAt?}` — in-progress lift inputs + workout-start epoch ms, saved per keystroke, cleared on successful save. Boot guard: draft older than 12 h prompts resume (clock restarted) or discard. |
| `routines` | Object | `{name: {type:"upper"\|"lower", exercises:[[name,cue],...]}}` — seeded from `SESSIONS` on first boot (`seedRoutines()`); `type` drives the progression increment |
| `theme` | String | `"lime"` (default) or `"electric"` — `applyTheme()` also syncs the `theme-color` meta |
| `last_export` | String | YYYY-MM-DD of last backup; Home shows a nudge banner when missing (≥3 records) or >30 days old |
| `cardio_migrated` | Bool | one-shot flag for `migrateCardio()` (pre-rebuild `daily:*` cardio → `cardio_sessions`) |
| `daily:YYYY-MM-DD` | Object | **legacy only** (pre-rebuild water/steps/energy/notes/cardio) — nothing writes these anymore; kept for cardio migration + old backups |

### Workout entry schema
```js
{ ex: "Chest press", weight: 50, sets: [{weight:50,reps:12},{weight:50,reps:12},{weight:52.5,reps:10}] }
```
- Top-level `weight` = first logged set's weight (used by compact history + `prevText`).
- Each set carries its own `weight` and `reps`. RIR was removed in the rebuild; old sets with `rir` are still valid (field ignored).
- `durationMin` optional (from `lift_draft.startedAt`).
- Old formats (`{reps:"3x12"}`, sets without per-set weight) auto-migrated at boot by `migrateWorkouts()`. Idempotent.

### Backup format
`exportData()` (async) produces `{_app:"fitrack", _v:3, data:{<raw localStorage>}, photos:[{date,dataURL}]}` and stamps `last_export`.
`importData()` validates (`_app` is `fitrack`/`afiflog` or dump contains known keys), routes photos to IDB (handles v3 top-level array AND v1/v2 `data.photos` JSON string — never writes a `photos` localStorage key), then **`location.reload()`** so in-memory state can't clobber imported data.

## Service worker (sw.js)
Cache `fitrack-shell-vN`. Navigations/HTML → **network-first**, cached shell as offline fallback. Everything else → cache-first with runtime caching of same-origin responses; offline misses return a 503 `Response`, never `undefined`. Registered with a relative path (GitHub Pages subpath).

## Tabs (current)
5 bottom tabs: **Home** (`today`) · **Workout** (`lift`) · **Cardio** (`cardio`) · **History** (`history`) · **Profile** (`profile`).
Sub-screens: `weight`, `checkin`, `photos`, `settings` (via Profile) · `routines`, `finishgate` (via Workout) · `onboard` (first run only, no tab).
- Nav registry: `RENDERERS`, `TABBAR`, `PROFILE_SUB`, `WORKOUT_SUB`, `TITLES`; history nav via `navStack`/`go()`/`goBack()`/`goForward()`; header built by `renderHeader()`.
- **Focus mode**: `chromeHidden()` hides the tab bar during onboarding AND while a workout is active (`workoutStart` set, tab `lift`/`finishgate`). While active, `go()` blocks navigation to anything except `lift`/`finishgate` (toast) and `goBack/goForward` no-op. **Boot must route to `go("lift")` when a draft restored `workoutStart`** — a guarded `go("today")` would no-op and boot blank.
- **Onboarding** (`onboard`): 3 steps (welcome → name required → optional current/goal weight). Gated by `needsOnboarding()` at boot — checks record stores only (`routines`/`theme` are seeded for everyone before the gate).
- **Home**: greeting (`userName()`), backup-nudge banner, stat grid (week/streak/month/total), weight card + sparkline, `dashboardBlock()` (moved here from Profile).
- **Workout**: pre-start = routine selector cards ("tap to select") + explicit **START** CTA (`startWorkout()` stamps `workoutStart`); no exercises rendered until started. Started = focus mode: timer bar, exercise cards, **inline FINISH at scroll bottom** (not floating), red **Discard** in the header (`discardWorkout()`, confirm → clears draft/log/timers). `setLog` is pure state+`saveDraft()` — **never full-re-render the lift view from an `oninput` handler** (replaces the focused input and closes the mobile keyboard).
- **Finish gate** (`finishgate`): a progress photo is REQUIRED to save a session (`pendingPhoto` → IDB → `commitWorkout()`). Redirects to `lift` if no workout is active. `commitWorkout` clears `workoutStart` BEFORE `go("history")` — required to pass the focus-mode nav guard.
- **Cardio**: log form (type/duration/intensity/ratio; draft survives type switches via `cardioDraft`) + history list with per-row delete (`delCardio(i)`, index into newest-first array).
- **History**: collapsible month groups (`histOpen` Set of `YYYY-MM`, newest open by default, `toggleMonth(k)`); per-workout delete (`delWorkout(i)` — **`i` is the absolute index into `workouts`, captured before grouping**); est-1RM chart card on top.
- **Profile**: tap name/avatar to edit (`editName()`, prompt + `sanitizeName`) → Weight (+ body comp, tap the Start/Goal line for `editGoal()`), Check-in, Photos, Settings (single `.mrow` entry; header gear removed).

## Timers
- Rest timer: **wall-clock deadline** (`restEndsAt` epoch; `restPaused` holds remaining seconds while paused). `restRemaining()` derives display time so background throttling can't drift it. `armAudio()` creates/resumes the shared `AudioContext` inside the `restStart`/`restToggle` gesture (iOS blocks audio otherwise); `restDone()` beeps + vibrates.
- Duration clock: `workoutStart` epoch, `updateDurLabel()`/`ensureDurTimer()`. A `visibilitychange` listener refreshes both displays on foreground.

## Security / escaping
- `esc(s)` HTML-escapes every user-originated string at render time (names, notes, cues, values).
- Inline `onclick`/`oninput` handlers must receive **indices, not user strings** (`setLog(idx,…)`, `pickSess(idx)`, `rt*(ri,…)` resolve names via `exAt()`/`rtNameAt()`); imported data bypasses `sanitizeName`, so nothing user-typed may land inside a JS string literal in HTML.

## Dates
`todayStr()` = YYYY-MM-DD local. **Always parse date strings with `parseLocal()`**, never `new Date("YYYY-MM-DD")` (parses as UTC; off-by-one west of Greenwich). Weeks are Mon–Sun via `weekBounds()`.

## User / fitness context
- Goal: 89 → 68-70 kg fat loss + muscle building
- Beginner gym-goer, anemia (no training to failure, 1-2 reps in reserve)
- Elevated liver enzymes (never suggest fat burners or strong pre-workouts)
- High LDL (low saturated fat)
- Training: double progression (reps first, then weight); weekly Saturday check-ins
- Supplements: whey + creatine only

## Medical flags (always respect)
- No training to failure — leave 1-2 reps in reserve (anemia)
- No fat burners, no strong pre-workouts (elevated liver enzymes)
- Low saturated fat guidance (high LDL)

## Key helpers (JS)
| Function | Purpose |
|----------|---------|
| `parseLocal(s)` | "YYYY-MM-DD" → local-midnight Date (use instead of `new Date(str)`) |
| `esc(s)` | HTML-escape user strings for innerHTML |
| `weekBounds()` / `weeklySessionCount()` / `latestWeight()` | Week + summary stats |
| `computeStreak()` / `monthCount()` | Home stat grid |
| `profile()` / `userName()` / `goalKg()` / `startW()` | Profile getters (localStorage `profile`, constant fallbacks) |
| `needsOnboarding()` / `renderOnboard()` / `obNext/obBack/obFinish` | First-run onboarding (gate seeds "Afif" for pre-profile installs) |
| `editName()` / `editGoal()` | Prompt-based profile edits (Profile hub / Weight screen) |
| `migrateWorkouts()` / `migrateCardio()` / `migratePhotosToIDB()` | One-shot idempotent boot migrations |
| `est1RM(w,r)` / `exercisePRs()` / `exerciseSeries(ex)` / `sessionVolume()` / `volumeByWeek(n)` / `sessionsByWeek(n)` | Analytics (derived from `workouts`, no schema) |
| `chartSVG` / `lineChart` / `barChart` / `sparkSVG` | Inline SVG charts (gradient fills, gridlines, last-point label; `chartGrad()` mints **unique gradient ids per instance** — required, multiple charts render per page; `chartSVG` returns a wrapper div incl. `.chart-meta` row) |
| `seedRoutines()` / `routines()` / `routineNames()` / `routineExercises(n)` / `routineType(n)` / `exAt(idx)` | Routines layer |
| `routinesEditor()` + `rtAdd/rtDel/rtType/rtRename/rtExAdd/rtExDel/rtExMove` (index args) | Routines editor screen |
| `saveDraft()` / `startWorkout()` / `discardWorkout()` / `commitWorkout()` | Lift session lifecycle (explicit start; commit checks `LS.set` result; draft kept on failure) |
| `chromeHidden()` | Tab-bar visibility predicate (onboarding + active workout) |
| `delWorkout(i)` / `delCardio(i)` / `toggleMonth(k)` | History/Cardio delete + month-group collapse |
| `restStart/restToggle/restReset` + `restRemaining()`/`updateRestBar()` | Rest timer |
| `PDB` / `loadPhotos()` / `photosReady` | IndexedDB photo store |
| `backupNudge()` | Home export-reminder banner |
| `bodyCompBlock()` / `saveBodyComp()` / `bodyComps()` | Body-comp log (Weight screen) |

## Rules
- Mobile-first, no desktop-only UI; zoom must stay enabled (no `user-scalable=no`)
- No frameworks, no npm packages, no build tools, no external network requests at runtime (font is self-hosted)
- Inline SVG icons via `I` object + `svg()` helper; icon-only buttons get `aria-label`
- All buttons use `onclick="fn()"` pattern with **index arguments** for user-named things
- `monthOneBanner()` (anemia reminder) auto-hides 28 days after first workout

## Progression reference
All exercises: 3 sets × 10-12 reps. All sets ≥12 reps → add weight (+2.5 kg upper / +5 kg lower, from routine `type`), aim resets to 10,10,10.
