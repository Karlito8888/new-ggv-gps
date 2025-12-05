## ADDED Requirements

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
- **AND** existing map layers (routes, markers) remain visible

#### Scenario: GPS tracking continues across routes

- **WHEN** user is on `/navigate` and page refreshes
- **THEN** the GeolocateControl resumes tracking after permission
- **AND** the route is restored from URL parameters

---

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

Routes SHALL validate required state and redirect appropriately when prerequisites are not met.

#### Scenario: Navigate without GPS redirects

- **WHEN** user directly accesses `/navigate` without GPS permission
- **THEN** the application redirects to `/`
- **AND** GPS permission is requested

#### Scenario: Arrived without destination redirects

- **WHEN** user directly accesses `/arrived` without valid destination
- **THEN** the application redirects to `/welcome`
