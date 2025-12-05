# Design: Simplify Architecture

**Change ID**: `simplify-architecture`  
**Status**: Draft  
**Date**: 2025-12-05

## Overview

This design document describes the technical architecture for radically simplifying MyGGV GPS from 44 files / 6200+ LOC to < 10 files / < 1500 LOC while preserving all functionality. The core strategy is **direct MapLibre GL JS usage** without wrappers or abstractions.

## Architectural Principles

### 1. KISS (Keep It Simple, Stupid)
- **No abstractions for one-time operations** - Inline code is fine
- **No utility files** - If logic is used once, keep it inline
- **No complex state management** - Simple useState in main component
- **No routing library** - Conditional rendering based on state

### 2. 100% MapLibre Native
- **Direct MapLibre GL JS API** - No react-map-gl wrapper
- **Native spatial operations** - No Turf.js, use map.project()/queryRenderedFeatures()
- **Native controls** - GeolocateControl for GPS, NavigationControl for zoom
- **Native styling** - Feature State API for dynamic styles

### 3. Minimal File Structure
- **Single main component** (App.jsx) - All UI + state machine
- **3 essential hooks** - Map setup, routing, navigation logic
- **2 data files** - Blocks + POIs (unchanged)
- **1 style file** - Tailwind + custom CSS

## File Structure

```
src/
├── main.jsx                    # Entry point (React.render + QueryClient wrapper)
├── App.jsx                     # Main component (800-1000 LOC)
│                               # - State machine (5 states)
│                               # - Conditional UI rendering
│                               # - Map container
│                               # - All event handlers
├── hooks/
│   ├── useMapSetup.js         # Map initialization (200-300 LOC)
│   ├── useRouting.js          # Route calculation (250-350 LOC)
│   └── useNavigation.js       # Turn-by-turn logic (200-300 LOC)
├── data/
│   ├── blocks.js              # Village block polygons (unchanged)
│   └── pois.js                # Points of interest (unchanged)
└── styles/
    └── app.css                # Tailwind + custom styles (100-200 LOC)

Total: 9 files, ~1400 LOC
```

## State Machine Design

### 5 States (Sequential Flow)

```
[gps-permission] → [welcome] → [orientation-permission] → [navigating] → [arrived]
```

**Implementation (in App.jsx):**
```js
const [navState, setNavState] = useState('gps-permission');
const [destination, setDestination] = useState(null);
const [userLocation, setUserLocation] = useState(null);
const [routeData, setRouteData] = useState(null);

// Conditional rendering based on navState
return (
  <div className="app-container">
    <div ref={mapContainerRef} className="map" />
    
    {navState === 'gps-permission' && (
      <GPSPermissionOverlay onGrant={() => setNavState('welcome')} />
    )}
    
    {navState === 'welcome' && (
      <WelcomeOverlay 
        onSelectDestination={(dest) => {
          setDestination(dest);
          setNavState('orientation-permission');
        }}
      />
    )}
    
    {navState === 'orientation-permission' && (
      <OrientationPermissionOverlay 
        onGrant={() => setNavState('navigating')}
      />
    )}
    
    {navState === 'navigating' && (
      <NavigationOverlay 
        routeData={routeData}
        userLocation={userLocation}
        onArrival={() => setNavState('arrived')}
      />
    )}
    
    {navState === 'arrived' && (
      <ArrivalOverlay onReset={() => {
        setNavState('welcome');
        setDestination(null);
      }} />
    )}
  </div>
);
```

**State Transitions:**
1. `gps-permission` → `welcome`: GPS granted via GeolocateControl
2. `welcome` → `orientation-permission`: User selects destination
3. `orientation-permission` → `navigating`: Device orientation granted
4. `navigating` → `arrived`: Distance < 20m from destination
5. `arrived` → `welcome`: User taps "Navigate Again"

### State Data Structure

```js
// Main state (in App.jsx)
const state = {
  navState: 'gps-permission' | 'welcome' | 'orientation-permission' | 'navigating' | 'arrived',
  destination: {
    type: 'block' | 'house' | 'poi' | 'exit',
    coordinates: [lng, lat],
    name: string,
    address?: string
  } | null,
  userLocation: {
    latitude: number,
    longitude: number,
    accuracy: number,
    heading: number | null
  } | null,
  deviceOrientation: {
    alpha: number,     // Compass heading (0-360)
    beta: number,      // Front-to-back tilt
    gamma: number      // Left-to-right tilt
  } | null,
  mapStyle: 'osm' | 'satellite'
};
```

