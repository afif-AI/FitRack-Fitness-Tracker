# FitRack

FitRack is a personal fitness tracker PWA (formerly AFIF/LOG). Installs on your phone like a native app, works fully offline, stores everything on-device.

**Live app:** https://afif-ai.github.io/FitRack-Fitness-Tracker/

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire app — one file, no build step |
| `manifest.json` | App metadata (name, icons, display mode) |
| `sw.js` | Service worker — offline caching + update delivery |
| `icons/` | App icons (192, 512, 512-maskable PNG) |
| `fonts/archivo.woff2` | Self-hosted display font (no external requests) |

---

## Install on your phone

**Android (Chrome):** open the URL → menu (⋮) → **Add to Home screen** → Install. Runs fullscreen, works offline.

**iPhone (Safari):** open the URL → Share → **Add to Home Screen**. Works offline; data persists locally.

---

## Deploy (GitHub Pages)

```bash
# Bump CACHE_NAME in sw.js (fitrack-shell-vN → vN+1) whenever icons/font/manifest change.
# index.html itself is fetched network-first, so plain content updates arrive automatically.
git add -A && git commit -m "msg" && git push origin main
```

GitHub Pages auto-deploys in ~1 minute. First-time setup:

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**, Branch: `main`, Folder: `/ (root)` → Save

---

## Features

Five bottom tabs (**Home · Workout · Cardio · History · Profile**), with secondary screens (Weight, Check-in, Photos, Settings, Routines) reachable from Profile and Workout. Every screen has **back / forward** navigation buttons in the header (browser-style history).

### Home tab
Dashboard: greeting, sessions this week / streak / month / all-time stats, latest weight with weekly delta + sparkline, recent sessions, and a backup reminder when your last export is more than 30 days old.

### Workout tab
Log strength sessions across rotating routines (default 4):

| Routine | Exercises |
|---------|-----------|
| **Upper A** | Chest press, Lat pulldown, Seated row, Shoulder press, Bicep curl, Triceps pushdown |
| **Lower A** | Leg press, Romanian deadlift, Leg curl, Leg extension, Calf raise, Plank |
| **Upper B** | Incline press, Assisted pull-up, Cable row, Lateral raise, Face pull, Hammer curl |
| **Lower B** | Goblet/Hack squat, Hip thrust, Walking lunge, Leg curl, Seated calf raise, Hanging knee raise |

Each exercise gets per-set weight + reps rows with done-checkmarks and an **+ Add set** button. Entering your first set starts the session: the routine locks, a live duration clock appears, and a sticky **FINISH WORKOUT** bar shows up.

- **Rest timer** — 60/90/120 s presets with pause/reset; runs on wall-clock time, so it stays accurate if you lock your phone; vibrates + beeps on finish
- **Progress-photo gate** — a progress photo is required to save each session
- **Personal records** — new best weight / estimated 1RM badged on save
- **Custom routines** — add, rename, delete, reorder routines and exercises ("Routines" button in the header); upper/lower tag drives the progression increment (+2.5 kg / +5 kg)

In-progress entries auto-save to a draft on every keystroke, so navigating away (or closing the app) won't wipe them. The draft clears on save; drafts older than 12 hours prompt resume-or-discard.

### Cardio tab
Log runs/walks and other cardio: duration, intensity (easy / moderate / hard), and run:walk ratio. History list below the form.

### History tab
All saved lift sessions, newest first — exercise, weight, per-set reps, duration, and session volume. Includes a **per-exercise progress chart** (estimated 1RM over time).

### Profile tab
Hub with quick cards to **Weight**, **Check-in**, **Photos**, and **Settings**, recent workouts, and a **progress dashboard** (weight, sessions/week, weekly volume charts).

- **Weight** — log bodyweight, goal progress bar (89 → 68–70 kg), trend chart, plus body-composition logging (body fat %, visceral level, muscle kg) with trend charts
- **Check-in** — weekly Saturday summary (auto-filled weight + session count, progression notes, copy-to-clipboard)
- **Photos** — progress photos, stored in IndexedDB on-device
- **Settings** — export/import backup, reset, theme (Lime / Electric)

---

## Data

Everything lives in your browser: structured data in localStorage, photos in IndexedDB. No account, no server, fully private.

**Back up regularly** via Settings → Export — especially before switching phones or clearing your browser. Backups are JSON (`_v: 3`) and include photos; older (v1/v2) backups import cleanly.

### Storage keys (localStorage)

| Key | Type | Content |
|-----|------|---------|
| `weights` | Array | `{date, kg}[]` |
| `workouts` | Array | `{date, session, entries[], durationMin?}[]` |
| `cardio_sessions` | Array | `{date, type, duration_min, intensity, run_ratio}[]` |
| `weekly_checkins` | Array | `{week_ending, weight_kg, sessions_completed, notes}[]` (max 52) |
| `body_comp_scans` | Array | `{date, body_fat_pct, visceral_fat_level, muscle_kg, notes}[]` (upsert by date) |
| `lift_draft` | Object | `{sess, log, startedAt?}` — in-progress lift inputs, auto-saved per keystroke |
| `routines` | Object | `{name: {type, exercises[[name,cue]]}}` — editable workout templates |
| `theme`, `last_export`, `cardio_migrated` | — | preferences + one-shot flags |

Photos live in IndexedDB (db `fitrack`, store `photos`).

### Workout entry schema

```js
// Current format — each set carries its own weight
{ ex: "Chest press", weight: 50, sets: [{ weight: 50, reps: 12 }, { weight: 50, reps: 12 }, { weight: 52.5, reps: 10 }] }

// Old formats (auto-migrated on first load, idempotent)
{ ex: "Chest press", weight: "50", reps: "3x12" }       // pre-sets[]
{ ex: "Chest press", weight: 50, sets: [{ reps: 12 }] } // pre-per-set weight
```

---

## Tech

- Vanilla JS — no framework, no npm, no build step
- Single HTML file, self-hosted font, zero runtime network requests
- PWA (installable, offline-capable; network-first HTML so updates reach installed users)
- Dark theme (Lime / Electric), mobile-first
- localStorage + IndexedDB — zero server dependency
