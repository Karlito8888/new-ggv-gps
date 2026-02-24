# MyGGV GPS — Documentation Index

> GPS Navigation Web App for Garden Grove Village, Philippines
> Generated: 2026-02-24 | Scan: exhaustive | Mode: full_rescan

---

## Project Overview

| Attribute | Value |
|---|---|
| **Type** | Monolith — Web SPA |
| **Primary Language** | JavaScript/JSX |
| **Framework** | React 19 + Vite 7 |
| **Architecture** | State Machine + Hook Composition |
| **Version** | 2.2.3 |
| **Deployment** | Netlify (CDN) |

---

## Quick Reference

**Tech Stack:** React 19 · MapLibre GL 5.15 · Vite 7 · Bun · Supabase · Framer Motion · Netlify

**Entry Point:** `src/main.jsx` → `src/App.jsx`

**Architecture Pattern:** 6-state navigation machine (navState) in `App.jsx`, composed with 3 custom hooks

**State Flow:** `gps-permission` → `welcome` → `orientation-permission` → `navigating` → `arrived` | `exit-complete`

**Key Files:**
- `src/App.jsx` — State machine + all 6 UI overlays (993 LOC)
- `src/hooks/useMapSetup.js` — MapLibre init + GPS (254 LOC)
- `src/hooks/useRouting.js` — OSRM/ORS/direct route (374 LOC)
- `src/hooks/useNavigation.js` — Arrival detection (34 LOC, pure)
- `src/lib/geo.js` — Haversine + route projection (174 LOC)
- `CLAUDE.md` — Authoritative architecture reference

---

## Generated Documentation

| Document | Description |
|---|---|
| [Project Overview](./project-overview.md) | Executive summary, tech stack, purpose |
| [Architecture](./architecture.md) | System design, data flow, decisions |
| [Technology Stack](./technology-stack.md) | All dependencies, external services, metrics |
| [Code Analysis](./code-analysis.md) | APIs, data models, state, components, algorithms |
| [Source Tree Analysis](./source-tree-analysis.md) | Annotated directory tree, integration points |
| [Component Inventory](./component-inventory.md) | All 6 UI overlays + design system |
| [Development Guide](./development-guide.md) | Setup, commands, conventions, pitfalls |
| [Deployment Guide](./deployment-guide.md) | Netlify config, build, env vars, caching |
| [API Contracts](./api-contracts.md) | OSRM, ORS, Supabase RPC, Browser APIs |

---

## Existing Documentation

| Document | Description |
|---|---|
| [CLAUDE.md](../CLAUDE.md) | AI developer guide — source of truth for architecture |
| [AGENTS.md](../AGENTS.md) | AI agent instructions |
| [README.md](../README.md) | Public project readme |
| [.env.example](../.env.example) | Environment variable template |
| [netlify.toml](../netlify.toml) | Netlify deployment configuration |

---

## Getting Started

### For Developers

```bash
# Install dependencies
bun install

# Set up environment (Supabase credentials required)
cp .env.example .env

# Start development server
bun run dev  # → http://localhost:5173
```

**Required reading:**
1. [CLAUDE.md](../CLAUDE.md) — Architecture, conventions, workflows
2. [Architecture](./architecture.md) — System design
3. [Development Guide](./development-guide.md) — Setup + commands

### For AI Assistants

Start with this index, then:
- **Understanding the codebase:** Read [Architecture](./architecture.md) + [Code Analysis](./code-analysis.md)
- **Making UI changes:** Read [Component Inventory](./component-inventory.md)
- **Modifying routing/GPS:** Read [Code Analysis §3 State Management](./code-analysis.md) + [API Contracts](./api-contracts.md)
- **Deployment changes:** Read [Deployment Guide](./deployment-guide.md)
- **Adding features:** Always check [CLAUDE.md](../CLAUDE.md) for conventions first

### Key Architecture Constraints
- **No react-map-gl** — direct MapLibre GL JS only
- **No Turf.js** — custom Haversine in `src/lib/geo.js`
- **No React Router** — conditional rendering on `navState`
- **No Context/Redux** — `useState` only
- **No separate overlay files** — all overlays inline in `App.jsx`
- **React Compiler active** — no manual `useMemo`/`useCallback`

---

## Navigation State Quick Reference

```
navState values:
  "gps-permission"         → GPSPermissionOverlay
  "welcome"                → WelcomeOverlay
  "orientation-permission" → OrientationPermissionOverlay
  "navigating"             → NavigationOverlay (top bar, map visible)
  "arrived"                → ArrivedOverlay
  "exit-complete"          → ExitCompleteOverlay
```

## Routing Fallback Chain

```
OSRM (primary, free)
  ↓ fails
ORS (fallback, needs VITE_OPENROUTE_API_KEY)
  ↓ fails or no key
Direct line (straight GeoJSON LineString)
  ↓ + schedule OSRM retry: 10s → 30s → 60s
```

## Arrival & Recalculation Thresholds

| Threshold | Value | Location |
|---|---|---|
| Arrival detection | < 12m | `useNavigation.js:26` |
| Route recalculation trigger | moved > 30m | `useRouting.js:206` |
| Route request debounce | 500ms | `useRouting.js:162` |
| OSRM request timeout | 3s | `useRouting.js:90` |
| Compass throttle | 250ms / 3° | `App.jsx:163-164` |
| Auto-recenter after interaction | 5s | `App.jsx:185` |