## Hook Architecture

### Hook 1: useMapSetup(containerRef, options)

**Purpose**: Initialize MapLibre map instance with GPS tracking.

**API Contract:**
```js
const {
  map,              // MapLibre map instance
  userLocation,     // { lat, lng, accuracy, heading } | null
  isMapReady,       // boolean
  setMapStyle       // (style: 'osm' | 'satellite') => void
} = useMapSetup(mapContainerRef, {
  center: [120.9513, 14.3479],
  zoom: 15,
  pitch: 0,
  bearing: 0
});
```

**Responsibilities:**
1. Create MapLibre map instance
2. Add GeolocateControl (native GPS)
3. Load block polygons as GeoJSON source + layer
4. Load POI markers
5. Handle map style switching (OSM/satellite)
6. Track user location updates
7. Handle device orientation updates

**Implementation Details:**
```js
export function useMapSetup(containerRef, options = {}) {
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState('osm');

  useEffect(() => {
    if (!containerRef.current) return;

    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(mapStyle),
      center: options.center || [120.9513, 14.3479],
      zoom: options.zoom || 15,
      pitch: options.pitch || 0,
      bearing: options.bearing || 0
    });

    mapInstance.on('load', () => {
      // Add block polygons
      mapInstance.addSource('blocks', {
        type: 'geojson',
        data: blocksGeoJSON
      });
      mapInstance.addLayer({
        id: 'blocks-fill',
        type: 'fill',
        source: 'blocks',
        paint: {
          'fill-color': '#627BC1',
          'fill-opacity': 0.2
        }
      });

      // Add GeolocateControl
      const geolocate = new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      });
      mapInstance.addControl(geolocate);

      geolocate.on('geolocate', (e) => {
        setUserLocation({
          latitude: e.coords.latitude,
          longitude: e.coords.longitude,
          accuracy: e.coords.accuracy,
          heading: e.coords.heading
        });
      });

      setIsMapReady(true);
    });

    setMap(mapInstance);

    return () => mapInstance.remove();
  }, []);

  // Handle map style changes
  useEffect(() => {
    if (map && isMapReady) {
      map.setStyle(getMapStyle(mapStyle));
    }
  }, [mapStyle, map, isMapReady]);

  return { map, userLocation, isMapReady, setMapStyle };
}
```

### Hook 2: useRouting(map, origin, destination)

**Purpose**: Calculate routes and handle recalculation on deviation.

**API Contract:**
```js
const {
  routeGeoJSON,     // GeoJSON LineString | null
  distance,         // meters
  duration,         // seconds
  isCalculating,    // boolean
  error             // Error | null
} = useRouting(map, userLocation, destination);
```

**Responsibilities:**
1. Calculate route with cascading fallback (OSRM → MapLibre Directions → OpenRouteService → Direct line)
2. Add route sources to map: `route-main`, `route-traveled`, `route-remaining`
3. Detect deviation (> 25m from route) → trigger recalculation
4. Update traveled vs. remaining route portions
5. Return route metadata (distance, duration)

