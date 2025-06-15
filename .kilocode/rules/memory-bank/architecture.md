# MyGGV-GPS - Architecture

## System Architecture
- **Frontend**: React 19/Vite PWA with modular component structure
- **Mapping**: MapLibre GL JS for indoor/outdoor map rendering
- **Data**: Supabase backend for block/lot information
- **Navigation**: Custom navigation.js logic with GPS integration
- **Offline**: Service workers for caching and offline functionality

## Source Code Paths
- **Core logic**: `src/lib/navigation.js` (refactored into modules)
- **UI components**: `src/components/` directory
- **Hooks**: `src/hooks/` (useAvailableBlocks, useLocationTracking, etc.)
- **Map data**: `src/data/blocks.js` and `src/data/public-pois.js`
- **Styling**: `src/index.css` and component-specific CSS files

## Key Technical Decisions
- MapLibre chosen over OpenLayers for better React integration
- Supabase for backend to maintain open-source compliance
- DaisyUI/shadcn/ui for consistent UI components
- Service workers implemented via `dev-dist/registerSW.js`
- React 19 with "use memo" compiler optimization

## Component Relationships
- App.jsx orchestrates all navigation components via custom hooks
- NavigationDisplay.jsx handles map rendering
- LocationPermissionModal.jsx manages GPS access
- ArrivalModal.jsx confirms destination reach
- WelcomeModal.jsx provides onboarding experience
- ModalManager.jsx centralizes modal rendering logic

## Critical Implementation Paths
1. GPS location acquisition → useLocationTracking hook
2. Block/lot selection → useAvailableBlocks hook
3. Map rendering → MapLibre integration in MapContainer
4. Route management → useRouteManagement hook
5. Offline support → Service worker registration

## Navigation Library Structure
- **Modular design**: Split into specialized files (constants, geometry, routeServices, etc.)
- **Tree-shaking optimized**: Individual module imports supported
- **Backward compatible**: Main navigation.js maintains existing API
- **Routing services**: OSRM primary, OpenRouteService fallback