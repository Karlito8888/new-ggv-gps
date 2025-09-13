# AGENTS.md

## Commands

### Development
- `npm run dev` - Start development server (port 5173)
- `npm run preview` - Preview production build
- `npm run serve` - Serve on port 3000

### Build & Deploy
- `npm run build` - Build for production
- `npm run build:netlify` - Build with linting and Netlify checks

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Requirements
- Node.js 18+ and npm 9+
- Always run `npm run lint` before committing

## Project Overview

**MyGGV GPS** is a React PWA for GPS navigation in Garden Grove Village, Philippines. Mobile-first design with offline capabilities and turn-by-turn navigation.

## Architecture

### Core Technologies
- **React 19** with Vite build system
- **MapLibre GL** for map rendering
- **TanStack Query** for server state management
- **Supabase** for location data storage
- **Radix UI** components with Tailwind CSS
- **PWA** with offline caching via Workbox

### Navigation States
1. `permission` - GPS permission request
2. `welcome` - Destination selection
3. `navigating` - Active navigation with route display
4. `arrived` - Arrival confirmation

### Key Libraries
- `src/lib/navigation.js` - Multi-service routing with fallbacks
- `src/hooks/useLocations.js` - Supabase/TanStack Query integration
- `src/utils/geoUtils.js` - Distance/bearing calculations
- `src/utils/mapTransitions.js` - Map animation optimizations

## Code Style
- **Components**: `.jsx` files, PascalCase naming
- **Utilities**: `.js` files, camelCase naming
- **Imports**: ES6 modules, React hooks first
- **Error Handling**: Console logging only (no user-facing errors)
- **Modern React**: Functional components, hooks, no class components

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_OPENROUTE_API_KEY` - OpenRouteService API key (optional)

## Deployment
Optimized for Netlify with security headers, caching strategies, and PWA features.