**Implementation Details:**
```js
export function useRouting(map, origin, destination) {
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  // Calculate route on origin/destination change
  useEffect(() => {
    if (!map || !origin || !destination) return;

    const calculateRoute = async () => {
      setIsCalculating(true);
      setError(null);

      try {
        // Try OSRM first
        const osrmRoute = await fetchOSRMRoute(origin, destination);
        if (osrmRoute) {
          setRouteGeoJSON(osrmRoute.geometry);
          setDistance(osrmRoute.distance);
          setDuration(osrmRoute.duration);
          addRouteToMap(map, osrmRoute.geometry);
          setIsCalculating(false);
          return;
        }

        // Fallback to MapLibre Directions
        const mlRoute = await fetchMapLibreRoute(origin, destination);
        if (mlRoute) {
          setRouteGeoJSON(mlRoute.geometry);
          setDistance(mlRoute.distance);
          setDuration(mlRoute.duration);
          addRouteToMap(map, mlRoute.geometry);
          setIsCalculating(false);
          return;
        }

        // Fallback to OpenRouteService
        const orsRoute = await fetchORSRoute(origin, destination);
        if (orsRoute) {
          setRouteGeoJSON(orsRoute.geometry);
          setDistance(orsRoute.distance);
          setDuration(orsRoute.duration);
          addRouteToMap(map, orsRoute.geometry);
          setIsCalculating(false);
          return;
        }

        // Last resort: direct line
        const directLine = createDirectLine(origin, destination);
        setRouteGeoJSON(directLine.geometry);
        setDistance(directLine.distance);
        setDuration(directLine.duration);
        addRouteToMap(map, directLine.geometry);
        setIsCalculating(false);

      } catch (err) {
        setError(err);
        setIsCalculating(false);
      }
    };

    calculateRoute();
  }, [map, origin, destination]);

  // Detect deviation and recalculate
  useEffect(() => {
    if (!map || !origin || !routeGeoJSON) return;

    const checkDeviation = () => {
      const distanceFromRoute = calculateDistanceFromRoute(origin, routeGeoJSON);
      if (distanceFromRoute > 25) { // 25m threshold
        // Trigger recalculation by updating key state
        setRouteGeoJSON(null); // This will trigger recalculation
      }
    };

    const interval = setInterval(checkDeviation, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, [map, origin, routeGeoJSON]);

  return { routeGeoJSON, distance, duration, isCalculating, error };
}

function addRouteToMap(map, geojson) {
  // Add or update route-main source
  if (map.getSource('route-main')) {
    map.getSource('route-main').setData(geojson);
  } else {
    map.addSource('route-main', { type: 'geojson', data: geojson });
    map.addLayer({
      id: 'route-main',
      type: 'line',
      source: 'route-main',
      paint: {
        'line-color': '#4285F4',
        'line-width': 5
      }
    });
  }
}
```

### Hook 3: useNavigation(map, userLocation, routeGeoJSON, destination)

**Purpose**: Handle turn-by-turn navigation logic and arrival detection.

**API Contract:**
```js
const {
  bearing,          // degrees (0-360) to next turn
  nextTurn,         // { instruction: string, distance: number } | null
  distanceRemaining, // meters to destination
  hasArrived        // boolean
} = useNavigation(map, userLocation, routeGeoJSON, destination);
```

**Responsibilities:**
1. Calculate bearing from user to next turn
2. Calculate distance remaining to destination
3. Detect arrival (< 20m from destination)
4. Provide turn-by-turn instructions
5. Control map camera (flyTo user location, bearing-based rotation)

**Implementation Details:**
```js
export function useNavigation(map, userLocation, routeGeoJSON, destination) {
  const [bearing, setBearing] = useState(0);
  const [nextTurn, setNextTurn] = useState(null);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);

  // Update navigation data on location change
  useEffect(() => {
    if (!map || !userLocation || !routeGeoJSON || !destination) return;

    const userLngLat = [userLocation.longitude, userLocation.latitude];
    const destLngLat = destination.coordinates;

    // Calculate distance to destination using MapLibre's project API
    const userPoint = map.project(userLngLat);
    const destPoint = map.project(destLngLat);
    const pixelDistance = Math.hypot(
      destPoint.x - userPoint.x,
      destPoint.y - userPoint.y
    );
    
    // Convert pixel distance to meters (approximate)
    const metersPerPixel = getMetersPerPixel(map, userLocation.latitude);
    const distance = pixelDistance * metersPerPixel;
    setDistanceRemaining(distance);

    // Check arrival (< 20m)
    if (distance < 20) {
      setHasArrived(true);
      return;
    }

    // Calculate bearing using MapLibre native methods
    const calculatedBearing = calculateBearing(userLngLat, destLngLat);
    setBearing(calculatedBearing);

    // Find next turn from route geometry
    const turn = findNextTurn(routeGeoJSON, userLngLat);
    setNextTurn(turn);

    // Update map camera to follow user
    map.flyTo({
      center: userLngLat,
      bearing: calculatedBearing,
      pitch: 60,
      zoom: 18,
      duration: 1000
    });

  }, [map, userLocation, routeGeoJSON, destination]);

  return { bearing, nextTurn, distanceRemaining, hasArrived };
}

function calculateBearing(from, to) {
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;
  
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

function getMetersPerPixel(map, latitude) {
  const zoom = map.getZoom();
  const metersPerPixel = 156543.03392 * Math.cos(latitude * Math.PI / 180) / Math.pow(2, zoom);
  return metersPerPixel;
}
```

## Component Structure (App.jsx)

**Inline Components (No Separate Files):**

All UI overlays are defined inline in App.jsx to minimize file count:

