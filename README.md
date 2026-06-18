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

### Today tab
Log your daily metrics:
- **Water** — cups tracker (0–8, target 8)
- **Steps** — 8–10k step goal checkbox
- **Energy** — 0–5 scale (–, Low, Fair, Good, Strong, Peak)
- **Cardio** — type (Run/Walk or Other), duration, intensity (easy/moderate/hard), run:walk ratio
- **Session notes** — free text

### Lift tab
Log strength sessions across 4 rotating sessions:

| Session | Exercises |
|---------|-----------|
| **Upper A** | Chest press, Lat pulldown, Seated row, Shoulder press, Bicep curl, Triceps pushdown |
| **Lower A** | Leg press, Romanian deadlift, Leg curl, Leg extension, Calf raise, Plank |
| **Upper B** | Incline press, Assisted pull-up, Cable row, Lateral raise, Face pull, Hammer curl |
| **Lower B** | Goblet/Hack squat, Hip thrust, Walking lunge, Leg curl, Seated calf raise, Hanging knee raise |

Each exercise: weight + 3 individual set reps. After saving, shows **next-session progression targets** using double progression (3×10–12 reps → add weight when all 3 sets hit 12).

- Upper body: +2.5 kg increments
- Lower body: +5 kg increments

### Weight tab
Log bodyweight, view progress bar toward goal (89 → 68–70 kg), trend chart.

### History tab
All saved lift sessions, newest first. Displays exercise, weight, and per-set reps.

### Check-in tab
Weekly Saturday check-in. Auto-fills:
- Latest logged weight
- Sessions completed this week
- Average energy this week

Add progression notes, then copy a formatted summary to clipboard for sharing.

### Photos tab
Progress photos — compressed and stored on-device. Export before clearing browser storage.

### Backup tab
- **Export** — saves all data as a JSON file
- **Import** — restores from a previously exported JSON

---

## Data

Everything lives in your browser's localStorage. No account, no server, fully private.

Back up regularly via the Backup tab — especially before switching phones or clearing your browser.

### Storage keys

| Key | Type | Content |
|-----|------|---------|
| `daily:YYYY-MM-DD` | Object | water, steps, energy, notes, cardio |
| `weights` | Array | `{date, kg}[]` |
| `workouts` | Array | `{date, session, entries[]}[]` |
| `photos` | Array | `{date, dataURL}[]` |
| `weekly_checkins` | Array | `{week_ending, weight_kg, sessions_completed, energy_avg, notes}[]` (max 52) |

### Workout entry schema

```js
// Current format
{ ex: "Chest press", weight: 50, sets: [{ reps: 12 }, { reps: 11 }, { reps: 10 }] }

// Old format (auto-migrated on first load)
{ ex: "Chest press", weight: "50", reps: "3x12" }
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
