# Component Inventory — MyGGV GPS

> Generated: 2026-02-24 | Scan: exhaustive | Mode: full_rescan

---

## Overview

All UI components are defined inline in `src/App.jsx`. There are no separate component files. This is intentional — following the KISS principle, all overlays are small enough (< 150 LOC each) to live inline.

| Component | Type | LOC (approx) | State | Props |
|---|---|---|---|---|
| `App` | Root + state machine | 365 | Yes (6 vars) | None |
| `GPSPermissionOverlay` | Full-screen modal | 90 | Yes | 3 props |
| `WelcomeOverlay` | Full-screen modal | 115 | Yes | 5 props |
| `OrientationPermissionOverlay` | Full-screen modal | 95 | Yes | 1 prop |
| `NavigationOverlay` | Partial overlay (top bar) | 105 | No (pure UI) | 8 props |
| `ArrivedOverlay` | Full-screen modal | 70 | No | 3 props |
| `ExitCompleteOverlay` | Full-screen modal | 45 | No | None |

---

## Component Details

### `App` (root)

**File:** `src/App.jsx:23`

**State variables:**
| Variable | Type | Default | Description |
|---|---|---|---|
| `navState` | string | `"gps-permission"` | Current navigation state |
| `destination` | object\|null | `null` | Selected destination `{type, coordinates, name}` |
| `hasOrientationPermission` | boolean | `false` | Compass permission granted |
| `blocks` | array | `[]` | Block list from Supabase |
| `isLoadingBlocks` | boolean | `true` | Loading state for blocks RPC |
| `blocksError` | string\|null | `null` | Supabase error message |

**Hooks used:**
- `useMapSetup(mapContainerRef)` → `{ map, userLocation, isMapReady, triggerGeolocate }`
- `useRouting(map, userLocation, destination)` → `{ steps, routeSource, routeGeoJSON }`
- `useNavigation(map, userLocation, destination)` → `{ distanceRemaining, hasArrived, arrivedAt }`

**Effects:**
1. Supabase blocks pre-load on mount
2. Arrival detection (once per destination)
3. `isNavigatingRef` sync
4. Map bearing reset when leaving navigation
5. Destination marker update on map
6. Orientation event listener setup (compass rotation)
7. User centering during navigation
8. Initial navigation view (pitch + zoom)

---

### `GPSPermissionOverlay`

**File:** `src/App.jsx:405`

**Purpose:** First screen. Requests GPS permission via MapLibre `GeolocateControl`.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `onGrant` | `() => void` | Called when GPS permission granted → sets navState "welcome" |
| `triggerGeolocate` | `() => Promise` | Triggers native GPS permission dialog |
| `isMapReady` | boolean | Disables button while map is loading |

**State:** `isRequesting` (bool), `error` (string\|null)

**UI elements:**
- GPS icon with pulse animation
- "Enable Location" / "(I-enable ang Lokasyon)"
- Loading spinner in button when `!isMapReady`
- App version display (`__APP_VERSION__`)

**CSS classes:** `.gps-overlay`, `.gps-modal`, `.gps-icon-wrapper`, `.gps-title`, `.gps-tagalog`, `.gps-description`, `.gps-btn`, `.gps-version`

---

### `WelcomeOverlay`

**File:** `src/App.jsx:497`

**Purpose:** Destination selection. Cascading block → lot dropdowns, both from Supabase.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `blocks` | array | `[{ name: string }]` from Supabase |
| `isLoadingBlocks` | boolean | Shows loading state in block dropdown |
| `blocksError` | string\|null | Shows error state with retry button |
| `onRetryBlocks` | `() => void` | Retries the Supabase blocks RPC |
| `onSelectDestination` | `(dest) => void` | Called with `{type, coordinates, name}` |

**State:** `selectedBlock`, `selectedLot`, `lots`, `isLoadingLots`

**Data flow:**
1. Block dropdown populated from `blocks` prop (pre-loaded)
2. On block change → `supabase.rpc("get_lots_by_block", { block_name })` → populates lot dropdown
3. On "Navigate" → finds lot coordinates → calls `onSelectDestination()`

**CSS classes:** `.welcome-overlay`, `.welcome-modal`, `.welcome-block-selector`, `.welcome-select`, `.welcome-btn`, `.welcome-error`, `.welcome-retry-btn`

---

### `OrientationPermissionOverlay`

**File:** `src/App.jsx:666`