```js
// Inside App.jsx

function GPSPermissionOverlay({ onGrant }) {
  return (
    <div className="overlay">
      <h1>GPS Permission Required</h1>
      <button onClick={() => {
        // GeolocateControl handles permission automatically
        onGrant();
      }}>
        Enable GPS
      </button>
    </div>
  );
}

function WelcomeOverlay({ onSelectDestination }) {
  const [selectedBlock, setSelectedBlock] = useState(null);
  
  return (
    <div className="overlay">
      <h1>Where to?</h1>
      <select onChange={(e) => setSelectedBlock(e.target.value)}>
        {blocks.map(block => (
          <option key={block.id} value={block.id}>{block.name}</option>
        ))}
      </select>
      <button onClick={() => {
        const dest = blocks.find(b => b.id === selectedBlock);
        onSelectDestination({
          type: 'block',
          coordinates: dest.center,
          name: dest.name
        });
      }}>
        Navigate
      </button>
    </div>
  );
}

function OrientationPermissionOverlay({ onGrant }) {
  return (
    <div className="overlay">
      <h1>Compass Permission Required</h1>
      <button onClick={async () => {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission === 'granted') onGrant();
        } else {
          onGrant(); // Android doesn't need permission
        }
      }}>
        Enable Compass
      </button>
    </div>
  );
}

function NavigationOverlay({ routeData, userLocation, onArrival }) {
  const { bearing, nextTurn, distanceRemaining, hasArrived } = useNavigation(...);
  
  useEffect(() => {
    if (hasArrived) onArrival();
  }, [hasArrived]);
  
  return (
    <div className="navigation-overlay">
      <div className="distance">{Math.round(distanceRemaining)}m</div>
      {nextTurn && (
        <div className="next-turn">
          <span>{nextTurn.instruction}</span>
          <span>{Math.round(nextTurn.distance)}m</span>
        </div>
      )}
      <div className="compass" style={{ transform: `rotate(${bearing}deg)` }}>
        ↑
      </div>
    </div>
  );
}

function ArrivalOverlay({ onReset }) {
  return (
    <div className="overlay">
      <h1>🎉 You've Arrived!</h1>
      <button onClick={onReset}>Navigate Again</button>
    </div>
  );
}
```

## MapLibre Native API Usage

### Spatial Queries (Replacing Turf.js)

**Before (Turf.js):**
```js
import * as turf from '@turf/turf';

const point = turf.point([lng, lat]);
const polygon = turf.polygon(blockCoordinates);
const isInside = turf.booleanPointInPolygon(point, polygon);
const distance = turf.distance(point1, point2);
```

**After (MapLibre Native):**
```js
// Point-in-polygon using queryRenderedFeatures
const features = map.queryRenderedFeatures(
  map.project([lng, lat]),
  { layers: ['blocks-fill'] }
);
const isInside = features.length > 0;

// Distance using map.project (pixel distance)
const point1Px = map.project([lng1, lat1]);
const point2Px = map.project([lng2, lat2]);
const pixelDistance = Math.hypot(point2Px.x - point1Px.x, point2Px.y - point1Px.y);
const metersPerPixel = 156543.03392 * Math.cos(lat1 * Math.PI / 180) / Math.pow(2, map.getZoom());
const distance = pixelDistance * metersPerPixel;
```

### Direct MapLibre (Removing react-map-gl)

**Before (react-map-gl wrapper):**
```jsx
import Map, { GeolocateControl, Marker } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

<Map
  ref={mapRef}
  mapLib={maplibregl}
  initialViewState={...}
  onMove={evt => setViewState(evt.viewState)}
  mapStyle={mapStyle}
>
  <GeolocateControl />
  <Marker longitude={lng} latitude={lat} />
</Map>
```

**After (Native MapLibre):**
```jsx
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function App() {
  const mapContainerRef = useRef(null);
  const { map, userLocation } = useMapSetup(mapContainerRef);

  return (
    <div ref={mapContainerRef} style={{ width: '100%', height: '100vh' }} />
  );
}

// Inside useMapSetup
const map = new maplibregl.Map({
  container: containerRef.current,
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [120.9513, 14.3479],
  zoom: 15
});

const geolocate = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true
});
map.addControl(geolocate);

new maplibregl.Marker()
  .setLngLat([lng, lat])
  .addTo(map);
```

## Performance Optimizations

### 1. Bundle Size Reduction
- Remove react-map-gl: ~80KB gzipped saved
- Remove @turf/turf: ~70KB gzipped saved
- Remove react-router-dom: ~15KB gzipped saved
- **Total savings: ~165KB gzipped**

