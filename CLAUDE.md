# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

- **Development**: `npm run dev` - Start Vite development server
- **Build**: `npm run build` - Build for production
- **Lint**: `npm run lint` - Run ESLint
- **Preview**: `npm run preview` - Preview production build

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

#### Environment Configuration
- Supabase connection via environment variables (`VITE_SUPABASE_*`)
- Google API and OpenRoute service keys configured
- PWA manifest configured for "MyGGV|GPS" branding

### File Structure Notes
- Map logic centralized in `App.jsx`
- Data files separated in `src/data/`
- Supabase client in `src/lib/supabase.js`
- Path alias `@` points to `src/` directory