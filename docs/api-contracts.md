# API Contracts — MyGGV GPS

> Generated: 2026-02-24 | Scan: exhaustive | Mode: full_rescan

---

## Overview

MyGGV GPS integrates with 3 external services plus the browser's native Geolocation API. All calls are outbound (client → service). There is no backend server or custom API.

| Service | Purpose | Auth | Required |
|---|---|---|---|
| OSRM | Primary walking route | None (public) | No (has fallbacks) |
| OpenRouteService | Route fallback level 2 | API key | No |
| Supabase | Blocks/lots data | Anon key | Yes |
| OpenFreeMap | Map tiles + style | None (public) | Yes |

---

## 1. OSRM — Primary Routing

**Base URL:** `https://router.project-osrm.org`

**Used in:** `src/hooks/useRouting.js` → `fetchOSRM()`

### `GET /route/v1/foot/{coordinates}`

Calculate a walking route between two points.

**Request:**
```
GET https://router.project-osrm.org/route/v1/foot/{originLng},{originLat};{destLng},{destLat}?overview=full&geometries=geojson&steps=true

Parameters:
  overview=full         Return full route geometry (not simplified)
  geometries=geojson    Return geometry as GeoJSON LineString
  steps=true            Include turn-by-turn maneuver steps
```

**Timeout:** 3 seconds (`REQUEST_TIMEOUT_MS = 3000`)

**Success Response:**
```json
{
  "code": "Ok",
  "routes": [
    {
      "geometry": {
        "type": "LineString",
        "coordinates": [[lng, lat], ...]
      },
      "distance": 450.5,
      "legs": [
        {
          "steps": [
            {
              "maneuver": {
                "type": "turn",
                "modifier": "left",
                "location": [120.9513, 14.3479]
              },
              "distance": 120.3
            }
          ]
        }
      ]
    }
  ]
}
```

**Error Response:** `{ "code": "NoRoute" }` or network error

**Step parsing (`parseManeuver`):**
| Maneuver type | Icon | isSignificant |
|---|---|---|
| `depart` | filtered out | — |
| `arrive` | 📍 | true |
| `roundabout` / `rotary` | ⟳ | true |
| `turn` / `end of road` / `fork` | ← → ↑ etc. | true if modifier ≠ "straight" |
| `continue` / `new name` | ← → ↑ etc. | true if modifier ≠ "straight" |
| default | ↑ | false |

---

## 2. OpenRouteService — Routing Fallback

**Base URL:** `https://api.openrouteservice.org`

**Used in:** `src/hooks/useRouting.js` → `fetchORS()`

**Activation:** Only called if `VITE_OPENROUTE_API_KEY` is set AND OSRM fails.

### `GET /v2/directions/foot-walking`

Calculate a walking route (fallback).

**Request:**
```
GET https://api.openrouteservice.org/v2/directions/foot-walking?api_key={key}&start={originLng},{originLat}&end={destLng},{destLat}
```

**Timeout:** 3 seconds

**Success Response:**
```json
{
  "features": [
    {
      "geometry": {
        "type": "LineString",
        "coordinates": [[lng, lat], ...]
      },
      "properties": {
        "summary": {
          "distance": 450.5
        }
      }
    }
  ]
}
```

**Note:** Steps are NOT extracted from ORS response. `steps` is set to `[]` when using ORS.

---

## 3. Direct Line — Ultimate Fallback

**No external call.** Computed entirely in `useRouting.js`.

When both OSRM and ORS fail:
```js
const geometry = {
  type: "LineString",
  coordinates: [[originLng, originLat], [destLng, destLat]]
}
const distance = getDistance(originLat, originLng, destLat, destLng) // Haversine
const steps = [{ type: "straight", icon: "↑", distance }]
```

OSRM retry is scheduled: 10s → 30s → 60s exponential backoff.

---

## 4. Supabase — Village Data

**Base URL:** `VITE_SUPABASE_URL` (configured in environment)

**Auth:** `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (anon key, safe to expose)

**Client:** Lazy-loaded proxy in `src/lib/supabase.js`

### `RPC get_blocks`

Fetch all block names for the destination selector.

**Call:**
```js
await supabase.rpc("get_blocks")
```

**Response:**
```json
[
  { "name": "1" },
  { "name": "2" },
  { "name": "3" },
  ...
]
```

**Used in:** `App.jsx` → initial `useEffect` + `retryLoadBlocks()`

**Timing:** Pre-fetched on app mount (during GPS permission screen).

---

### `RPC get_lots_by_block`

Fetch lots for a selected block, with centroid coordinates.

**Call:**
```js
await supabase.rpc("get_lots_by_block", { block_name: "5" })
```

**Response:**
```json
[
  {
    "lot": "1",
    "coordinates": {
      "type": "Point",
      "coordinates": [120.9513, 14.3479]
    }
  },
  ...
]
```

**Used in:** `WelcomeOverlay` → `useEffect` when `selectedBlock` changes

**Coordinate extraction:**
```js
const coords = [lot.coordinates.coordinates[0], lot.coordinates.coordinates[1]]
// → [longitude, latitude]  (GeoJSON order)
```

---

## 5. OpenFreeMap — Map Tiles

**Used in:** `src/hooks/useMapSetup.js`

### Map Style
```
GET https://tiles.openfreemap.org/styles/liberty
Response: MapLibre GL style JSON object
```

**Glyph override:**
```js
// OpenFreeMap fonts return 404 — override with MapLibre official server
style.glyphs = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
```

### Vector Tiles
Served by OpenFreeMap CDN (embedded in style JSON). No direct calls needed — MapLibre handles this.

---

## 6. Browser APIs

### Geolocation API

**Via MapLibre `GeolocateControl`** — not called directly.

```js
const geolocate = new MapLibre.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserHeading: false
})
```

**Permission flow:**
1. User clicks "Enable GPS" button
2. `geolocate.trigger()` → native browser permission dialog
3. On grant → `geolocate` event fires with `{ coords: { latitude, longitude } }`
4. `userLocation` state updated on each position update

### Device Orientation API

**iOS 13+:**
```js
const permission = await DeviceOrientationEvent.requestPermission()
// Must be called from user gesture
// Returns: "granted" | "denied"
window.addEventListener("deviceorientation", handler)
// handler uses: e.webkitCompassHeading (0-360, North=0, clockwise)
```

**Android Chrome:**
```js
window.addEventListener("deviceorientationabsolute", handler)
// handler uses: e.alpha (0-360, counter-clockwise → invert: (360 - alpha) % 360)
```

### Vibration API (Haptic feedback)
```js
navigator.vibrate?.([100, 50, 100])  // On arrival (Android only)
```

---

## Error Handling Summary

| Scenario | Behavior |
|---|---|
| OSRM timeout/error | Log warning, try ORS |
| ORS error | Log warning, use direct line |
| OSRM retry exhausted (3x) | Stay on direct line, log info |
| Supabase blocks error | Set `blocksError` state, show retry button |
| Supabase lots error | Log error, set empty lots |
| Map style load error | MapLibre handles internally |
| Missing glyph image | `styleimagemissing` handler adds 1x1 transparent placeholder |
| Geolocation denied | Show "Please, try again" error in GPS permission overlay |
| Orientation permission denied | Show "Permission denied" error in compass overlay |
