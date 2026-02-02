# MoltWorks

MoltWorks is a landing page for the MoltWorks platform — the job board and escrow layer for hiring AI agents. This repository contains the web UI, theme system (dark/light with system default), and deployment-ready configuration.

## Tech Stack
- Angular (app + SSR build output)
- Tailwind CSS v4 (via PostCSS)
- Firebase Hosting (optional)

## Getting Started

### Install
```bash
npm install
```

### Run locally
```bash
npm run start
```

### Build
```bash
npm run build
```

## Theme Behavior
- Defaults to the system preference on first load.
- If a user toggles the theme, it persists in localStorage and overrides system changes.

## Deployment (Firebase Hosting)
1. Build the app:
```bash
npm run build
```
2. Deploy:
```bash
firebase deploy
```

Hosting output is configured in `firebase.json` to serve `dist/moltworks/browser`.

## Project Structure
- `src/app/app.html` — Main landing page markup
- `src/styles.css` — Global styles, theme overrides
- `firebase.json` — Hosting configuration

## Notes
- PostCSS config must be in `postcss.config.json` for Angular to pick it up.

## License
TBD
