# FitRack PWA

## Project
Single-file PWA fitness tracker (app name: **FitRack**, formerly AFIF/LOG — repo/URL still `afif-log`). One file: `index.html`. Vanilla JS, no build step, no npm, no framework.
Deployed via GitHub Pages: https://afif-ai.github.io/afif-log/
Rebrand note: manifest name/short_name, page title, header logo, backup filename, and sw cache (`fitrack-v1`) all say FitRack. Icons are still the old AFIF/LOG PNGs (data URIs in manifest.json) — pending a new FitRack icon. Known bug: `<link rel="apple-touch-icon">` in index.html points at `manifest.json` instead of a PNG; iOS ignores manifest data-URI icons, so ship the new icon as real PNG files (180 touch + 192/512 maskable). Exported backups keep `_app:"afiflog"` for import back-compat.

## Deploy
```bash
git add index.html && git commit -m "msg" && git push origin main
```
GitHub Pages auto-deploys in ~1 min.

## Storage layer
localStorage only via `LS` helper object:
- `LS.get(key, default)` — reads + JSON.parses
- `LS.set(key, value)` — JSON.stringifies then writes
- **NEVER** call `JSON.stringify()` before passing to `LS.set()` — it already stringifies. Double-stringify corrupts data.

### Keys
| Key | Type | Content |
|-----|------|---------|
| `daily:YYYY-MM-DD` | Object | water, steps, energy, notes, cardio |
| `weights` | Array | `{date, kg}[]` |
| `workouts` | Array | `{date, session, entries[], durationMin?}[]` |
| `photos` | Array | `{date, dataURL}[]` |
| `weekly_checkins` | Array | `{week_ending, weight_kg, sessions_completed, energy_avg, notes}[]` max 52 |
| `body_comp_scans` | Array | `{date, body_fat_pct, visceral_fat_level, muscle_kg, notes}[]` (upsert by date) |
| `lift_draft` | Object | `{sess, log, startedAt?}` — in-progress lift inputs + workout-start epoch ms, auto-saved per keystroke, cleared on SAVE |
| `routines` | Object | `{name: {type:"upper"\|"lower", exercises:[[name,cue],...]}}` — user-editable workout templates. Seeded from `SESSIONS` defaults on first boot (`seedRoutines()`). `type` drives the progression increment. |

### Daily object schema
```js
{
  water: 0,           // int 0-8
  steps: false,       // bool
  energy: 0,          // int 0-5
  notes: "",          // string
  cardio: {
    done: false,
    type: null,       // "run/walk" | "other" | null
    duration_min: null,
    intensity: "easy",// "easy"|"moderate"|"hard"
    run_ratio: null   // string e.g. "1:2" (only shown when type="run/walk")
  }
}
```

### Workout entry schema (CURRENT)
```js
{ ex: "Chest press", weight: 50, sets: [{weight:50,reps:12,rir:2},{weight:50,reps:12,rir:2},{weight:52.5,reps:10,rir:2}] }
```
- Top-level `weight` = the main/shared weight (used by `computeNextTargets` + compact history).
- Each set carries its own `weight`. The Lift UI has one shared `kg` box; tapping `± per-set kg`
  reveals optional per-set weight overrides. A set's weight = its override, else the shared weight.
- `rir` (reps in reserve, 0–4) is one shared value per exercise, applied to every logged set on save
  (`null` if not entered). RIR 0 on save shows an anemia "leave 1-2 in reserve" guard in the progression card.
- History shows compact `50kg · 12,12,10` when all set weights match, else per-set `12@50, 10@52.5`,
  then `· RIR n` when present.
- Workout record carries optional `durationMin` (from `lift_draft.startedAt`, stamped on first set entry).
- Old entries `{ ex, weight: "50", reps: "3x12" }` and pre-per-set `sets:[{reps}]` are auto-migrated
  at boot via `migrateWorkouts()` (backfills `weight` onto each set). Idempotent. Old sets without `rir`
  and old workouts without `durationMin` are valid (fields optional).

### Back-compat notes
- Old cardio was stored as a boolean (`cardio: true/false`). On load, converted to full object with `done` field.
- Old workout `reps` string format migrated to `sets[]` array by `migrateWorkouts()`. Idempotent.
- Pre-per-set workouts (`sets:[{reps}]` with no per-set `weight`) get `weight` backfilled from the entry's top-level `weight` by `migrateWorkouts()`. Idempotent.

### Weekly check-in schema
```js
{ week_ending: "YYYY-MM-DD", weight_kg: 85.2, sessions_completed: 3, energy_avg: "3.2", notes: "..." }
```

