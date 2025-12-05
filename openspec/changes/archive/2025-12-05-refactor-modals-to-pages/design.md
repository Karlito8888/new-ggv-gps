## Context

MyGGV GPS is a mobile-first navigation app for Garden Grove Village. The current UX uses Radix UI Dialog modals to display full-screen flows (GPS permission, destination selection, arrival confirmation). This creates issues with:

- Browser refresh losing state
- Touch event conflicts with `react-mobile-picker`
- No browser back button support
- Inability to share URLs for specific states

**Stakeholders:** End users (village residents), developers

## Goals / Non-Goals

**Goals:**
- Enable page refresh without losing navigation context
- Support native browser back/forward navigation
- Fix touch interaction issues with wheel picker
- Allow deep-linking to navigation states
- Keep MapLibre map persistent (no re-initialization on route changes)

**Non-Goals:**
- Offline support (out of scope)
- PWA improvements (separate effort)
- UI redesign of individual screens (keep existing UI, just change container)

## Decisions

### Decision 1: Use React Router v7 with Data Router

**What:** Use `createBrowserRouter` with `RouterProvider` for type-safe routing

**Why:** 
- React Router v7 is the current stable version
- Data Router provides loaders/actions for data fetching
- Better TypeScript support than v6

**Alternatives considered:**
- TanStack Router: More powerful but adds learning curve
- Wouter: Simpler but lacks data loading features
- Keep modals: Rejected due to fundamental UX issues

### Decision 2: Persistent Map via Outlet Layout

**What:** Create a `MapLayout` component that renders the map once, with child routes rendered via `<Outlet />`

**Why:**
- MapLibre map initialization is expensive
- GeolocateControl must maintain GPS tracking state
- Route layers and markers must persist during navigation

**Implementation:**
```jsx
// MapLayout.jsx
<div className="app-container">
  <Header />
  <main className="main-content">
    <Map ref={mapRef} ...>
      {/* Map internals */}
    </Map>
    <Outlet context={{ mapRef, userLocation, ... }} />
  </main>
  <Footer />
</div>
```

### Decision 3: URL-Based State for Destination

**What:** Store destination in URL search params: `/navigate?block=5&lot=12`

**Why:**
- Enables page refresh without losing destination
- Allows deep-linking to active navigation
- Simplifies state management

**Alternative considered:**
- React Context only: Loses state on refresh (current problem)
- localStorage: Adds complexity, potential stale data

### Decision 4: Route Structure

**What:** Define routes matching the navigation state machine:

| Route | State | Component |
|-------|-------|-----------|
| `/` | `gps-permission` | `GpsPermissionPage` |
| `/welcome` | `welcome` | `WelcomePage` |
| `/navigate` | `navigating` | `NavigatePage` |
| `/arrived` | `arrived` | `ArrivedPage` |
| `/exit-complete` | `exit-complete` | `ExitCompletePage` |

**Why:** 1:1 mapping with existing state machine simplifies migration

### Decision 5: Navigation Context for Shared State

**What:** Create `NavigationContext` to share:
- `mapRef` - MapLibre map reference
- `userLocation` - Current GPS position
- `destination` - Selected destination (also in URL)
- `orientationEnabled` - Compass state
- Navigation methods (handled by router)

**Why:** Some state cannot be in URL (map ref, real-time GPS)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking existing deep integrations | Keep `useNavigationState` API, adapt internals |
| Map flickering during route transitions | Use layout with persistent map, avoid re-mounting |
| Increased bundle size (~15KB for react-router-dom) | Acceptable for UX benefits |
| Learning curve for developers | Document patterns clearly |

## Migration Plan

1. Install `react-router-dom`
2. Create `MapLayout` with persistent map
3. Create page components (initially wrapping existing modal content)
4. Set up router in `main.jsx`
5. Update `useNavigationState` to use `useNavigate`
6. Remove modal wrappers, keep inner content
7. Test GPS flow, destination selection, navigation, arrival
8. Remove old modal components

**Rollback:** Revert to modal-based flow by reverting commits (no data migration needed)

## Open Questions

1. Should `/navigate` require destination in URL or redirect to `/welcome` if missing?
   - **Proposed:** Redirect to `/welcome` if no destination params

2. Should orientation permission be a separate route or inline in `/navigate`?
   - **Proposed:** Inline in `/navigate` with a local modal (true overlay use case)
