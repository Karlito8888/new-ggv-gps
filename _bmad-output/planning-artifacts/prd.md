---
stepsCompleted:
  [
    "step-01-init",
    "step-02-discovery",
    "step-02b-vision",
    "step-02c-executive-summary",
    "step-03-success",
    "step-04-journeys",
    "step-05-domain",
    "step-06-innovation",
    "step-07-project-type",
    "step-08-scoping",
    "step-09-functional",
    "step-10-nonfunctional",
    "step-11-polish",
    "step-e-01-discovery",
    "step-e-02-review",
    "step-e-03-edit",
  ]
lastEdited: "2026-02-19"
editHistory:
  - date: "2026-02-19"
    changes: "Removed implementation leakage from FRs (12 fixes), added Village Exit user journey (Journey 5), added accessibility section, enriched Journey 1 with map style switching, fixed arrival threshold 20m→12m to match codebase, fixed subjective adjective in FR22"
  - date: "2026-02-19"
    changes: "Moved Implementation Considerations to Technical Context appendix, cleaned implementation references from Risk Mitigation table, tightened FR32 with deployment trigger"
inputDocuments:
  - CLAUDE.md
  - indexed-sleeping-dawn.md
documentCounts:
  briefs: 0
  research: 0
  projectDocs: 2
  brainstorming: 0
workflowType: "prd"
projectType: "brownfield"
classification:
  projectType: "web_app"
  subType: "PWA"
  domain: "general"
  complexity: "low"
  projectContext: "brownfield"
  hosting:
    current: "Netlify (free tier)"
    target: "Hostinger (paid web hosting)"
  dataPrivacy: "100% client-side, no server data"
  users: "1000+"
  targetDevice: "Low-end Android smartphones, 3G cellular"
  geography: "Garden Grove Village, Philippines"
vision:
  statement: "MyGGV GPS is the official navigation system for Garden Grove Village — the only tool capable of guiding precisely to any of the ~2500 lots in the village, where Google Maps and Waze are blind."
  differentiator: "Hand-built cadastral cartography of all ~50 blocks and ~2500 lots, accessible via a single QR code scan at the village entrance. Zero friction, zero app install — PWA scan-and-go."
  coreInsight: "Mainstream navigation solutions fail in closed/poorly-referenced residential communities. Value comes from hyper-local cadastral data (blocks + lots) that nobody else has."
  userJourney: "Visitor arrives → scans QR code at entrance → selects block → selects lot → gets guided → arrives without asking for directions"
  future: "Rock-solid performance + usage analytics dashboard (who uses the app, when, most requested blocks/lots, real-time view)"
  problemSolved: "No street signage inside the village. Even residents get lost. Google Maps/Waze have incorrect/missing street references."
  dataSource: "Cadastral plan manually mapped to OpenStreetMap, blocks and lots stored in Supabase"
---

# Product Requirements Document - MyGGV GPS

**Author:** Charles
**Date:** 2026-02-19
**Version:** v3.0.0 (Performance Refactoring)

## Executive Summary

MyGGV GPS is a Progressive Web App that serves as the sole navigation system for Garden Grove Village, a residential community in the Philippines with ~50 blocks and ~2,500 lots. Mainstream navigation tools (Google Maps, Waze) fail here — streets are poorly referenced and no signage exists inside the village. Visitors and residents alike get lost regularly.

The app is accessed by scanning a QR code at the village entrance — no app install required. Users select a block, then a lot, and turn-by-turn navigation begins immediately using MapLibre GL JS with OSRM routing. All cartographic data was manually built from the village's cadastral plan and mapped onto OpenStreetMap, with block/lot data stored in Supabase.

Currently in production (v2.2.3) with 1,000+ active users, the app works but suffers from slow initial load times — critical given that the majority of users are on low-end Android smartphones with weak 3G cellular connections. This PRD defines the requirements for a performance-focused refactoring: aggressive offline caching via Service Worker (Workbox), self-hosted map assets (style, fonts, tiles), architecture cleanup (TypeScript migration, component extraction), and migration from Netlify (free tier) to Hostinger (paid hosting).

No new user-facing features are planned. The goal is to make the existing experience **fast, reliable, and rock-solid** on the worst network conditions the Philippines can throw at it. A secondary objective is adding usage analytics for the project owner.