### saveDaily pattern (atomic read-merge-write)
```js
const saveDaily = (updates) => {
  const key = `daily:${todayStr()}`;
  let current = {};
  try { const e = LS.get(key); if (e) current = e; } catch {}
  const merged = { ...current, ...updates };
  LS.set(key, merged); // LS.set already stringifies — no JSON.stringify here
  return merged;
};
```

## CSS variables (dark theme)
```css
--bg:#0a0a0a; --card:#171717; --border:#262626; --border2:#333;
--ink:#f5f5f5; --ink2:#a3a3a3; --ink3:#737373; --ink4:#525252;
--lime:#a3e635; --sky:#38bdf8; --orange:#fb923c;
--emerald:#34d399; --red:#f87171; --purple:#a78bfa;
```

## Sessions / exercises
The `SESSIONS` const is now only the **seed source** for `routines` (see Keys). At runtime, the Lift tab,
`saveWorkout`, and `computeNextTargets` read the editable `routines` LS key via `routines()` /
`routineNames()` / `routineExercises()` / `routineType()` — NOT `SESSIONS` directly. Users add/rename/
delete/reorder routines and exercises in the Backup tab (`routinesEditor()` + `rt*` handlers). Default seed:
```
Upper A: Chest press, Lat pulldown, Seated row, Shoulder press, Bicep curl, Triceps pushdown
Lower A: Leg press, Romanian deadlift, Leg curl, Leg extension, Calf raise, Plank
Upper B: Incline press, Assisted pull-up, Cable row, Lateral raise, Face pull, Hammer curl
Lower B: Goblet/Hack squat, Hip thrust, Walking lunge, Leg curl, Seated calf raise, Hanging knee raise
```

## Tabs (current)
4 bottom tabs (Hevy-style): **Home** (`today`) · **Workout** (`lift`) · **History** (`history`) · **Profile** (`profile`).
Sub-screens (no bottom button, reached from Profile): `weight`, `checkin`, `photos`, `settings`(Backup, via Profile gear).
- Nav registry: `RENDERERS` (id→render fn), `TABBAR` (4 bottom entries), `PROFILE_SUB` (ids that keep Profile highlighted), `TITLES` (header titles).
- **History nav**: `navStack`/`navIndex` + `go(id)` (push), `goBack()`/`goForward()`. Header (`#appHead`, via `renderHeader()`) shows ← / → on every screen (dimmed at ends), a title, and a right action (date on Home, settings gear on Profile).
- `renderProfile()` = hub: weight/workout stats, `dashboardBlock()` trends, Weight/Check-in/Photos cards, recent-workouts list. `dashboardBlock()` moved here (removed from `renderCheckin`).

## User / fitness context
- Goal: 89 → 68-70 kg fat loss + muscle building
- Beginner gym-goer, anemia (no training to failure, 1-2 RIR)
- Elevated liver enzymes (never suggest fat burners or strong pre-workouts)
- High LDL (low saturated fat)
- Training: double progression method (reps first, then weight)
- Weekly Saturday check-ins
- Supplements: whey + creatine only

## Medical flags (always respect)
- No training to failure — leave 1-2 reps in reserve (anemia)
- No fat burners, no strong pre-workouts (elevated liver enzymes)
- Low saturated fat guidance (high LDL)

## Key helpers (JS)
| Function | Purpose |
|----------|---------|
| `weekBounds()` | Returns `{weekStart, weekEnd}` (Mon–Sun ISO week) as YYYY-MM-DD strings |
| `weeklySessionCount()` | Count workouts this week |
| `weeklyEnergyAvg()` | Average energy > 0 from daily logs this week, returns string or null |
| `latestWeight()` | Latest kg from weights array, or null |
| `migrateWorkouts()` | One-shot boot migration: old `{reps:"3x12"}` → `{sets:[…]}` + per-set `weight` backfill. Idempotent. |
| `computeNextTargets(entries, sessionType)` | Progression logic per exercise (uses top-level `weight`; increment from `routineType()`) |
| `renderProgression(targets, sessionType, toFailure, prs)` | Populates `#prog-card` after save: PR badges, anemia RIR-0 guard, next targets |
| `renderCheckinHistory()` | Partial re-render of `#checkinHistory` in Check-in tab |
| `saveDraft()` | Persists `{sess, log, startedAt}` to `lift_draft` (called on every lift keystroke / session switch) |
| `seedRoutines()` / `routines()` / `routineNames()` / `routineExercises(n)` / `routineType(n)` | Routines layer: one-shot seed from `SESSIONS`, then readers for the editable `routines` LS key |
| `routinesEditor()` + `rtAdd/rtDel/rtType/rtRename/rtExAdd/rtExDel/rtExMove` | Routines editor (Backup tab); names run through `sanitizeName()` before storage |
| `est1RM(w, r)` | Epley estimated 1RM `w*(1+r/30)` |
| `exercisePRs()` / `exerciseNames()` / `exerciseSeries(ex)` | PR map (best weight + best e1RM per exercise), exercise list, est-1RM time series |
| `sessionVolume(entries)` / `volumeByWeek(n)` | Tonnage Σ weight×reps per session; last `n` Mon–Sun weekly volume (tonnes) for the dashboard |
| Rest/duration timers | `restStart/restToggle/restReset` + `updateRestBar()`; `updateDurLabel()`/`ensureDurTimer()` for live workout duration |
| `lineChart(series, {color})` | Generic SVG line chart from `[{label,val}]` (reused by dashboard + body comp) |
| `barChart(items, {color})` | Generic SVG bar chart from `[{label,val}]` |
| `sessionsByWeek(n)` | Last `n` Mon–Sun session counts as `[{label,val}]` for the dashboard |
| `dashboardBlock()` | Weight / sessions / energy trend charts in the Check-in tab |
| `bodyCompBlock()` / `saveBodyComp()` | Body-comp form + trend charts in the Weight tab; upsert by date into `body_comp_scans` |
| `bodyComps()` | Reader for `body_comp_scans` |

