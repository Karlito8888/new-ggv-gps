# MyGGV GPS

**GPS navigation for Garden Grove Village, Philippines**

A Progressive Web App that guides residents and visitors through Garden Grove Village. Scan the QR code at the village entrance, get instant turn-by-turn navigation — no install, no signup.

## How It Works

1. **Scan** the QR code at the village gate
2. **Allow** GPS location access
3. **Select** your destination (block, lot, or point of interest)
4. **Navigate** with real-time directions on an interactive map
5. **Arrive** with visual and haptic confirmation

The app runs entirely in the browser. Works on Android Chrome and iOS Safari.

## Features

- **Real-time GPS navigation** with route calculation and turn-by-turn steps
- **3-tier routing fallback** — OSRM (primary), OpenRouteService, direct line
- **Automatic route recalculation** when you deviate from the planned route
- **Compass-guided map rotation** — the map follows your device orientation
- **Arrival detection** — notification when you're within 15m of your destination
- **Offline-capable** — service worker caches map tiles, fonts, and app assets
- **Bilingual UI** — English with Tagalog translations

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
VITE_SUPABASE_URL=...           # Supabase project URL
VITE_SUPABASE_ANON_KEY=...      # Supabase anon key
VITE_OPENROUTE_API_KEY=...      # Optional — ORS routing fallback
```

## Tech Stack

- **React 19** with TypeScript
- **MapLibre GL JS 5** — native API, no wrappers
- **Vite 7** — build tool with code splitting
- **Framer Motion** — overlay animations
- **Supabase** — block/lot data backend
- **Workbox** — service worker for offline PWA

## Garden Grove Village

- **Location:** Dasmariñas, Cavite, Philippines
- **Coordinates:** 14.348°N, 120.951°E
- **Type:** Gated residential subdivision
- **Blocks:** 15+ residential blocks with numbered lots

## Deployment

Production builds are deployed to Hostinger via manual upload.

```bash
bun run build    # → dist/
```

Live at: https://myggvgps.charlesbourgault.com/

## License

MIT

---

Built for the Garden Grove Village community.
