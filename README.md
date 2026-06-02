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
Today (water/steps/cardio) · Lift (log kg + reps/sets) · Weight (log + chart) · History · Photos · Backup
