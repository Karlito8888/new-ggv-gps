# MyGGV GPS

**GPS navigation for Garden Grove Village, Philippines**

A Progressive Web App that guides residents and visitors through Garden Grove Village. Scan the QR code at the village entrance, get instant turn-by-turn navigation — no install, no signup.

## How It Works

1. **Scan** the QR code at the village gate
2. **Allow** GPS location access
3. **Select** your destination (block and lot)
4. **Navigate** with real-time directions on an interactive map
5. **Arrive** with visual and haptic confirmation

The app runs entirely in the browser. Works on Android Chrome and iOS Safari.

## Features

- **Real-time GPS navigation** with route calculation and turn-by-turn steps
- **Routing fallback chain** — two public OSRM hosts, then a direct line. No API key needed
- **Automatic route recalculation** when you deviate from the planned route
- **Course-up map** — the map follows your GPS heading, no compass permission required
- **Arrival detection** — notification when you're within 15 m of your destination
- **Offline-capable** — a service worker caches the map tiles, the app assets and the UI font; map labels are rendered on-device, so no font is fetched from the network at all
- **No third-party runtime dependency** — the only hosts the app talks to are its Convex backend and the two public OSRM routers
- **Bilingual UI** — English with Tagalog translations, turn-by-turn instructions included
- **WCAG 2.2 AA contrast** — every text surface verified in both light and dark mode

## Quick Start

**Prerequisites:** [Bun](https://bun.sh) (>= 1.0), Node.js (>= 20)

```bash
git clone https://github.com/Karlito8888/new-ggv-gps.git
cd new-ggv-gps
bun install
bun run dev
```

Open `http://localhost:5173` on your phone (LAN accessible).

## Environment Variables

Create a `.env` file:

```bash
VITE_CONVEX_URL=...   # Convex deployment serving block and lot data
```

That is the only variable. Routing uses public OSRM hosts and needs no key.

## Tech Stack

- **React 19** with TypeScript
- **MapLibre GL JS 5** — native API, no wrappers
- **Vite 8** — build tool with code splitting
- **CSS keyframes** — overlay animations, no animation library
- **Convex** — block and lot data, read from the shared MyGGV backend
- **Workbox** — service worker for offline PWA

## Garden Grove Village

- **Location:** Dasmariñas, Cavite, Philippines
- **Coordinates:** 14.348°N, 120.951°E
- **Type:** Gated residential subdivision
- **Blocks:** numbered residential blocks with numbered lots, listed live from the backend

## Deployment

Pushing to `main` builds the app and uploads `dist/` to Hostinger over FTP
(`.github/workflows/deploy.yml`).

```bash
bun run build    # → dist/
```

Live at: https://myggvgps.charlesbourgault.com/

## License

MIT

---

Built for the Garden Grove Village community.
