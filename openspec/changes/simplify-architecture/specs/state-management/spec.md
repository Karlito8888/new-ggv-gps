# Spec: Simplified State Management

**Capability**: `state-management`  
**Status**: Draft  
**Change**: `simplify-architecture`

## Overview

This spec defines the simplified state management architecture using plain React useState in App.jsx, replacing NavigationContext and React Router with a straightforward 5-state machine and conditional rendering.

## ADDED Requirements

### Requirement: Single-Component State Machine

**ID**: `SM-001`  
**Priority**: Critical

The application MUST implement navigation state as a simple state machine in App.jsx using `useState`, eliminating the need for React Context or Router.

#### Scenario: 5-state sequential flow

**Given** the application is initialized  
**When** navigation progresses through its lifecycle  
**Then** the state MUST transition through exactly these 5 states in order:

1. `gps-permission` - Initial state, requesting GPS access
2. `welcome` - Destination selection screen
3. `orientation-permission` - Requesting device orientation access
4. `navigating` - Active turn-by-turn navigation
5. `arrived` - Arrival confirmation screen

**And** state transitions MUST be sequential (no skipping states)

**And** the only backward transition allowed is `arrived` → `welcome` (for "Navigate Again")

#### Scenario: State stored in App.jsx useState

**Given** App.jsx is the root component  
**When** component initializes  
**Then** navigation state MUST be declared as:

```js
const [navState, setNavState] = useState("gps-permission");
```

**And** NO React Context Provider MUST wrap the application

**And** NO React Router MUST be used

### Requirement: Conditional Rendering by State

**ID**: `SM-002`  
**Priority**: Critical

The application MUST render UI components conditionally based on `navState` value, eliminating React Router pages.

#### Scenario: Render appropriate overlay for each state

**Given** `navState` is set to a specific value  
**When** App.jsx renders  
**Then** the corresponding overlay component MUST be displayed:

```js
{
  navState === "gps-permission" && <GPSPermissionOverlay />;
}
{
  navState === "welcome" && <WelcomeOverlay />;
}
{
  navState === "orientation-permission" && <OrientationPermissionOverlay />;
}
{
  navState === "navigating" && <NavigationOverlay />;
}
{
  navState === "arrived" && <ArrivalOverlay />;
}
```

**And** only ONE overlay MUST be visible at any time

**And** the map container MUST always be rendered (behind overlays)

### Requirement: Inline Component Definitions

**ID**: `SM-003`  
**Priority**: High

Overlay components MUST be defined inline within App.jsx (not in separate files) to minimize file count.

#### Scenario: Define GPSPermissionOverlay inline

**Given** App.jsx needs to render a GPS permission screen  
**When** defining the component  
**Then** it MUST be defined as a function inside App.jsx:

```js
function GPSPermissionOverlay({ onGrant }) {
  return (
    <div className="overlay">
      <h1>GPS Permission Required</h1>
      <button onClick={onGrant}>Enable GPS</button>
    </div>
  );
}
```

**And** the component MUST NOT be exported or in a separate file

#### Scenario: All overlay components defined inline

**Given** the application has 5 navigation states  
**When** implementing App.jsx  
**Then** these inline components MUST be defined:

- `GPSPermissionOverlay`
- `WelcomeOverlay`
- `OrientationPermissionOverlay`
- `NavigationOverlay`
- `ArrivalOverlay`

**And** NO separate files in `src/pages/` or `src/components/overlays/` MUST exist

### Requirement: Minimal State Variables

**ID**: `SM-004`  
**Priority**: High

The application MUST maintain only essential state variables in App.jsx, avoiding state duplication.

#### Scenario: Core state variables declared

**Given** App.jsx manages navigation state  
**When** component initializes  
**Then** exactly these state variables MUST be declared:

```js
const [navState, setNavState] = useState("gps-permission");
const [destination, setDestination] = useState(null);
const [userLocation, setUserLocation] = useState(null);
const [deviceOrientation, setDeviceOrientation] = useState(null);
const [mapStyle, setMapStyle] = useState("osm");
```

**And** NO additional state variables SHOULD be added unless absolutely necessary

**And** hook return values (from useMapSetup, useRouting, useNavigation) MUST NOT duplicate these states

