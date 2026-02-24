# Project Overview — MyGGV GPS

> Generated: 2026-02-24 | Scan: exhaustive | Mode: full_rescan

---

## Project Summary

**MyGGV GPS** (new-ggv-gps) is an open-source, mobile-first GPS navigation web application for Garden Grove Village (GGV), a residential subdivision in Cavite, Philippines.

The app guides residents and visitors from their current GPS location to a specific block and lot within the village using turn-by-turn navigation powered by OpenStreetMap routing.

---

## Key Facts

| Attribute | Value |
|---|---|
| **Name** | MyGGV GPS |
| **Version** | 2.2.3 |
| **Type** | Progressive Web App (PWA) |
| **Target audience** | Filipino residents of Garden Grove Village |
| **Primary languages** | English (UI) + Tagalog (translations) |
| **Platform** | Mobile browser (Chrome Android + Safari iOS) |
| **Deployment** | Netlify (CDN, SPA) |
| **License** | Open source |

---

## Purpose

Garden Grove Village is a private residential subdivision with numbered blocks and lots. Without an address-based navigation system recognizable by Google Maps, residents and visitors struggle to locate specific lots. MyGGV GPS solves this by:

1. Showing the user's real-time GPS position on a village map
2. Letting users select a destination block + lot from Supabase
3. Calculating a walking/driving route via OSRM (OpenStreetMap routing)
4. Providing turn-by-turn instructions with compass-based map rotation
5. Detecting arrival and offering exit village navigation

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| UI | React 19 (JSX, hooks, concurrent features) |
| Map | MapLibre GL JS 5.15 (native, no wrapper) |
| Routing | OSRM → ORS → Direct line (cascade) |
| Animation | Framer Motion 12 (LazyMotion, AnimatePresence) |
| Backend | Supabase (blocks/lots via PostGIS RPC) |
| Build | Vite 7 + Bun |
| Deploy | Netlify (CDN + SPA redirects) |

---

## Architecture Classification

| Attribute | Value |
|---|---|
| **Repository type** | Monolith |
| **Architecture pattern** | State Machine SPA + Hook Composition |
| **File count** | 7 core source files (~2,800 LOC) |
| **Custom hooks** | 3 (`useMapSetup`, `useRouting`, `useNavigation`) |
| **UI overlays** | 6 (all inline in `App.jsx`) |
| **Navigation states** | 6 (`gps-permission` → ... → `exit-complete`) |
| **External APIs** | 3 (OSRM, ORS, Supabase) |
| **Map tile source** | OpenFreeMap (liberty style) |

---

## Repository Structure

```
new-ggv-gps/
├── src/
│   ├── App.jsx          # Main component (state machine + all overlays)
│   ├── main.jsx         # Entry point
│   ├── hooks/           # 3 custom hooks
│   ├── lib/             # geo utilities + Supabase client
│   ├── data/            # Static village block polygons
│   └── styles/          # CSS (mobile-first)
├── public/              # PWA assets (icons, SW, manifest)
├── docs/                # AI-readable documentation
├── index.html           # HTML shell + CSP + PWA meta
├── vite.config.js       # Build configuration
├── netlify.toml         # Deployment configuration
└── CLAUDE.md            # Authoritative architecture reference
```

---

## Getting Started

```bash
# Install
bun install
cp .env.example .env  # Add Supabase credentials

# Develop
bun run dev           # http://localhost:5173

# Deploy
bun run build:netlify # ESLint + Vite build → dist/
```

**Required env vars:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

See [Development Guide](./development-guide.md) for full setup instructions.

---

## Links

| Resource | Path |
|---|---|
| Architecture | [docs/architecture.md](./architecture.md) |
| Tech Stack | [docs/technology-stack.md](./technology-stack.md) |
| Code Analysis | [docs/code-analysis.md](./code-analysis.md) |
| Source Tree | [docs/source-tree-analysis.md](./source-tree-analysis.md) |
| Dev Guide | [docs/development-guide.md](./development-guide.md) |
| Deploy Guide | [docs/deployment-guide.md](./deployment-guide.md) |
| AI Dev Guide | [CLAUDE.md](../CLAUDE.md) |