### 2. Runtime Performance
- Direct MapLibre calls (no wrapper overhead)
- Fewer React re-renders (single component vs. router pages)
- Feature State API for styling (no layer re-creation)
- Efficient spatial queries (queryRenderedFeatures vs. Turf.js)

### 3. Code Splitting (Keep Existing)
```js
// vite.config.js (unchanged)
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom'],
        'maps': ['maplibre-gl'],
        'supabase': ['@supabase/supabase-js']
      }
    }
  }
}
```

## Browser Compatibility

**No changes needed** - Existing compatibility code preserved:

```js
// Device orientation (iOS + Android)
if (typeof DeviceOrientationEvent.requestPermission === 'function') {
  // iOS 13+ requires permission
  const permission = await DeviceOrientationEvent.requestPermission();
} else {
  // Android doesn't need permission
}

window.addEventListener('deviceorientationabsolute', (e) => {
  // Chrome Android
  setHeading(e.alpha);
});

window.addEventListener('deviceorientation', (e) => {
  // iOS Safari
  if (e.webkitCompassHeading) {
    setHeading(e.webkitCompassHeading);
  }
});
```

## Testing Strategy

### Manual Testing Checklist
- [ ] iOS Safari: GPS permission flow
- [ ] iOS Safari: Device orientation permission
- [ ] iOS Safari: Compass heading accuracy
- [ ] Android Chrome: GPS permission flow
- [ ] Android Chrome: Device orientation (no permission needed)
- [ ] Android Chrome: Compass heading accuracy
- [ ] Route calculation with all fallbacks (OSRM → ML → ORS → Direct)
- [ ] Route recalculation on deviation (> 25m)
- [ ] Arrival detection (< 20m)
- [ ] Map style toggle (OSM ↔ Satellite)
- [ ] PWA install prompt on iOS + Android

### Performance Testing
- [ ] Lighthouse score ≥ 90
- [ ] Bundle size < 500KB gzipped
- [ ] Initial load < 3s on 4G
- [ ] GPS updates smooth (no jank)
- [ ] Battery drain acceptable (< 10%/hour)

## Migration Path

### Phase 1: Scaffold New Structure (1-2 hours)
1. Create `src/App.new.jsx` with basic structure
2. Create 3 new hooks: `useMapSetup.js`, `useRouting.js`, `useNavigation.js`
3. Test map initialization and GPS

### Phase 2: Migrate Core Features (3-4 hours)
1. Port destination selection UI
2. Port route calculation logic (OSRM fallbacks)
3. Port turn-by-turn navigation
4. Port arrival detection

### Phase 3: Polish & Testing (2-3 hours)
1. Add all UI overlays (inline components)
2. Test on iOS + Android devices
3. Fix any compatibility issues
4. Performance audit

### Phase 4: Cleanup & Deploy (1 hour)
1. Delete old files (hooks/, pages/, layouts/, contexts/)
2. Remove dependencies (react-map-gl, turf, react-router)
3. Update package.json
4. Deploy to staging → test → merge to main

**Total estimated time: 7-10 hours**

## Risk Mitigation

### Risk 1: MapLibre Spatial API Limitations
**Mitigation**: Keep Turf.js as optional fallback for complex operations if needed. Monitor bundle size.

### Risk 2: iOS Compass Heading Drift
**Mitigation**: Implement heading smoothing/calibration (already exists in current code, preserve it).

### Risk 3: OSRM Route Failures
**Mitigation**: Preserve existing cascading fallback (OSRM → ML → ORS → Direct line). No changes.

### Risk 4: React 19 Compatibility
**Mitigation**: Test thoroughly with React 19.1. If issues arise, consider React 18.3 downgrade.

## Success Metrics

**Target Metrics (Post-Implementation):**
- Files: < 10 (currently 44) ✅
- LOC: < 1500 (currently 6248) ✅
- Hooks: 3 (currently 10) ✅
- Bundle size: < 500KB gzipped (currently ~650KB) ✅
- Lighthouse score: ≥ 90 ✅
- All features working: ✅

## Open Questions

1. **React Query removal**: Audit Supabase usage to confirm if needed
2. **Framer Motion**: Can animations be CSS-only?
3. **Radix UI**: Keep Dialog + Select or replace with native HTML?

**Recommendation**: Address these in Phase 2 after core features working.