#### Scenario: Destination state structure

**Given** user selects a destination  
**When** storing destination in state  
**Then** the destination object MUST have this structure:

```js
{
  type: 'block' | 'house' | 'poi' | 'exit',
  coordinates: [longitude, latitude],
  name: string,
  address?: string
}
```

**And** coordinates MUST follow GeoJSON order (longitude first)

### Requirement: State Transition Functions

**ID**: `SM-005`  
**Priority**: High

State transitions MUST be explicit and declarative, with clear transition functions.

#### Scenario: GPS permission granted transition

**Given** navState is `gps-permission`  
**When** GPS permission is granted (GeolocateControl activates)  
**Then** `setNavState('welcome')` MUST be called

**And** the transition MUST occur within the GeolocateControl `geolocate` event handler

#### Scenario: Destination selected transition

**Given** navState is `welcome`  
**And** user selects a valid destination  
**When** "Navigate" button is clicked  
**Then** `setDestination({ type, coordinates, name })` MUST be called first

**And** `setNavState('orientation-permission')` MUST be called immediately after

#### Scenario: Orientation permission granted transition

**Given** navState is `orientation-permission`  
**When** device orientation permission is granted  
**Then** `setNavState('navigating')` MUST be called

**And** device orientation event listeners MUST be attached before transition

#### Scenario: Arrival detected transition

**Given** navState is `navigating`  
**And** `useNavigation` hook returns `hasArrived: true`  
**When** arrival condition is met (< 20m from destination)  
**Then** `setNavState('arrived')` MUST be called

**And** the transition MUST occur within a useEffect watching `hasArrived`

#### Scenario: Navigate Again transition

**Given** navState is `arrived`  
**When** user clicks "Navigate Again" button  
**Then** `setNavState('welcome')` MUST be called

**And** `setDestination(null)` MUST be called to reset destination

**And** route data MUST be cleared

### Requirement: No Context Provider

**ID**: `SM-006`  
**Priority**: Critical

The application MUST NOT use React Context API for navigation state management.

#### Scenario: Remove NavigationContext

**Given** the old architecture used NavigationContext  
**When** refactoring to simplified architecture  
**Then** `src/contexts/NavigationContext.jsx` MUST be deleted

**And** NO `<NavigationProvider>` MUST wrap App.jsx in main.jsx

**And** NO `useNavigationContext()` hook MUST exist

**And** ALL state MUST be managed in App.jsx with useState

### Requirement: No React Router

**ID**: `SM-007`  
**Priority**: Critical

The application MUST NOT use React Router for navigation flow.

#### Scenario: Remove React Router dependency

**Given** the old architecture used react-router-dom  
**When** refactoring to simplified architecture  
**Then** `react-router-dom` MUST be removed from package.json

**And** `src/router.jsx` MUST be deleted

**And** NO `<RouterProvider>` or `<BrowserRouter>` MUST exist in main.jsx

**And** NO `useNavigate()` or `useLocation()` hooks MUST be used

**And** NO URL routing (e.g., `/welcome`, `/navigate`) MUST exist

#### Scenario: Conditional rendering replaces routing

**Given** the application needs to show different screens  
**When** implementing screen transitions  
**Then** conditional rendering based on `navState` MUST be used:

```js
{
  navState === "welcome" && <WelcomeOverlay />;
}
```

**And** NO `<Route>` components MUST be used

**And** URL MUST remain at root `/` throughout the session

## MODIFIED Requirements

### Requirement: State Machine Simplification

**ID**: `NAV-001` (from `navigation-routing` spec)  
**Change**: Reduce from complex state machine to 5 simple states

The navigation state machine MUST be simplified from a complex useReducer-based system to a simple sequential flow managed by useState in App.jsx.

#### Scenario: Sequential state transitions

**Given** the application is initialized with `navState = 'gps-permission'`  
**When** the user progresses through navigation  
**Then** state MUST transition through exactly these states in order:

```
gps-permission → welcome → orientation-permission → navigating → arrived
```

**And** the only backward transition allowed MUST be `arrived` → `welcome`

**And** NO state history tracking MUST exist

#### Scenario: Direct useState management replaces Context

