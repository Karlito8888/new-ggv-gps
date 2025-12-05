## 1. Setup and Infrastructure

- [x] 1.1 Install `react-router-dom@^7.x` dependency
- [x] 1.2 Create `src/pages/` directory structure
- [x] 1.3 Create `src/layouts/` directory structure
- [x] 1.4 Create `src/contexts/NavigationContext.jsx` with provider

## 2. Layout and Router Setup

- [x] 2.1 Create `MapLayout.jsx` with persistent MapLibre map and `<Outlet />`
- [x] 2.2 Move map-related code from `App.jsx` to `MapLayout.jsx`
- [x] 2.3 Create router configuration with `createBrowserRouter`
- [x] 2.4 Update `main.jsx` to use `RouterProvider`

## 3. Page Components

- [x] 3.1 Create `GpsPermissionPage.jsx` (extract from `GpsPermissionModal`)
- [x] 3.2 Create `WelcomePage.jsx` (extract from `WelcomeModalMobile`)
- [x] 3.3 Create `NavigatePage.jsx` (extract navigation display logic)
- [x] 3.4 Create `ArrivedPage.jsx` (extract from `ArrivalModalNew`)
- [x] 3.5 Create `ExitCompletePage.jsx` (extract from `ExitSuccessModal`)

## 4. State Management Updates

- [x] 4.1 Refactor `useNavigationState` to use `useNavigate` for transitions
- [x] 4.2 Implement URL-based destination state (`/navigate?block=X&lot=Y`)
- [x] 4.3 Add route guards to redirect `/navigate` to `/welcome` if no destination
- [x] 4.4 Implement `useOutletContext` for sharing map state with pages

## 5. Integration and Wiring

- [x] 5.1 Connect `GeolocateControl` events to `NavigationContext`
- [x] 5.2 Wire up route manager hooks to work with new page structure
- [x] 5.3 Ensure map transitions (`flyTo`, `recenterMap`) work across routes
- [x] 5.4 Test orientation permission flow within `/navigate` route

## 6. Cleanup

- [x] 6.1 Remove old modal components (`GpsPermissionModal`, `WelcomeModalMobile`, `ArrivalModalNew`, `ExitSuccessModal`, `OrientationPermissionModal`)
- [x] 6.2 Remove unused `App.jsx` (replaced by router)
- [x] 6.3 Update `main.jsx` to use `RouterProvider`
- [x] 6.4 Add page-based styles in `modal-base.module.css`

## 7. Testing and Validation

- [x] 7.1 Test full navigation flow: GPS → Welcome → Navigate → Arrived
- [x] 7.2 Test page refresh at each route (state preservation)
- [x] 7.3 Test browser back/forward navigation
- [x] 7.4 Test deep-link to `/navigate?block=5&lot=12`
- [x] 7.5 Test wheel picker touch interactions on `/welcome`
- [ ] 7.6 Test on Android Chrome and iOS Safari (requires device testing)
- [x] 7.7 Run `npm run build:netlify` to verify production build
