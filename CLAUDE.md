# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

- **Development**: `npm run dev` - Start Vite development server
- **Build**: `npm run build` - Build for production
- **Build (Netlify)**: `npm run build:netlify` - Build with linting and Netlify checks
- **Lint**: `npm run lint` - Run ESLint
- **Lint Fix**: `npm run lint:fix` - Run ESLint with auto-fix
- **Preview**: `npm run preview` - Preview production build
- **Serve**: `npm run serve` - Serve on port 3000

## Architecture Overview

This is a React + Vite GPS application for Garden Grove Village (MyGGV|GPS) built as a Progressive Web App (PWA).

### Key Technologies
- **Frontend**: React 19 with MapLibre GL for mapping
- **Build Tool**: Vite with React plugin
- **Styling**: Tailwind CSS v4
- **Maps**: MapLibre GL + OpenLayers for polygon calculations
- **Backend**: Supabase for data storage
- **PWA**: Vite PWA plugin with service worker

### Core Architecture

#### Map System
- Uses MapLibre GL for primary map rendering with OpenStreetMap tiles
- OpenLayers integration specifically for polygon center calculations (`getPolygonCenter`)
- Custom overlay system combining vector polygons (blocks) with marker-based POIs
- Device orientation integration for compass-based map bearing

#### Data Structure
- **Blocks** (`src/data/blocks.js`): Polygon coordinates for village blocks with colors and names
- **POIs** (`src/data/public-pois.js`): Point-of-interest markers (pools, courts, etc.)
- Green blocks (`#19744B`) are hidden from label display but show polygons

#### State Management
- Uses React 19 built-in state management
- Key states: `userLocation`, `bearing`, `isMapReady`, `error`
- Memoized map style and GeoJSON data for performance

#### Navigation System
- Navigation logic in `src/lib/navigation.js` with multiple routing fallbacks
- Uses OSRM (OpenStreetMap routing) as primary, OpenRoute Service as fallback
- Supports walking profile with turn-by-turn directions
- Arrival detection with 10m threshold (`ARRIVAL_THRESHOLD`)

#### Environment Configuration
- Supabase connection via environment variables (`VITE_SUPABASE_*`)
- Google API and OpenRoute service keys configured
- PWA manifest configured for "MyGGV|GPS" branding
- All environment variables listed in `netlify.toml`

#### Deployment
- Configured for Netlify deployment with optimized build process
- PWA service worker with strategic caching for offline functionality
- Custom headers for security and performance in `netlify.toml`
- Chunk splitting: vendor (React), maps (MapLibre/OpenLayers), Supabase

### File Structure Notes
- Map logic centralized in `App.jsx` with React 19 compiler optimization
- Navigation logic in `src/lib/navigation.js` with routing service integration
- Data files separated in `src/data/` (blocks.js, public-pois.js)
- Supabase client in `src/lib/supabase.js`
- Path alias `@` points to `src/` directory
- Component modals handle different navigation states (permission, welcome, arrival)