# Spec: MapLibre Native Integration

**Capability**: `maplibre-integration`  
**Status**: Draft  
**Change**: `simplify-architecture`

## Overview

This spec defines the native MapLibre GL JS integration patterns, replacing react-map-gl wrapper and Turf.js dependencies with direct MapLibre API usage for maximum performance and minimal abstraction.

## ADDED Requirements

### Requirement: Direct MapLibre Initialization

**ID**: `MLI-001`  
**Priority**: Critical

The application MUST initialize MapLibre GL JS directly without react-map-gl wrapper, using the native `maplibregl.Map` constructor.

#### Scenario: Map container initialization

**Given** a React ref pointing to a DOM element  
**When** the component mounts  
**Then** a MapLibre map instance MUST be created with:

- Container set to the ref element
- Initial center at `[120.95134859887523, 14.347872973134175]` (village center)
- Initial zoom level of 15
- Map style URL for OSM or satellite imagery

**And** the map instance MUST be stored in component state for access by hooks

#### Scenario: Map cleanup on unmount

**Given** a MapLibre map instance exists  
**When** the component unmounts  
**Then** `map.remove()` MUST be called to prevent memory leaks

### Requirement: Native GeolocateControl for GPS

**ID**: `MLI-002`  
**Priority**: Critical

The application MUST use MapLibre's native `GeolocateControl` for GPS tracking, replacing any custom GPS implementation.

#### Scenario: GeolocateControl setup

**Given** a MapLibre map instance is loaded  
**When** the map `load` event fires  
**Then** a GeolocateControl MUST be added with:

- `positionOptions: { enableHighAccuracy: true }`
- `trackUserLocation: true`
- `showUserHeading: true`

**And** the control MUST be added to the map with `map.addControl(geolocate)`

#### Scenario: GPS position tracking

**Given** GeolocateControl is active  
**When** a `geolocate` event fires  
**Then** user location state MUST be updated with:

- `latitude: e.coords.latitude`
- `longitude: e.coords.longitude`
- `accuracy: e.coords.accuracy`
- `heading: e.coords.heading` (if available)

### Requirement: Native Spatial Queries (No Turf.js)

**ID**: `MLI-003`  
**Priority**: High

The application MUST use MapLibre native methods for spatial operations, eliminating Turf.js dependency.

#### Scenario: Point-in-polygon detection using queryRenderedFeatures

**Given** a geographic coordinate `[lng, lat]`  
**And** a layer ID for polygon features (e.g., `blocks-fill`)  
**When** checking if point is within polygon  
**Then** the application MUST:

1. Convert lng/lat to pixel coordinates with `map.project([lng, lat])`
2. Query features at that pixel with `map.queryRenderedFeatures(point, { layers: [layerId] })`
3. Return `true` if `features.length > 0`, otherwise `false`

**And** Turf.js `booleanPointInPolygon` MUST NOT be used

#### Scenario: Distance calculation using map.project()

**Given** two geographic coordinates `[lng1, lat1]` and `[lng2, lat2]`  
**When** calculating distance between points  
**Then** the application MUST:

1. Convert both coordinates to pixels with `map.project()`
2. Calculate pixel distance with `Math.hypot(x2 - x1, y2 - y1)`
3. Convert to meters using `metersPerPixel = 156543.03392 * Math.cos(lat * PI / 180) / 2^zoom`
4. Return `pixelDistance * metersPerPixel`

**And** Turf.js `distance()` MUST NOT be used for simple distance calculations

#### Scenario: Bearing calculation (pure JS)

**Given** two geographic coordinates (origin and destination)  
**When** calculating bearing (compass direction) from origin to destination  
**Then** the application MUST use standard haversine bearing formula:

```js
const dLon = ((lon2 - lon1) * PI) / 180;
const y = sin(dLon) * cos(lat2);
const x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon);
const bearing = ((atan2(y, x) * 180) / PI + 360) % 360;
```

**And** Turf.js `bearing()` MUST NOT be used

### Requirement: GeoJSON Source and Layer Management

**ID**: `MLI-004`  
**Priority**: High

The application MUST manage GeoJSON sources and layers using native MapLibre methods.

#### Scenario: Add block polygons as GeoJSON source

**Given** a MapLibre map instance has loaded  
**And** block polygon data is available as GeoJSON  
**When** setting up the map  
**Then** the application MUST:

1. Add source: `map.addSource('blocks', { type: 'geojson', data: blocksGeoJSON })`
2. Add fill layer: `map.addLayer({ id: 'blocks-fill', type: 'fill', source: 'blocks', paint: {...} })`
3. Add outline layer: `map.addLayer({ id: 'blocks-outline', type: 'line', source: 'blocks', paint: {...} })`

#### Scenario: Update route geometry dynamically

**Given** a route source exists with ID `route-main`  
**When** a new route is calculated  
**Then** the application MUST update the source data with:

```js
map.getSource("route-main").setData(newRouteGeoJSON);
```

**And** the map MUST automatically re-render the route layer

**And** NO layer recreation or removal/re-add cycles MUST occur (use setData only)

### Requirement: Native Camera Controls

**ID**: `MLI-005`  
**Priority**: High

The application MUST use MapLibre native camera methods for smooth map transitions.

#### Scenario: Follow user location during navigation

**Given** user is navigating with active GPS tracking  
**When** user location updates  
**Then** the camera MUST smoothly transition to user location with:

