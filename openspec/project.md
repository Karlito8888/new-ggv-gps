# Project Context

## Purpose

MyGGV GPS is a web application providing turn-by-turn GPS navigation within Garden Grove Village, Philippines. The app guides residents and visitors to specific blocks, houses, and points of interest within the village using optimized MapLibre native APIs for maximum mobile performance.

**Key Goals:**

- Provide reliable GPS navigation within the village
- Support both Android (Chrome) and iOS (Safari) platforms
- Minimize battery drain through native MapLibre optimizations
- Deliver a smooth, responsive web experience

## Tech Stack

### Core Framework

- **React 19.1** - UI framework (hooks-only, no class components)
- **Vite 6.3** - Build tool with Terser minification
- **Bun 1.3+** - Package manager (replaces npm)

### Mapping & Navigation

- **MapLibre GL 5.6** - Primary mapping library (100% native, no wrappers)
- Direct MapLibre GL JS - No react-map-gl wrapper

### Backend & Data

- **Supabase** - Backend-as-a-service (database, auth)

### UI Components

- **Radix UI** - Accessible primitives (Dialog, Select, Themes)
- **Framer Motion** - Animation library

### Development

- **ESLint 9** - Linting with React Hooks plugin
- **Node.js 18+** - Runtime requirement

## Project Conventions

### Code Style

- **Hooks-only React** - No class components
- **ES Modules** - `"type": "module"` in package.json
- **Path aliases** - Use `@/` for `src/` imports
- **GeoJSON coordinates** - Always `[longitude, latitude]` order
- **User location objects** - Use `{latitude, longitude}` (GPS standard)
- **No emojis in code** - Unless explicitly requested
- **Minimal comments** - Code should be self-documenting

### Architecture Patterns

**Navigation State Machine** (simple `useState` in App.jsx):

```
gps-permission → welcome → orientation-permission → navigating → arrived → exit-complete
```

**Hook-Based Architecture** (3 hooks total):

- `useMapSetup` - Map initialization, GPS tracking, GeolocateControl
- `useRouting` - OSRM routing with cascading fallback, deviation detection
- `useNavigation` - Turn-by-turn instructions, arrival detection

**MapLibre Native Optimizations** (prefer over Turf.js):

- `map.project()` for coordinate-to-pixel conversions
- `map.queryRenderedFeatures()` for spatial queries
- Feature State API for dynamic styling
- `flyTo()`/`jumpTo()` for camera transitions

**Route Management** (`src/lib/navigation.js`):

- Cascading fallback: OSRM → MapLibre Directions → OpenRouteService → Direct line
- 25m deviation threshold triggers recalculation
- Three map sources: `route-main`, `route-traveled`, `route-remaining`

### Testing Strategy

- Manual testing on target devices (Android Chrome, iOS Safari)
- ESLint for static analysis
- Build verification via `bun run build:netlify`

### Git Workflow

- Main branch: `main`
- Semantic versioning
- Emoji-prefixed commits (e.g., `🚀 v1.2.0: Web-Only Version`)
- Netlify auto-deploys from main branch

## Domain Context

### Geographic Data

- **Village center**: `[120.95134859887523, 14.347872973134175]`
- **Village exit point**: `[120.951863, 14.35098]`
- **Block polygons**: Defined in `src/data/blocks.js`
- **Points of Interest**: Defined in `src/data/public-pois.js`

### Navigation Flow

1. User grants GPS permission
2. User selects destination (block/house/POI)
3. User grants device orientation permission (for compass)
4. Active turn-by-turn navigation begins
5. Arrival detection triggers completion screen
6. Optional: Exit village flow for directions out

## Important Constraints

### Browser Compatibility (Critical)

**Target: Google Chrome (Android) and Safari (iOS) only**

- **Device Orientation**: `deviceorientationabsolute` (Chrome) + `webkitCompassHeading` (Safari)
- **iOS Permission**: `DeviceOrientationEvent.requestPermission()` required
- **CSS Viewport**: `100dvh` with `100svh` and `-webkit-fill-available` fallbacks
- **Input Zoom Prevention**: `font-size: 16px` minimum on inputs (iOS Safari)

### Performance Constraints

- Optimize for mobile devices with limited resources
- Minimize battery drain during active navigation
- Console logs stripped in production builds
- Code splitting: vendor, maps, supabase chunks

### Network Requirements

- **Internet connection required** - No offline support
- Map tiles loaded on-demand from tile servers
- API calls require active network connectivity

## External Dependencies

### APIs & Services

- **Supabase** - Database and authentication
  - Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **OSRM** - Primary routing service (public)
- **OpenRouteService** - Fallback routing
  - Environment: `VITE_OPENROUTE_API_KEY` (optional)

### Map Tile Providers

- **OpenStreetMap** - Street map tiles
- **Esri ArcGIS** - Satellite imagery tiles

### Deployment

- **Netlify** - Hosting and CI/CD
- Auto-deploy on push to main
- Build command: `bun run build:netlify`
