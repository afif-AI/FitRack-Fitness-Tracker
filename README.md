# AFIF/LOG — PWA

Offline fitness tracker. Installs on your phone like a real app.

## Files
- `index.html` — the whole app
- `manifest.json` — app metadata + icons (embedded)
- `sw.js` — service worker (offline cache)

All three must sit in the **same folder**.

## Deploy on GitHub Pages (free, 5 min)

1. Create a new GitHub repo, e.g. `afif-log`.
2. Upload `index.html`, `manifest.json`, `sw.js` to the repo root.
3. Repo → **Settings** → **Pages**.
4. Source: **Deploy from a branch**, Branch: `main`, Folder: `/ (root)`. Save.
5. Wait ~1 min. Your app is live at:
   `https://<your-username>.github.io/afif-log/`

## Install on phone

**Android (Chrome):** open the URL → menu (⋮) → **Add to Home screen** → Install. Runs fullscreen, works offline.

**iPhone (Safari):** open the URL → Share → **Add to Home Screen**. Works offline; data persists. (iOS doesn't support background service worker push, but the tracker doesn't need it.)

## Data

- Everything saves to your phone's browser storage (localStorage). No account, no server, fully private.
- **Back up regularly:** Backup tab → Export all data → saves a JSON file.
- New phone / cleared browser: Backup tab → Import data → pick that JSON.
- Photos are stored compressed but still use the most space — export after adding them.

## Tabs

| Tab | What it does |
|-----|-------------|
| **Today** | Water intake, 8-10k steps, energy level (0–5), cardio (type / duration / intensity / run:walk ratio), session notes |
| **Lift** | Log weight + 3 individual set reps per exercise across 4 sessions (Upper A/B, Lower A/B). After saving, shows next-session progression targets (double progression: 3×10–12, +2.5 kg upper / +5 kg lower when all sets hit 12) |
| **Weight** | Log bodyweight, progress bar toward goal, trend chart |
| **History** | All saved lift sessions, newest first |
| **Check-in** | Weekly Saturday check-in — auto-fills latest weight, sessions this week, avg energy. Add progression notes and copy a formatted summary to clipboard |
| **Photos** | Progress photos (compressed, stored on device) |
| **Backup** | Export / import all data as JSON |

## Workout schema

```js
// Each saved entry (new format)
{ ex: "Chest press", weight: 50, sets: [{ reps: 12 }, { reps: 11 }, { reps: 10 }] }

// Weekly check-in
{ week_ending: "YYYY-MM-DD", weight_kg: 85.2, sessions_completed: 3, energy_avg: "3.2", notes: "..." }
```

Old entries saved as `{ reps: "3x12" }` are automatically migrated to the new format on first load.