```js
map.flyTo({
  center: [userLng, userLat],
  bearing: calculatedBearing,
  pitch: 60,
  zoom: 18,
  duration: 1000,
});
```

**And** the transition MUST complete within 1000ms for responsive feel

#### Scenario: Jump to destination on selection

**Given** user selects a destination (block/POI)  
**When** transitioning from welcome screen to navigation  
**Then** the camera MUST instantly jump to destination with:

```js
map.jumpTo({
  center: destinationCoords,
  zoom: 17,
  pitch: 0,
});
```

**And** NO animation MUST occur (instant jump for immediate context)

### Requirement: Feature State API for Dynamic Styling

**ID**: `MLI-006`  
**Priority**: Medium

The application MUST use MapLibre's Feature State API for dynamic styling without layer recreation when styling needs to change based on user interaction.

#### Scenario: Highlight selected block

**Given** user hovers over or selects a block polygon  
**When** block selection changes  
**Then** the application MUST:

1. Set feature state: `map.setFeatureState({ source: 'blocks', id: blockId }, { selected: true })`
2. Use data-driven styling: `'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.8, 0.2]`

**And** the previous selected block state MUST be cleared: `map.setFeatureState(..., { selected: false })`

### Requirement: Native Marker API

**ID**: `MLI-007`  
**Priority**: Medium

The application MUST use native `maplibregl.Marker` for destination markers.

#### Scenario: Add destination marker

**Given** user selects a destination with coordinates `[lng, lat]`  
**When** displaying the destination on map  
**Then** the application MUST:

1. Create marker: `const marker = new maplibregl.Marker({ color: '#FF0000' })`
2. Set position: `marker.setLngLat([lng, lat])`
3. Add to map: `marker.addTo(map)`

**And** the marker MUST be stored for later removal

#### Scenario: Remove marker on navigation reset

**Given** a destination marker exists on the map  
**When** user cancels navigation or arrives  
**Then** `marker.remove()` MUST be called

## MODIFIED Requirements

### Requirement: Route Source Management

**ID**: `NAV-003` (from `navigation-routing` spec)  
**Change**: Specify native MapLibre source management

The route MUST be displayed using three native MapLibre GeoJSON sources:

- `route-main`: Full route geometry (blue line, 5px width)
- `route-traveled`: Traveled portion (gray line, 3px width, opacity 0.5)
- `route-remaining`: Remaining portion (blue line, 5px width)

#### Scenario: Add route source on first calculation

**Given** a route is calculated for the first time  
**When** adding the route to the map  
**Then** the application MUST:

1. Check if source exists: `if (!map.getSource('route-main'))`
2. Create source: `map.addSource('route-main', { type: 'geojson', data: routeGeoJSON })`
3. Add layer: `map.addLayer({ id: 'route-main-line', type: 'line', source: 'route-main', paint: { 'line-color': '#4285F4', 'line-width': 5 } })`

**And** the layer MUST render above block polygons but below markers

#### Scenario: Update route on recalculation

**Given** a route source already exists  
**When** the route is recalculated  
**Then** the application MUST update the existing source:

```js
map.getSource("route-main").setData(newRouteGeoJSON);
```

**And** NO layer removal or recreation MUST occur

**Removed**: Any references to react-map-gl `<Source>` and `<Layer>` components

## REMOVED Requirements

### Requirement: react-map-gl Wrapper Usage

**ID**: `MLI-OLD-001` (hypothetical)  
**Reason**: Complete removal of react-map-gl dependency

**Removed functionality**:

- All `<Map>`, `<Source>`, `<Layer>`, `<Marker>` JSX components
- React state synchronization for viewport (onMove, onZoom callbacks)
- React-specific map ref handling

**Replacement**: Direct MapLibre GL JS API calls in useEffect hooks

### Requirement: Turf.js Geographic Calculations

**ID**: `MLI-OLD-002` (hypothetical)  
**Reason**: Turf.js dependency removed for bundle size + performance

**Removed functions**:

- `turf.distance()` → Replaced by `map.project()` + pixel distance
- `turf.bearing()` → Replaced by haversine bearing formula
- `turf.booleanPointInPolygon()` → Replaced by `map.queryRenderedFeatures()`
- `turf.point()`, `turf.polygon()` → Direct GeoJSON construction

**Exception**: If complex operations (e.g., buffer, union, intersect) are needed in future, Turf.js MAY be re-added for those specific operations only.

## Implementation Notes

### Performance Considerations

- Native MapLibre calls avoid React wrapper overhead (~10-15% performance gain)
- `map.project()` for distance is faster than Turf.js great-circle calculations at zoom > 14
- Feature State API avoids layer recreation (60fps styling updates)

### Browser Compatibility

- MapLibre GL JS 5.6+ supports all target browsers (Chrome Android, Safari iOS)
- GeolocateControl works consistently across iOS 13+ and Android 10+
- No polyfills needed for Map constructor or ES6+ features

### Bundle Size Impact

- Removing react-map-gl: -80KB gzipped
- Removing @turf/turf: -70KB gzipped
- Total savings: ~150KB gzipped (23% reduction)

## Related Specs

- `navigation-routing` - Modified to use native MapLibre route sources
- `hooks-architecture` - useMapSetup hook implements these patterns
- `state-management` - Map instance stored in App.jsx state

## References

- [MapLibre GL JS API Docs](https://maplibre.org/maplibre-gl-js/docs/API/)
- [GeolocateControl API](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeolocateControl/)
- [Feature State API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#setfeaturestate)
