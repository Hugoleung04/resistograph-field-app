# Resistograph Field Record

A mobile-first, offline field app for tree resistograph inspection records.

## What it records

Each **tree inspection**
- Tree ID / tag, species, site, inspector, date, notes
- Optional GPS
- At least 1 tree photo

Each **drilling**
- Height above ground (typed; m / cm / mm)
- Direction from the built-in compass (or typed 0–360°)
- 2 photos (drill position + resistograph printout / screen)
- Optional notes (sound wood, decay, depth)

Direction is stored as a magnetic heading. The app also shows it as **entry face → needle toward**, e.g. `N → S`.

## How to use the compass

1. Open a drilling record on the phone.
2. Tap **Enable compass** (required on iPhone).
3. Hold the phone flat, like a handheld compass, away from the steel resistograph body.
4. Stand at the drill point and point the top of the phone in the **same direction the needle travels into the tree**.
5. Tap **Capture compass direction**.

If the compass is blocked or inaccurate, type the bearing instead.

## How to run on a phone

Camera and compass only work in a **secure context** (HTTPS or `localhost`).

### Option A — open from a simple local server (same Wi‑Fi)

On a computer in this folder:

```bash
python3 serve.py
```

Then on the phone, open the printed URL (example: `http://192.168.x.x:8080`).

### Option B — put the folder on any static host

Upload the whole `resistograph-field-app` folder to GitHub Pages, Netlify, Cloudflare Pages, or any HTTPS static host. Open the site on the phone and use **Add to Home Screen**.

### iPhone notes

- Safari: Enable compass when prompted.
- Add to Home Screen for full-screen use.
- Photos stay on the device (IndexedDB). They are not uploaded anywhere.

### Android notes

- Chrome: Add to Home Screen.
- Allow camera / location if you use GPS.

## Export

- **Export report** — single HTML file with photos embedded (open and print to PDF).
- **Backup JSON** — full data + photos as data URLs.

Records stay on the phone until you delete them.

## Files

- `index.html` — app shell
- `styles.css` — field UI
- `app.js` — storage, compass, photos, export
- `sw.js` — offline cache
- `manifest.json` — installable PWA
