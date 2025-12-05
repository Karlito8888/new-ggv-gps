# navigation-routing Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