## Rules
- Mobile-first, no desktop-only UI
- No frameworks, no npm packages, no build tools
- Inline SVG icons via `I` object + `svg()` helper
- All buttons use `onclick="fn()"` pattern (not addEventListener)
- `todayStr()` returns YYYY-MM-DD in local timezone
- `monthOneBanner()` auto-hides after 28 days from first workout

## Tier 2 features (status)
1. ✅ **Progression targets** — after saving a lift session, shows next-session targets per exercise. Logic: all 3 sets ≥ 12 reps → +2.5 kg (upper) / +5 kg (lower), reset aim to 10,10,10. Implemented in `computeNextTargets()` + `renderProgression()`.
2. ✅ **Weekly check-in tab** — `renderCheckin()`. Auto-fills latest weight, sessions this week, avg energy. Manual progression notes. "Copy for Saturday" copies formatted summary to clipboard. Saves to `weekly_checkins` (upsert by `week_ending`, max 52).
3. ⬜ **Cardio history** — in History tab, below lift history. Show date, type, duration, intensity, run_ratio from daily logs. `cardio.type` is `"run/walk"` or `"other"` (set via UI).
4. ✅ **Body comp monthly log** — in Weight tab (`bodyCompBlock()` + `saveBodyComp()`). Input form: date, body_fat_%, visceral_fat_level, muscle_kg, notes (upsert by date). Charts: body fat % + visceral + muscle trends via `lineChart()`. Stored in `body_comp_scans`.

## Lift draft + dashboard (post-Tier-2 UX)
- **Lift draft persistence** — lift inputs auto-save to `lift_draft` on every keystroke (`saveDraft()`), restored on boot/render, cleared on SAVE. Navigating away from the Lift tab no longer wipes in-progress entries.
- **Per-set weight** — see Workout entry schema above (`± per-set kg` override).
- **Progress dashboard** — `dashboardBlock()` in Check-in tab: weight / sessions-per-week / avg-energy trends.
- **Today notes** save on `oninput` (as-you-type), not `onchange`.

## Hevy-style features (post-dashboard)
Four feature clusters ported from the Hevy app, all client-side (no backend), single file:
1. **Rest + workout timers** — Lift tab: sticky rest timer (60/90/120s presets, pause/reset, vibrate +
   WebAudio beep at zero) and a live workout-duration clock. `startedAt` stamped on first set entry into
   `lift_draft`; `durationMin` written onto the saved workout and shown in History. Timers are JS-only
   (intervals no-op when their DOM els are absent, so they survive tab switches).
2. **RIR per set** — one RIR selector per exercise; stored on each logged set. Anemia guard: RIR 0 → note
   in the progression card. Shown in History as `· RIR n`.
3. **PR / 1RM / volume analytics** — `est1RM` (Epley), PR detection on save (badge + toast), per-exercise
   est-1RM chart in History (`#exChart` + `showExChart`), per-session tonnage in History, weekly volume
   bar chart in the dashboard. Reuses `lineChart`/`barChart`. No schema change (derived from `workouts`).
4. **Custom exercises + routines** — `SESSIONS` moved to the editable `routines` LS key (seeded once).
   Editor in the Backup tab. Routine `type` (upper/lower) drives the progression increment. `sess` falls
   back to the first routine if its routine was deleted.

## Rep range reference (for progression logic)
All exercises: 3 sets × 10-12 reps. When all 3 sets hit 12 reps → add weight.
Weight increments: upper body +2.5kg, lower body +5kg.