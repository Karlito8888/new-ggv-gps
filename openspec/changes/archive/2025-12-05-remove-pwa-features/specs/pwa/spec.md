# PWA Features Specification

## REMOVED Requirements

### Requirement: Progressive Web App Installation
**Reason**: Project is transitioning to web-only version without installability features.
**Migration**: Users should access the application via web browser directly.

The system SHALL NOT provide PWA installation capabilities.

#### Scenario: User attempts to install app
- **WHEN** user visits the application
- **THEN** no install prompt is displayed
- **AND** app is not installable to home screen

---

### Requirement: Offline Tile Caching
**Reason**: Offline functionality removed to simplify architecture.
**Migration**: Users must have internet connection to view map tiles.

The system SHALL NOT cache map tiles for offline use.

#### Scenario: User loses internet connection
- **WHEN** user loses network connectivity
- **THEN** map tiles will not load
- **AND** application displays connection error

---

### Requirement: Service Worker Background Updates
**Reason**: No service worker means no background update capability.
**Migration**: Users will receive updates on page refresh.

The system SHALL NOT register a service worker for background updates.

#### Scenario: New version is deployed
- **WHEN** a new version of the application is deployed
- **THEN** users receive updates only after full page refresh
- **AND** no automatic background update occurs

---

### Requirement: Offline API Response Caching
**Reason**: Workbox caching strategies removed with PWA.
**Migration**: All API calls require active internet connection.

The system SHALL NOT cache Supabase API responses for offline access.

#### Scenario: User accesses location data offline
- **WHEN** user attempts to load locations without internet
- **THEN** API call fails
- **AND** appropriate error is displayed

---

### Requirement: PWA Manifest Generation
**Reason**: No manifest needed for web-only version.
**Migration**: None required.

The system SHALL NOT generate a web app manifest file.

#### Scenario: Browser requests manifest
- **WHEN** browser looks for manifest.json
- **THEN** no manifest file is served
- **AND** PWA installation is not possible
