# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production
- `npm run build:netlify` - Build with linting and Netlify checks
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run preview` - Preview production build
- `npm run serve` - Serve on port 3000

### Quality Assurance
Always run `npm run lint` before committing code changes. The project uses modern ESLint configuration with React hooks and refresh plugins.

## Architecture Overview

This is a React PWA (Progressive Web App) for GPS navigation in Garden Grove Village, Philippines. The application is designed for mobile-first usage with offline capabilities.

### Core Technologies
- **Framework**: React 19 with Vite
- **Maps**: MapLibre GL with react-map-gl integration
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI**: Radix UI components with Tailwind CSS
- **Database**: Supabase for location data
- **PWA**: Vite PWA plugin with Workbox for offline caching
- **Deployment**: Optimized for Netlify

### Key Application States
The main app manages four navigation states:
1. `permission` - Location permission request
2. `welcome` - Destination selection
3. `navigating` - Active navigation with route display
4. `arrived` - Arrival confirmation

### Core Libraries and Utilities

#### Navigation System (`src/lib/navigation.js`)
- **Route Creation**: Multi-service routing with fallbacks (OSRM → MapLibre → ORS → Direct)
- **Route Deviation**: Smart detection of off-route situations with automatic recalculation
- **Route Optimization**: Progressive route trimming and traveled route tracking
- **Thresholds**: Configurable deviation detection (25m), recalculation intervals (8s), movement thresholds (8m)

#### Location Management (`src/hooks/useLocations.js`)
- **TanStack Query integration** for location data caching
- **Supabase integration** for block/lot location retrieval
- **Query key management** for consistent cache invalidation
- **Data validation** for coordinates and location properties

#### GPS and Location Processing
- **`useSmoothedLocation`**: Filters GPS noise, removes jumps, validates accuracy
- **`useAdaptiveGPS`**: Battery-optimized GPS settings based on speed and navigation state
- **`useAdaptivePitch`**: Dynamic map pitch based on speed (0-60° range)

#### Utilities
- **`src/utils/geoUtils.js`**: Distance calculations, bearing computations, coordinate utilities
- **`src/utils/mapTransitions.js`**: Optimized map animations and transitions
- **`src/utils/mapIcons.js`**: Direction icons and map markers

### Component Architecture

#### Main Components
- **`App.jsx`**: Main application orchestrator with navigation state management
- **`NavigationDisplay.jsx`**: Real-time navigation UI with distance/direction
- **Modal Components**: Location permission, welcome screen, arrival confirmation
- **`NavigationAlerts.jsx`**: Smart navigation warnings and contextual alerts

#### UI Components (`src/components/ui/`)
Radix UI-based components following shadcn/ui patterns:
- Consistent design system with CSS custom properties
- Accessible components (dialog, select, button, alert-dialog)
- Tailwind CSS integration with custom GGV color scheme

### Data Structure

#### Location Data (Supabase)
```javascript
{
  block: string,           // Block number
  lot: string,             // Lot number  
  coordinates: {           // PostGIS Point
    coordinates: [lon, lat]
  },
  address: string,         // Optional address
  is_locked: boolean,      // Availability flag
  deleted_at: timestamp    // Soft delete
}
```

#### Route Data (GeoJSON)
```javascript
{
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    geometry: {
      type: "LineString", 
      coordinates: [[lon, lat], ...]
    },
    properties: {
      distance: number,    // meters
      duration: number,    // seconds
      source: string,      // routing service used
      steps: array         // turn-by-turn instructions
    }
  }]
}
```

### Configuration

#### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_OPENROUTE_API_KEY` - OpenRouteService API key (optional)

#### Map Configuration
- **Default Location**: Garden Grove Village (14.347872973134175, 120.95134859887523)
- **Map Styles**: OSM tiles and Esri satellite imagery
- **Zoom Levels**: 16.5 (welcome), 18 (navigation)
- **Route Colors**: Blue for active route, orange dashed for traveled portion

#### PWA Configuration
- **Caching Strategy**: NetworkFirst for critical assets, CacheFirst for map tiles
- **Offline Support**: Routes, map tiles, and location data cached
- **Update Strategy**: Auto-update with skipWaiting enabled

### Development Guidelines

#### Code Style
- Modern React patterns (hooks, functional components)
- ES2020+ JavaScript with modules
- JSX components in `.jsx` files
- Consistent error handling with console logging (errors not shown to users)

#### Performance Optimizations
- Route memoization and caching
- GPS processing optimization based on movement speed
- Map transition optimization with shouldTransition checks
- Lazy loading and code splitting for vendor libraries

#### Mobile-First Design
- Touch-optimized interactions
- Responsive layouts with Tailwind breakpoints
- Native device integration (GPS, orientation, PWA features)
- Battery-conscious GPS and rendering optimizations

### Deployment

The application is optimized for Netlify deployment with:
- Build verification scripts
- Service worker generation
- Asset optimization and chunking
- Node.js 18+ and npm 9+ requirements