### What Makes This Special

MyGGV GPS exists because no other solution can. The village's ~2,500 lots are invisible to every major mapping platform. The entire cartographic dataset was hand-built from cadastral records — this hyper-local data is the product's irreplaceable moat. Combined with zero-friction PWA access via QR code (no download, no signup, no login), the app delivers immediate value at the exact moment a visitor needs it: standing at the village gate, looking for Lot 23 in Block 47.

## Project Classification

| Attribute             | Value                                                                               |
| --------------------- | ----------------------------------------------------------------------------------- |
| **Project Type**      | Progressive Web App (PWA) — static hosting                                          |
| **Domain**            | Community navigation (hyper-local)                                                  |
| **Complexity**        | Low — no backend processing, no personal data on server, no compliance requirements |
| **Project Context**   | Brownfield — production app, v2.2.3, 1,000+ users                                   |
| **Current Hosting**   | Netlify (free tier)                                                                 |
| **Target Hosting**    | Hostinger (paid web hosting plan)                                                   |
| **Data Architecture** | GPS 100% client-side, block/lot data from Supabase, no user data collected          |
| **Target Devices**    | Low-end Android smartphones, 3G cellular (Philippines)                              |

## Success Criteria

### User Success

- **Map loads in under 5 seconds on 3G** (first visit) and **under 2 seconds on subsequent visits** (cached via Service Worker). See NFR1-NFR4 for detailed performance targets.
- **100% offline navigation** after first visit — map, tiles, fonts, and styles all cached
- **Zero disruption to existing user experience** — QR scan → block → lot → navigate flow remains identical
- Navigation accuracy unchanged: arrival detection (<12m), deviation detection (>25m), route recalculation all working

### Business Success

- **Visitor analytics**: daily, weekly, monthly, and yearly visit counts via Supabase
- Data collected: number of sessions, timestamp, most requested blocks/lots (anonymized, no personal data)

### Technical Success

- **Hosting migration**: app runs on Hostinger without defects
- **TypeScript migration**: all source files converted to `.ts`/`.tsx` with strict mode
- **Architecture cleanup**: App.jsx reduced from 1,055 lines to ~200 lines via overlay extraction
- **Service Worker**: Workbox-generated SW replaces manual `sw.js` with aggressive precaching
- **Self-hosted map assets**: style.json, fonts, and village tiles served locally
- **Code quality**: ESLint + TypeScript type-check pass on all files
- **Test coverage**: unit tests on pure functions (geo.ts) and critical hooks

### Measurable Outcomes

| Metric                    | Current                   | Target                     |
| ------------------------- | ------------------------- | -------------------------- |
| First visit map load (3G) | 10-15s+                   | < 5s                       |
| Repeat visit map load     | 3-5s                      | < 2s                       |
| Offline capability        | Partial (HTML only)       | Full (map + tiles + fonts) |
| App.jsx lines             | 1,055                     | ~200                       |
| TypeScript coverage       | 0%                        | 100%                       |
| Automated tests           | 0                         | Core functions covered     |
| Hosting uptime            | Unreliable (Netlify free) | Stable (Hostinger paid)    |

## User Journeys

### Journey 1: Marco the Delivery Rider — Happy Path

Marco is a Lalamove rider delivering a package to Lot 23, Block 47 in Garden Grove Village. He's never been here before. The village has no street signs, no visible lot numbers, and the streets look identical.

**Opening Scene:** Marco arrives at the village gate on his motorcycle. He has 3 more deliveries after this one — time is money. He spots the QR code posted at the entrance.

**Rising Action:** He scans the QR code with his phone camera — a budget Vivo on Globe 3G. The PWA loads. No app to install, no signup. He sees the Welcome screen, selects Block 47 from the list, then Lot 23. The map appears with a blue route line.

**Climax:** Turn-by-turn navigation guides him through the village's winding streets. He switches to satellite view to better identify lot boundaries in the dense neighborhood. He takes a wrong turn — the app detects he's >25m off-route and automatically recalculates. Within seconds, a new route appears.

**Resolution:** The app announces arrival when he's within 12m of Lot 23. He delivers the package in under 4 minutes. He didn't ask a single person for directions.

**Capabilities revealed:** QR code entry, block/lot selection, route calculation (OSRM), deviation detection + auto-recalculation, arrival detection, map style switching (satellite view to identify lot boundaries), fast map loading on 3G.

