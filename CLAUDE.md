<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyGGV GPS is a React-based web application for GPS navigation within Garden Grove Village, Philippines. It uses MapLibre GL for mapping with optimized native APIs instead of traditional geographic calculations.

## Commands

```bash
npm run dev          # Start development server (port 5173)
npm run build        # Production build with Terser minification
npm run build:netlify # Build with lint + Netlify checks
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run preview      # Preview production build
```

## Architecture

### Navigation State Machine

The app follows a sequential permission workflow managed by `useNavigationState`:

1. **gps-permission** → Request GPS access
2. **welcome** → Destination selection
3. **orientation-permission** → Request device orientation
4. **navigating** → Active turn-by-turn navigation
5. **arrived** → Arrival confirmation
6. **exit-complete** → Exit village flow complete

### Key Architectural Patterns

**MapLibre Native Optimizations**: The codebase prioritizes MapLibre native methods over Turf.js/Haversine calculations for performance:

- `map.project()` for coordinate-to-pixel conversions
- `map.queryRenderedFeatures()` for spatial queries
- Feature State API for dynamic styling without re-rendering
- `flyTo()`/`jumpTo()` for camera transitions

**Route Management** (`src/lib/navigation.js`):

- Cascading fallback: OSRM → MapLibre Directions → OpenRouteService → Direct line
- Automatic route recalculation on deviation (25m threshold)
- Traveled/remaining route tracking with MapLibre sources

**Hook-Based Architecture**:

- `useNavigationState` - State machine and transitions
- `useRouteManager` - Route creation, updates, deviation detection
- `useMapTransitions` - Camera animations and orientation
- `useMapConfig` - Map style and initial view configuration

### Data Flow

```
App.jsx
├── GeolocateControl (MapLibre native) → userLocation state
├── useNavigationState → navigation flow control
├── useRouteManager → route GeoJSON management
└── Components receive state via props
```

### Map Sources and Layers

The navigation system uses three MapLibre sources with Feature State API:

- `route-main` - Full route with segment IDs
- `route-traveled` - Grayed traveled portion
- `route-remaining` - Active remaining route

## Environment Variables

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_OPENROUTE_API_KEY=...  # Optional fallback routing
```

## Code Conventions

- Modern React (hooks only, no classes)
- ESLint with React Hooks plugin enforced
- Prefer MapLibre native methods over Turf.js where applicable
- GeoJSON coordinates are `[longitude, latitude]` (GeoJSON standard)
- User location objects use `{latitude, longitude}` (GPS standard)

## Development Philosophy

**KISS (Keep It Simple, Stupid)**: Avoid over-engineering at all costs.

- Prefer direct solutions over abstractions
- No unnecessary hooks, contexts, or state machines
- If a simple `navigate()` call works, don't add callbacks/events
- Fewer files > more files with "clean architecture"
- Inline logic is fine if it's only used once
- Don't create utils/helpers for one-time operations

## Browser Compatibility

**Target browsers: Google Chrome (Android) and Safari (iOS)**

Critical compatibility patterns already implemented:

- Device Orientation: `deviceorientationabsolute` (Chrome) + `webkitCompassHeading` (Safari)
- iOS permission: `DeviceOrientationEvent.requestPermission()` required
- CSS viewport: `100dvh` with `100svh` and `-webkit-fill-available` fallbacks
- Input zoom prevention: `font-size: 16px` on inputs (iOS Safari)

## Village Data

- Default center: `[120.95134859887523, 14.347872973134175]`
- Village exit: `[120.951863, 14.35098]`
- Block polygons in `src/data/blocks.js`
- POIs in `src/data/public-pois.js`