**Purpose:** Requests device orientation permission (iOS 13+ only). Android skips this automatically.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `onGrant` | `() => void` | Called when permission granted (or Android no-op) |

**State:** `isRequesting` (bool), `error` (string\|null)

**Platform logic:**
- iOS: calls `DeviceOrientationEvent.requestPermission()` → waits for "granted"
- Android: detects `requestPermission` is not a function → calls `onGrant()` immediately

**CSS classes:** `.orientation-overlay`, `.orientation-modal`, `.orientation-icon-wrapper` (animated spin), `.orientation-btn`

---

### `NavigationOverlay`

**File:** `src/App.jsx:764`

**Purpose:** Active navigation HUD — compact top bar (not full screen). Map is visible behind it.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `map` | MapLibre.Map | For zoom control |
| `distanceRemaining` | number | Meters to destination |
| `destination` | object | `{name, ...}` |
| `steps` | array | Parsed OSRM steps |
| `routeSource` | string | "osrm" \| "ors" \| "direct" |
| `routeGeoJSON` | object | LineString geometry |
| `userLocation` | object | `{latitude, longitude}` |
| `onCancel` | `() => void` | Stops navigation, resets to welcome |

**State:** None (React Compiler handles memoization)

**Key logic:**
- `currentStep`: Computed inline — iterates steps, finds first significant step ahead of user on route using `getDistanceAlongRoute()`
- Format distance: "X m" if < 1000m, "X.X km" if ≥ 1000m
- Zoom controls: `map.easeTo({ zoom: ±1, duration: 200 })`

**Layout:** Three-column flex: `[turn icon + distance] [dest name + distance] [cancel button]`

**CSS classes:** `.navigation-overlay`, `.nav-header-compact`, `.nav-turn`, `.nav-center`, `.nav-dest-name`, `.nav-remaining`, `.nav-source`, `.nav-cancel-btn`, `.nav-map-controls`, `.map-control-btn`

---

### `ArrivedOverlay`

**File:** `src/App.jsx:875`

**Purpose:** Shown on arrival at non-exit destination. Two action buttons.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `destination` | object | `{name, ...}` — for display |
| `onNavigateAgain` | `() => void` | Resets to welcome state |
| `onExitVillage` | `() => void` | Sets exit coords as destination, back to navigating |

**State:** None

**CSS classes:** `.arrived-overlay`, `.arrived-modal`, `.arrived-icon-wrapper` (bounce animation), `.arrived-btn`, `.arrived-btn-secondary`, `.arrived-exit-icon`

---

### `ExitCompleteOverlay`

**File:** `src/App.jsx:947`

**Purpose:** Terminal state after exiting the village. No interactive elements.

**Props:** None

**State:** None

**Content:** "Safe Travels!" / "Ingat sa byahe!" + farewell message. Coffee cup icon.

**CSS classes:** `.exit-overlay`, `.exit-modal`, `.exit-icon-wrapper`, `.exit-title`, `.exit-tagalog`

---

## Shared Animation System

All overlays inherit these shared variants:

```js
// Full-screen overlays
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
}

// Modal cards within overlays
const modalVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: "spring", damping: 25 } },
  exit: { scale: 0.8, opacity: 0 }
}
```

**NavigationOverlay** uses custom animation (slides from top):
```js
initial={{ y: -100, opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
exit={{ y: -100, opacity: 0 }}
```

---

## CSS Design System

**Color palette** (CSS variables in `:root`):
| Variable | Value | Usage |
|---|---|---|
| `--color-white` | `#f4f4f4` | Modal backgrounds |
| `--color-green` | `#50aa61` | Primary buttons, icons, tagalog text |
| `--color-yellow` | `#f3c549` | Secondary accent, exit overlay |
| `--color-black` | `#121212` | Text |

**Typography:**
- Primary font: "Madimi One" (self-hosted woff2, cursive fallback)
- All inputs: `font-size: 16px` (prevents iOS Safari zoom)

**Layout:**
- Mobile-first base styles
- Desktop enhancement at `@media (min-width: 641px)`
- Viewport: `100dvh` → `100svh` → `-webkit-fill-available` cascade

**Overlay pattern:**
```css
.overlay: position fixed, full screen, rgba(0,0,0,0.7) backdrop
.modal: white card, border-radius 1.5rem, shadow
.modal::before: 5px gradient top bar (green→yellow)
```