### Journey 2: Marco the Delivery Rider — Slow Network / Error Recovery

Same Marco, but today his 3G signal is weak — 1 bar.

**Opening Scene:** Marco scans the QR code. The PWA loads slowly.

**Rising Action (Current — Before Refactoring):** 15 seconds pass. The screen is mostly blank. Marco gets impatient, considers closing the tab. Finally the map loads with labels appearing as fonts download.

**Rising Action (Target — After Refactoring):** Marco has been here before last week. The Service Worker has cached everything. Map loads in under 2 seconds — tiles, fonts, style all local. Even if his signal drops completely, the village map is fully available offline.

**Climax:** OSRM routing fails due to network timeout. The app falls back to a direct line to the destination — not perfect, but enough to see the general direction. When signal returns briefly, the route auto-recalculates with proper turn-by-turn.

**Resolution:** Marco arrives, slightly slower than usual, but without getting lost. The app worked despite terrible connectivity.

**Capabilities revealed:** Offline-first architecture, SW precaching, cascading routing fallback (OSRM → direct line), resilience to intermittent connectivity.

### Journey 3: Ate Lina the Resident — Guiding a Visitor

Ate Lina lives in Block 12, Lot 8. Her niece is visiting from Manila and has never been to Garden Grove Village.

**Opening Scene:** Ate Lina calls her niece: "When you get to the gate, look for the QR code sign. Scan it with your phone, choose Block 12, then Lot 8. It will show you the way."

**Rising Action:** The niece arrives at the gate, scans the QR code on her iPhone. GPS permission prompt appears — she grants it. She selects Block 12, then Lot 8. The orientation permission prompt appears (iOS requires explicit permission) — she grants it.

**Climax:** The navigation guides her through the village with compass heading. She walks confidently instead of calling Ate Lina every 30 seconds for directions.

**Resolution:** The app shows "You have arrived" at Ate Lina's door. The niece didn't need to call once after entering the village.

**Capabilities revealed:** iOS permission flow (GPS + DeviceOrientation), pedestrian navigation, word-of-mouth discovery model (resident tells visitor about QR code).

### Journey 4: Charles the Admin — Maintenance & Monitoring

Charles maintains the app and manages the village mapping data.

**Opening Scene:** A new block (Block 51) has been added to the village expansion. Charles needs to add it to the system.

**Rising Action:** Charles opens the Supabase dashboard, adds the new block's polygon coordinates from the cadastral plan update. He adds the lot subdivisions within Block 51. The app's `fetchBlocks` function picks up the new data automatically on next load — no code deployment needed.

**Climax (Post-MVP with Analytics):** Charles opens his analytics view. He sees that Block 47 receives 40% of all navigation requests. He notices usage spikes on weekday mornings (delivery riders) and Sunday afternoons (family visitors).

**Resolution:** Charles uses these insights to prioritize which blocks need the most accurate lot data, and reports usage stats to the village HOA to justify the QR code signage.

**Capabilities revealed:** Data store management (no code deploy for data updates), analytics dashboard (post-MVP), data-driven decision making.

### Journey 5: Marco the Delivery Rider — Leaving the Village

Marco has finished his delivery to Lot 23, Block 47. Now he needs to exit the village quickly to continue his next delivery route.

**Opening Scene:** Marco is standing at Lot 23 after the arrival confirmation. The app shows a "Navigate Again" button and an "Exit Village" button.

**Rising Action:** Marco taps "Exit Village." The app sets the village main gate as the new destination and calculates a route from his current position to the exit point.

**Climax:** Turn-by-turn navigation guides Marco back through the winding streets toward the main gate. The route is different from how he came in — the app calculates the shortest path to the exit.

**Resolution:** The app detects Marco is within 12m of the village gate and confirms departure. The exit flow completes, and the app resets to the welcome screen — ready for the next visitor who scans the QR code.

**Capabilities revealed:** Village exit navigation, exit point routing, departure confirmation, app state reset after exit.

### Journey Requirements Summary

