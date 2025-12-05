# navigation-routing Specification

## Purpose
TBD - created by archiving change refactor-modals-to-pages. Update Purpose after archive.
## Requirements
### Requirement: Page-Based Navigation Routing

The application SHALL use React Router to manage navigation between application screens as distinct URL routes instead of modal-based state transitions.

#### Scenario: Initial load redirects to GPS permission

- **WHEN** user loads the application at root URL `/`
- **THEN** the GPS permission page is displayed
- **AND** the URL remains `/`

#### Scenario: GPS permission granted transitions to welcome

- **WHEN** user grants GPS permission on `/`
- **THEN** the application navigates to `/welcome`
- **AND** the map centers on user location

#### Scenario: Destination selection transitions to navigation

- **WHEN** user selects a destination on `/welcome`
- **THEN** the application navigates to `/navigate?block={block}&lot={lot}`
- **AND** the route is calculated and displayed on the map

#### Scenario: Arrival transitions to arrived page

- **WHEN** user arrives at destination during navigation
- **THEN** the application navigates to `/arrived?block={block}&lot={lot}`
- **AND** the arrival confirmation UI is displayed

#### Scenario: Exit village transitions to exit complete

- **WHEN** user completes exit village flow
- **THEN** the application navigates to `/exit-complete`
- **AND** the exit confirmation UI is displayed

---

### Requirement: Persistent Map Across Routes

The MapLibre map instance SHALL remain mounted and initialized across all route transitions to avoid re-initialization overhead and GPS tracking interruption.

#### Scenario: Map persists during route change

- **WHEN** user navigates from `/welcome` to `/navigate`
- **THEN** the map does not re-initialize
- **AND** the GeolocateControl maintains tracking state
- **AND** native route layers are initialized if not already present

#### Scenario: GPS tracking continues across routes

- **WHEN** user is on `/navigate` and page refreshes
- **THEN** the GeolocateControl resumes tracking after permission
- **AND** the route is restored from URL parameters
- **AND** native route layers are re-initialized on map load

### Requirement: URL-Based Destination State

The selected destination SHALL be encoded in URL search parameters to enable page refresh persistence and deep-linking.

#### Scenario: Destination preserved on refresh

- **WHEN** user refreshes the page on `/navigate?block=5&lot=12`
- **THEN** the destination `Block 5, Lot 12` is restored
- **AND** the route is recalculated from current position

#### Scenario: Deep-link to navigation

- **WHEN** user opens URL `/navigate?block=8&lot=3` directly
- **AND** GPS permission was previously granted
- **THEN** the application loads with destination `Block 8, Lot 3`
- **AND** navigation begins after GPS position is acquired

#### Scenario: Missing destination redirects to welcome

- **WHEN** user navigates to `/navigate` without block/lot parameters
- **THEN** the application redirects to `/welcome`

---

### Requirement: Browser History Navigation

The application SHALL support native browser back and forward navigation between screens.

#### Scenario: Back button from navigation to welcome

- **WHEN** user is on `/navigate` and presses browser back button
- **THEN** the application returns to `/welcome`
- **AND** the navigation route is cleared from the map

#### Scenario: Forward button restores navigation

- **WHEN** user presses browser forward button after going back from `/navigate`
- **THEN** the application returns to `/navigate`
- **AND** the destination is restored from URL parameters

---

### Requirement: Route Protection

Routes SHALL validate required state and redirect appropriately when prerequisites are not met, with minimal delay to maintain user experience fluidity.

#### Scenario: Navigate without GPS redirects

- **WHEN** user directly accesses `/navigate` without GPS permission
- **THEN** the application redirects to `/` within 500ms
- **AND** GPS permission is requested

#### Scenario: Navigate without destination redirects

- **WHEN** user accesses `/navigate` without block/lot parameters (and not in exit mode)
- **THEN** the application redirects to `/welcome` within 500ms
- **AND** a brief "No destination selected" message is shown

#### Scenario: Exit mode bypasses destination requirement

- **WHEN** user accesses `/navigate?exit=true`
- **AND** user has GPS permission
- **THEN** navigation to village exit proceeds without block/lot parameters
- **AND** destination is set to `VILLAGE_EXIT_COORDS`

#### Scenario: Arrived without destination redirects

- **WHEN** user directly accesses `/arrived` without valid destination
- **THEN** the application redirects to `/welcome`

### Requirement: Native MapLibre Route Layer Management

The application SHALL use native MapLibre GL JS imperative API (`addSource`, `addLayer`, `setData`) exclusively for route visualization instead of React declarative components.

#### Scenario: Route layers initialized on map load

- **WHEN** the MapLibre map fires the `load` event
- **THEN** native GeoJSON sources are created for route data
- **AND** native line layers are created with shadow, casing, and main line sub-layers

#### Scenario: Route displayed using native source update

- **WHEN** a new route is calculated
- **THEN** the route source is updated via `source.setData(routeGeoJSON)`
- **AND** no React re-render occurs for the route display
- **AND** the route is immediately visible on the map

#### Scenario: Route deviation detection uses native layers

- **WHEN** `isUserOffRoute()` is called
- **THEN** `queryRenderedFeatures()` queries the native route layers
- **AND** the function returns accurate proximity results
- **AND** Turf.js fallback is only used if `queryRenderedFeatures` fails

---

### Requirement: Route Layer Cleanup

The application SHALL properly remove route sources and layers when navigation ends or component unmounts.

#### Scenario: Layers removed on navigation end

- **WHEN** user arrives at destination or cancels navigation
- **THEN** all route-related layers are removed via `map.removeLayer()`
- **AND** all route-related sources are removed via `map.removeSource()`
- **AND** no orphan layers remain on the map

#### Scenario: Cleanup on map unmount

- **WHEN** the map component unmounts
- **THEN** cleanup function removes all route layers and sources
- **AND** no memory leaks occur from orphan event listeners

