# AFIF/LOG

Personal fitness tracker PWA. Installs on your phone like a native app, works fully offline, stores everything on-device.

**Live app:** https://afif-ai.github.io/afif-log/

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire app — one file, no build step |
| `manifest.json` | App metadata (name, icons, display mode) |
| `sw.js` | Service worker — offline caching |

All three must sit in the same folder.

---

## Install on your phone

**Android (Chrome):** open the URL → menu (⋮) → **Add to Home screen** → Install. Runs fullscreen, works offline.

**iPhone (Safari):** open the URL → Share → **Add to Home Screen**. Works offline; data persists locally.

---

## Deploy (GitHub Pages)

```bash
git add index.html && git commit -m "msg" && git push origin main
```

GitHub Pages auto-deploys in ~1 minute. First-time setup:

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**, Branch: `main`, Folder: `/ (root)` → Save

---

## Features

Four bottom tabs (**Home · Workout · History · Profile**), with secondary screens (Weight, Check-in, Photos, Backup) living under Profile. Every screen has **back / forward** navigation buttons in the header (browser-style history).

### Home tab
Log your daily metrics:
- **Water** — cups tracker (0–8, target 8)
- **Steps** — 8–10k step goal checkbox
- **Energy** — 0–5 scale (–, Low, Fair, Good, Strong, Peak)
- **Cardio** — type (Run/Walk or Other), duration, intensity (easy/moderate/hard), run:walk ratio
- **Session notes** — free text

### Workout tab
Log strength sessions across rotating routines (default 4):

| Routine | Exercises |
|---------|-----------|
| **Upper A** | Chest press, Lat pulldown, Seated row, Shoulder press, Bicep curl, Triceps pushdown |
| **Lower A** | Leg press, Romanian deadlift, Leg curl, Leg extension, Calf raise, Plank |
| **Upper B** | Incline press, Assisted pull-up, Cable row, Lateral raise, Face pull, Hammer curl |
| **Lower B** | Goblet/Hack squat, Hip thrust, Walking lunge, Leg curl, Seated calf raise, Hanging knee raise |

Each exercise has one shared weight box plus 3 individual set reps. Tap **± per-set kg** to override weight on individual sets. Set **RIR** (reps in reserve) per exercise — logging RIR 0 surfaces an anemia "leave 1–2 in reserve" reminder.

- **Rest timer** — 60/90/120s presets with pause, reset, vibrate + beep on finish
- **Workout duration** — live timer, saved with each session
- **Progression targets** — double progression (3×10–12 reps → add weight when all 3 sets hit 12); +2.5 kg upper, +5 kg lower
- **Personal records** — new best weight / estimated 1RM badged on save

**Custom routines:** add, rename, delete, and reorder routines and exercises (Backup tab → Routines, or "Edit routines" on the Workout tab). Each routine is tagged upper/lower to drive its progression increment.

In-progress entries auto-save to a draft on every keystroke, so navigating away won't wipe them. The draft clears on save.

### History tab
All saved lift sessions, newest first — exercise, weight, per-set reps, RIR, duration, and session volume. Includes a **per-exercise progress chart** (estimated 1RM over time).

### Profile tab
A dashboard hub:
- Weight + goal progress, total workouts, sessions this week
- **Progress dashboard** — weight, sessions-per-week, weekly volume, and average-energy trend charts
- Quick cards to **Weight**, **Check-in**, **Photos**
- Recent workouts list
- Settings gear → **Backup**

#### Weight (under Profile)
Log bodyweight, view progress bar toward goal (89 → 68–70 kg), and a trend chart. Also **body-composition logging** — date, body fat %, visceral fat level, muscle kg, and notes (one entry per date), with trend charts.

#### Check-in (under Profile)
Weekly Saturday check-in. Auto-fills latest weight, sessions this week, and average energy. Add progression notes, then copy a formatted summary to clipboard. Saves to history (upsert by week, max 52 entries).

#### Photos (under Profile)
Progress photos — compressed and stored on-device. Export before clearing browser storage.

#### Backup (under Profile)
- **Export** — saves all data as a JSON file
- **Import** — restores from a previously exported JSON
- **Routines** — edit your custom workout routines

---

## Data

Everything lives in your browser's localStorage. No account, no server, fully private.

Back up regularly via the Backup tab — especially before switching phones or clearing your browser.

### Storage keys

| Key | Type | Content |
|-----|------|---------|
| `daily:YYYY-MM-DD` | Object | water, steps, energy, notes, cardio |
| `weights` | Array | `{date, kg}[]` |
| `workouts` | Array | `{date, session, entries[], durationMin?}[]` |
| `photos` | Array | `{date, dataURL}[]` |
| `weekly_checkins` | Array | `{week_ending, weight_kg, sessions_completed, energy_avg, notes}[]` (max 52) |
| `body_comp_scans` | Array | `{date, body_fat_pct, visceral_fat_level, muscle_kg, notes}[]` (upsert by date) |
| `lift_draft` | Object | `{sess, log, startedAt?}` — in-progress lift inputs + start time, auto-saved per keystroke, cleared on save |
| `routines` | Object | `{name: {type, exercises[[name,cue]]}}` — editable workout templates, seeded from defaults on first run |

### Workout entry schema

```js
// Current format — each set carries its own weight + RIR (reps in reserve)
{ ex: "Chest press", weight: 50, sets: [{ weight: 50, reps: 12, rir: 2 }, { weight: 50, reps: 12, rir: 2 }, { weight: 52.5, reps: 10, rir: 2 }] }

// Old formats (auto-migrated on first load, idempotent; rir/durationMin optional)
{ ex: "Chest press", weight: "50", reps: "3x12" }       // pre-sets[]
{ ex: "Chest press", weight: 50, sets: [{ reps: 12 }] } // pre-per-set weight
```

### Weekly check-in schema

```js
{ week_ending: "YYYY-MM-DD", weight_kg: 85.2, sessions_completed: 3, energy_avg: "3.2", notes: "..." }
```

---

## Tech

- Vanilla JS — no framework, no npm, no build step
- Single HTML file
- PWA (installable, offline-capable via service worker)
- Dark theme, mobile-first
- localStorage only — zero server dependency