| Journey              | Key Capabilities Required                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Marco — Happy Path   | QR entry, block/lot selection, OSRM routing, deviation detection, arrival detection, map style switching, fast 3G load |
| Marco — Slow Network | Offline-first caching, precached tiles/fonts/style, routing fallback cascade, network resilience                       |
| Ate Lina's Niece     | iOS permission flows (GPS + orientation), pedestrian navigation, zero-install PWA                                      |
| Charles — Admin      | Data store management, analytics dashboard, usage monitoring                                                           |
| Marco — Village Exit | Village exit navigation, exit point routing, departure confirmation, app state reset                                   |

All existing capabilities (routing, deviation, arrival, permissions) are already implemented. The refactoring focuses on Journey 2 (offline/performance) and Journey 4 (analytics). Journey 5 documents an existing feature (village exit flow).

## PWA / Web App Specific Requirements

### Access Modes

- **Visitors (primary):** Browser-based via QR code scan — no install, no signup
- **Residents (secondary):** Installed PWA via "Add to Home Screen" — persistent access, offline-first benefit

### Browser Support Matrix

| Browser          | Platform | Priority  | Notes                                               |
| ---------------- | -------- | --------- | --------------------------------------------------- |
| Chrome           | Android  | Primary   | ~80% of users (delivery riders, budget smartphones) |
| Safari           | iOS 13+  | Secondary | Requires explicit DeviceOrientation permission      |
| Samsung Internet | Android  | Tertiary  | Common on Samsung budget phones in PH               |

**Not supported:** Desktop browsers, Firefox mobile, older iOS (<13).

### PWA Configuration

- **Manifest:** `display: standalone`, `orientation: portrait`, village-branded icon
- **Service Worker:** Workbox-generated, precaches all critical assets at install
- **Offline strategy:**
  - Static assets (JS/CSS/HTML): CacheFirst (precached at install)
  - Map style + fonts: CacheFirst (self-hosted, precached)
  - Map tiles (village bounds z12-z18): CacheFirst (background precache on first visit)
  - OSRM routing API: NetworkFirst with direct-line fallback
  - Supabase blocks/lots data: StaleWhileRevalidate (cached but refreshed when online)
- **Add to Home Screen:** Supported and encouraged for residents via install prompt
- **SEO:** None required. Access exclusively via QR code. `robots.txt` disallows all crawlers.

### Accessibility

- **Target level:** WCAG 2.1 Level A for core navigation flow (GPS permission → destination selection → navigation → arrival)
- **Rationale:** The app is a mobile-first GPS navigation tool used outdoors on smartphones. Full WCAG AA compliance is out of scope given the inherently visual nature of map-based navigation. Level A ensures basic accessibility: text alternatives for non-text content, meaningful sequence, and sufficient color contrast on UI controls.
- **In scope:** Semantic HTML structure, touch target sizes (minimum 44x44px), readable text contrast on overlays, screen reader labels on interactive controls
- **Out of scope:** Full screen reader navigation of the map canvas (MapLibre GL renders to canvas, which has inherent accessibility limitations)

## Project Scoping & Phased Development

### Strategy

**Approach:** Optimization MVP — improve the existing validated product without breaking it.

**Resource:** Solo developer (Charles), amateur level, with AI-assisted development (Claude Code).

**Core Principle:** Ship each phase independently. Each phase must leave the app in a working, deployable state. Never break production for users.

### Phase 1: Performance & Hosting (Ship First)

**Core Journey Supported:** Marco — Slow Network (Journey 2)

| Capability                        | Why It's Must-Have                                 |
| --------------------------------- | -------------------------------------------------- |
| Workbox Service Worker            | Replaces broken manual SW, enables real offline    |
| Self-hosted style.json            | Eliminates blocking network fetch on every startup |
| Self-hosted MapLibre fonts        | Eliminates external font dependency for map labels |
| Village tile precaching (z12-z18) | 100% offline map after first visit                 |
| Hostinger deployment              | Replaces unreliable Netlify free tier              |

**Explicitly NOT in Phase 1:** TypeScript, App.jsx refactoring, analytics, tests/CI.

**Validation:** Map loads < 5s on 3G first visit, < 2s cached. Offline navigation works. Zero regression.

### Phase 2: Architecture Cleanup

**Depends on:** Phase 1 complete and stable in production.

