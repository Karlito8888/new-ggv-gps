# Change: Refactor Modal-Based Navigation to Page-Based Routing

## Why

The current architecture uses stacked Radix UI Dialog modals controlled by a state machine (`useNavigationState`). This causes several issues:

1. **Page refresh breaks the flow** - Refreshing the browser resets state to `gps-permission`, losing navigation context
2. **Touch interaction conflicts** - The wheel picker (`react-mobile-picker`) in `WelcomeModalMobile` has touch event conflicts with modal overlay handling
3. **No browser history support** - Users cannot use the native back button to navigate between screens
4. **URL sharing impossible** - Cannot deep-link to specific screens (e.g., share a navigation session)
5. **SEO and accessibility** - Modals are not semantically appropriate for full-screen application states

## What Changes

- **BREAKING**: Replace modal-based navigation with React Router page-based routing
- Add `react-router-dom` dependency
- Create dedicated page components: `GpsPermissionPage`, `WelcomePage`, `NavigatePage`, `ArrivedPage`, `ExitCompletePage`
- Implement a shared `MapLayout` component that keeps MapLibre persistent across route changes
- Move navigation state to React Context + URL parameters for shareable state
- Remove modal components for full-screen flows (keep modals only for true overlays like settings)
- Update `useNavigationState` to work with router navigation instead of state machine

## Impact

- **Affected code:**
  - `src/App.jsx` - Major refactor to routing structure
  - `src/hooks/useNavigationState.js` - Integrate with router
  - `src/components/GpsPermissionModal.jsx` → `src/pages/GpsPermissionPage.jsx`
  - `src/components/WelcomeModalMobile.jsx` → `src/pages/WelcomePage.jsx`
  - `src/components/OrientationPermissionModal.jsx` → merged into navigation flow
  - `src/components/ArrivalModalNew.jsx` → `src/pages/ArrivedPage.jsx`
  - `src/components/ExitSuccessModal.jsx` → `src/pages/ExitCompletePage.jsx`
  - `src/main.jsx` - Add BrowserRouter provider

- **New files:**
  - `src/pages/` directory with page components
  - `src/layouts/MapLayout.jsx` - Persistent map wrapper
  - `src/contexts/NavigationContext.jsx` - Shared navigation state

- **Dependencies:**
  - Add: `react-router-dom@^7.x`