**Given** the old architecture used NavigationContext with useReducer  
**When** implementing simplified state management  
**Then** the application MUST use `const [navState, setNavState] = useState('gps-permission')` in App.jsx

**And** NO Context Provider MUST wrap the application

**And** NO reducer functions or action creators MUST exist

**Removed functionality**:

- State history tracking
- Transition validation logic
- Complex state machine abstractions
- useNavigationState hook
- NavigationContext

**Added functionality**:

- Direct useState management
- Inline transition functions (e.g., `setNavState('welcome')`)
- Simple state value validation

## REMOVED Requirements

### Requirement: NavigationContext Provider

**ID**: `SM-OLD-001` (hypothetical)  
**Reason**: Eliminates unnecessary Context API complexity

**Removed functionality**:

- `NavigationProvider` component wrapping App
- `useNavigationContext()` hook for accessing state
- Context-based state sharing across components

**Replacement**: Direct prop passing from App.jsx to inline overlay components

### Requirement: React Router Integration

**ID**: `SM-OLD-002` (hypothetical)  
**Reason**: URL routing unnecessary for single-page navigation app

**Removed functionality**:

- `createBrowserRouter()` configuration
- `<RouterProvider>` wrapper
- `useNavigate()` for programmatic navigation
- `useLocation()` for current route detection
- URL-based routing (e.g., `/navigate`, `/arrived`)

**Replacement**: Conditional rendering with `navState` variable

### Requirement: Separate Page Components

**ID**: `SM-OLD-003` (hypothetical)  
**Reason**: Reduces file count, simplifies structure

**Removed files**:

- `src/pages/GpsPermissionPage.jsx`
- `src/pages/WelcomePage.jsx`
- `src/pages/NavigatePage.jsx`
- `src/pages/ArrivedPage.jsx`
- `src/pages/ExitCompletePage.jsx`

**Replacement**: Inline overlay components in App.jsx (5 function definitions)

### Requirement: useNavigationState Hook

**ID**: `SM-OLD-004` (hypothetical)  
**Reason**: Over-engineered for simple state machine

**Removed functionality**:

- Custom hook for state machine management
- Transition validation logic
- State history tracking
- Complex transition functions

**Replacement**: Direct `useState('gps-permission')` and `setNavState()` calls

## Implementation Notes

### State Machine Flow Diagram

```
┌─────────────────┐
│ gps-permission  │ (Initial state)
└────────┬────────┘
         │ GPS granted
         ▼
┌─────────────────┐
│    welcome      │ (Destination selection)
└────────┬────────┘
         │ Destination selected
         ▼
┌──────────────────────┐
│ orientation-permission│ (Compass access)
└────────┬──────────────┘
         │ Orientation granted
         ▼
┌─────────────────┐
│   navigating    │ (Active navigation)
└────────┬────────┘
         │ Distance < 20m
         ▼
┌─────────────────┐
│    arrived      │ (Arrival screen)
└────────┬────────┘
         │ Navigate Again
         └──────────► (back to welcome)
```

### Props Passing Pattern

All state and functions passed as props to inline components:

```js
<NavigationOverlay
  map={map}
  userLocation={userLocation}
  destination={destination}
  deviceOrientation={deviceOrientation}
  onArrival={() => setNavState("arrived")}
/>
```

**Advantages**:

- Explicit data flow (no hidden Context)
- Easy to trace state changes
- No prop drilling (only 1 level deep)

### Performance Considerations

- No Context re-render issues (Context triggers re-renders of all consumers)
- No React Router overhead (no route matching, history management)
- Simpler React component tree (fewer wrapper components)

### Code Reduction

- Remove `NavigationContext.jsx` (~60 LOC)
- Remove `router.jsx` (~30 LOC)
- Remove 5 page files (~150 LOC total)
- Add inline components (~100 LOC in App.jsx)
- **Net reduction: ~140 LOC**

## Related Specs

- `maplibre-integration` - Map instance managed in App.jsx state
- `hooks-architecture` - Hooks return values used in App.jsx
- `navigation-routing` - Modified to remove state machine complexity

## References

- [React useState Hook](https://react.dev/reference/react/useState)
- [Conditional Rendering in React](https://react.dev/learn/conditional-rendering)
- CLAUDE.md KISS principle: "Prefer direct solutions over abstractions"