| Capability                       | Why Now                                |
| -------------------------------- | -------------------------------------- |
| Extract 6 overlay components     | App.jsx unmanageable at 1,055 lines    |
| Deduplicate fetchBlocks          | Same logic in 2 places = bug risk      |
| TypeScript migration (all files) | Type safety before adding new features |
| CSS refactoring                  | Reduce ~400 lines of duplication       |

**Validation:** `bun run lint` + `bun run build` pass. App behavior identical to Phase 1.

### Phase 3: Quality & Analytics (Growth)

**Depends on:** Phase 2 complete (clean TypeScript codebase).

| Capability                          | Why                                                    |
| ----------------------------------- | ------------------------------------------------------ |
| Visitor analytics (Supabase)        | Charles needs usage data (daily/weekly/monthly/yearly) |
| Unit tests (geo.ts, critical hooks) | Safety net for future changes                          |
| CI/CD (GitHub Actions)              | Automated lint + typecheck + test + build              |

**Validation:** Analytics data visible in Supabase dashboard. Tests pass. CI pipeline green.

### Phase 4: Vision (Future — No Timeline)

- Real-time usage dashboard
- Additional POI categories
- Multi-village support (template the solution for other communities)
- Offline-first with background sync for analytics

### Risk Mitigation

| Risk                                            | Mitigation                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Breaking production during refactoring          | Ship each phase independently. Test on real device. Git tags for instant rollback.                                             |
| New offline caching conflicts with existing one | Remove existing cache layer completely before adding new one. Clean transition with automatic activation on new deployment.    |
| Target hosting performance worse than CDN       | Self-hosted assets + aggressive offline caching reduces server dependency. Keep current hosting as fallback during transition. |
| Solo amateur developer                          | AI-assisted development. Each phase independently shippable. No external dependency.                                           |

## Functional Requirements

### Map Display & Interaction

- **FR1:** Users can view an interactive map of Garden Grove Village with labeled blocks and lots
- **FR2:** Users can pan, zoom, and interact with the map on touch devices
- **FR3:** Users can see their real-time GPS position on the map
- **FR4:** Users can see their heading direction on the map (compass)
- **FR5:** Users can switch between OSM and satellite map styles
- **FR6:** The system displays block polygon boundaries with distinct visual styling
- **FR7:** The system displays lot markers within each block

### Destination Selection

- **FR8:** Users can select a destination block from a list of all village blocks
- **FR9:** Users can select a specific lot within a chosen block
- **FR10:** The system loads block and lot data from the data store at startup
- **FR11:** The system displays the selected destination on the map

### Navigation & Routing

- **FR12:** The system calculates a route from the user's GPS position to the selected destination
- **FR13:** The system displays the calculated route as a visual line on the map
- **FR14:** The system provides turn-by-turn navigation instructions
- **FR15:** The system detects when the user deviates >25m from the route and automatically recalculates
- **FR16:** The system detects arrival when the user is within 12m of the destination
- **FR17:** The system falls back to a direct line when route calculation fails (network error)
- **FR18:** Users can follow a compass bearing toward their destination
- **FR19:** The system animates the camera to follow the user during navigation

### Device Permissions

- **FR20:** The system requests GPS permission and guides the user through the grant flow
- **FR21:** The system requests device orientation permission on iOS 13+ devices
- **FR22:** The system detects previously-denied GPS permission and displays a re-enable prompt with instructions to open device settings

### Offline & Performance (NEW — Phase 1)

- **FR23:** The system precaches all critical static assets (JS, CSS, HTML) via offline caching on first visit
- **FR24:** The system serves the map style from local self-hosted files (no external fetch required)
- **FR25:** The system serves map fonts from local self-hosted files (no external fetch required)
- **FR26:** The system background-precaches village map tiles at navigation-relevant zoom levels after first visit
- **FR27:** The system displays the full village map offline after initial caching is complete
- **FR28:** The system serves cached block/lot data when the data store is unreachable
- **FR29:** The system serves cached data immediately and refreshes in background when connectivity returns

### PWA Experience (NEW — Phase 1)

- **FR30:** Residents can install the app to their home screen (Add to Home Screen)
- **FR31:** The system displays a standalone PWA experience when launched from home screen
- **FR32:** The system auto-updates its offline cache on new version deployment without user intervention

### Village Exit Flow

- **FR33:** Users can initiate a navigation to the village exit
- **FR34:** The system guides users to the village exit point and confirms departure

### Analytics & Monitoring (NEW — Phase 3)

