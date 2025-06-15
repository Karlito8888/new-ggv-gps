# MyGGV-GPS - Architecture

## System Architecture
- **Frontend**: React/Vite PWA with modular component structure
- **Mapping**: MapLibre GL JS for indoor/outdoor map rendering
- **Data**: Supabase backend for block/lot information
- **Navigation**: Custom navigation.js logic with GPS integration
- **Offline**: Service workers for caching and offline functionality

## Source Code Paths
- **Core logic**: `src/lib/navigation.js`
- **UI components**: `src/components/` directory
- **Hooks**: `src/hooks/useAvailableBlocks.js`
- **Map data**: `src/data/blocks.js` and `src/data/public-pois.js`
- **Styling**: `src/index.css` and component-specific CSS files

## Key Technical Decisions
- MapLibre chosen over OpenLayers for better React integration
- Supabase for backend to maintain open-source compliance
- DaisyUI/shadcn/ui for consistent UI components
- Service workers implemented via `dev-dist/registerSW.js`

## Component Relationships
- App.jsx orchestrates all navigation components
- NavigationDisplay.jsx handles map rendering
- LocationPermissionModal.jsx manages GPS access
- ArrivalModal.jsx confirms destination reach
- WelcomeModal.jsx provides onboarding experience

## Critical Implementation Paths
1. GPS location acquisition → navigation.js processing
2. Block/lot selection → useAvailableBlocks hook
3. Map rendering → MapLibre integration in NavigationDisplay
4. Offline support → Service worker registration