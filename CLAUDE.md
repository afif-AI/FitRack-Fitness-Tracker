# AFIF/LOG PWA

## Project
Single-file PWA fitness tracker. One file: `index.html`. Vanilla JS, no build step, no npm, no framework.
Deployed via GitHub Pages: https://afif-ai.github.io/afif-log/

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
| `workouts` | Array | `{date, session, entries[]}[]` |
| `photos` | Array | `{date, dataURL}[]` |
| `weekly_checkins` | Array | `{week_ending, weight_kg, sessions_completed, energy_avg, notes}[]` max 52 |
| `body_comp_scans` | Array | `{date, body_fat_pct, visceral_fat_level, muscle_kg, notes}[]` ← **planned, not yet implemented** |

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
{ ex: "Chest press", weight: 50, sets: [{reps:12},{reps:12},{reps:12}] }
```
Old entries `{ ex, weight: "50", reps: "3x12" }` are auto-migrated at boot via `migrateWorkouts()`.

### Back-compat notes
- Old cardio was stored as a boolean (`cardio: true/false`). On load, converted to full object with `done` field.
- Old workout `reps` string format migrated to `sets[]` array by `migrateWorkouts()`. Idempotent.

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
```
Upper A: Chest press, Lat pulldown, Seated row, Shoulder press, Bicep curl, Triceps pushdown
Lower A: Leg press, Romanian deadlift, Leg curl, Leg extension, Calf raise, Plank
Upper B: Incline press, Assisted pull-up, Cable row, Lateral raise, Face pull, Hammer curl
Lower B: Goblet/Hack squat, Hip thrust, Walking lunge, Leg curl, Seated calf raise, Hanging knee raise
```

## Tabs (current)
`today | lift | weight | history | checkin | photos | settings(Backup)`

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
| `migrateWorkouts()` | One-shot boot migration: old `{reps:"3x12"}` → `{sets:[…]}`. Idempotent. |
| `computeNextTargets(entries, sessionType)` | Progression logic per exercise |
| `renderProgression(targets, sessionType)` | Populates `#prog-card` after save |
| `renderCheckinHistory()` | Partial re-render of `#checkinHistory` in Check-in tab |

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
4. ⬜ **Body comp monthly log** — in Weight tab. Input form: date, body_fat_%, visceral_fat_level, muscle_kg, notes. Charts: body fat % trend + visceral fat trend + muscle mass trend. Stored in `body_comp_scans` key.

## Rep range reference (for progression logic)
All exercises: 3 sets × 10-12 reps. When all 3 sets hit 12 reps → add weight.
Weight increments: upper body +2.5kg, lower body +5kg.