- **FR35:** The system records anonymous navigation sessions to the analytics store (timestamp, destination block/lot)
- **FR36:** Charles (admin) can view daily, weekly, monthly, and yearly visitor counts
- **FR37:** Charles (admin) can view which blocks and lots are most requested

### Admin & Data Management

- **FR38:** Charles (admin) can add, update, or remove block data via the admin interface
- **FR39:** Charles (admin) can add, update, or remove lot data via the admin interface
- **FR40:** The system reflects data store changes on next app load without code deployment

## Non-Functional Requirements

### Performance

| NFR                                           | Metric                                | Target     | Measurement                       |
| --------------------------------------------- | ------------------------------------- | ---------- | --------------------------------- |
| **NFR1:** First paint on 3G                   | Time to first meaningful content      | < 3s       | Chrome DevTools, Slow 3G throttle |
| **NFR2:** Interactive map on 3G (first visit) | Time to interactive map with tiles    | < 5s       | Chrome DevTools, Slow 3G throttle |
| **NFR3:** Interactive map (cached)            | Time to interactive map from SW cache | < 2s       | Chrome DevTools, offline mode     |
| **NFR4:** Interactive map (installed PWA)     | Time to interactive from home screen  | < 1.5s     | Real device test                  |
| **NFR5:** Route calculation                   | OSRM API response time                | < 3s       | Network tab timing                |
| **NFR6:** JS bundle size (main)               | Gzipped index chunk                   | < 150 KB   | `bun run build` output            |
| **NFR7:** JS bundle size (maps)               | Gzipped maps chunk (lazy-loaded)      | < 300 KB   | `bun run build` output            |
| **NFR8:** Memory usage                        | Peak RAM during navigation            | < 150 MB   | Chrome DevTools Memory            |
| **NFR9:** GPS position update                 | Frequency of location tracking        | Every 1-3s | Device-dependent                  |

### Reliability & Offline

| NFR                             | Requirement                                           | Acceptance Criteria                                                               |
| ------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| **NFR10:** Offline map display  | Village map fully available offline after first visit | All tiles z12-z18 within village bounds cached and renderable                     |
| **NFR11:** Offline navigation   | Turn-by-turn works with cached route                  | Navigation continues offline if route was calculated while online                 |
| **NFR12:** SW update resilience | SW updates don't break active sessions                | New version activates immediately without requiring page reload during navigation |
| **NFR13:** Data freshness       | Block/lot data stays current                          | Serve cached data immediately, refresh from backend in background                 |
| **NFR14:** Crash recovery       | App recovers from unexpected state                    | Reload resets to GPS permission flow, no stuck states                             |
| **NFR15:** Zero data loss       | No user-facing data to lose                           | GPS is ephemeral, no user accounts, no saved state server-side                    |

### Integration Resilience

| NFR                           | External Service        | Failure Behavior                                                             |
| ----------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| **NFR16:** OSRM down          | router.project-osrm.org | Fall back to direct line (bearing to destination)                            |
| **NFR17:** Supabase down      | Supabase API            | Serve cached blocks/lots from SW cache                                       |
| **NFR18:** Tile server down   | openfreemap.org         | Serve cached tiles from SW cache (village bounds precached)                  |
| **NFR19:** Font server down   | N/A after Phase 1       | Fonts self-hosted, no external dependency                                    |
| **NFR20:** Style server down  | N/A after Phase 1       | Style self-hosted, no external dependency                                    |
| **NFR21:** Total network loss | All services            | Full offline navigation with cached map, tiles, blocks, and last-known route |

## Appendix: Technical Context (Brownfield Reference)

This appendix documents existing implementation context for the brownfield refactoring. These are **not requirements** — they describe the current technical state to inform architecture decisions.

### Current Implementation Notes

- **Navigation rendering:** Conditional rendering via state machine (6 screens), no client-side routing library
- **Server rendering:** Pure client-side SPA, no SSR/SSG
- **Viewport handling:** `100dvh` with fallbacks (`100svh`, `-webkit-fill-available`)
- **Input zoom prevention:** `font-size: 16px` minimum on all inputs (iOS Safari)
- **GPS permissions:** Handles both first-time grant and previously-denied scenarios
- **Orientation permissions:** iOS 13+ explicit permission request already implemented
