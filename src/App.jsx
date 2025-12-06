import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMapSetup } from "./hooks/useMapSetup";
import { useRouting } from "./hooks/useRouting";
import { useNavigation } from "./hooks/useNavigation";
import { getDistance } from "./lib/geo";
import { blocks } from "./data/blocks";
import { supabase } from "./lib/supabase";
import ggvLogo from "./assets/img/ggv.png";
import "./styles/index.css";

// Village exit coordinates (from CLAUDE.md)
const VILLAGE_EXIT = [120.951863, 14.35098];

/**
 * App Component
 *
 * Main application with 6-state navigation flow:
 * gps-permission → welcome → orientation-permission → navigating → arrived → exit-complete
 *
 * Uses direct MapLibre GL JS (no react-map-gl wrapper)
 * Uses inline overlay components (no separate page files)
 * Uses simple useState (no React Router, no Context)
 */
export default function App() {
  // Map container ref for MapLibre
  const mapContainerRef = useRef(null);

  // Navigation state machine (6 states)
  const [navState, setNavState] = useState("gps-permission");
  const [destination, setDestination] = useState(null);

  // Initialize map and GPS tracking
  const { map, userLocation, isMapReady, triggerGeolocate } = useMapSetup(mapContainerRef);

  // Calculate route when destination is selected
  const { steps } = useRouting(map, userLocation, destination);

  // Navigation logic (distance, arrival detection)
  const { distanceRemaining, hasArrived } = useNavigation(map, userLocation, destination);

  // Handle arrival
  useEffect(() => {
    if (hasArrived && navState === "navigating") {
      setNavState("arrived");
    }
  }, [hasArrived, navState]);

  // Track if we're currently navigating (used by orientation effect)
  const isNavigatingRef = useRef(false);
  isNavigatingRef.current = navState === "navigating";

  // Effect 1: Reset map to north-up when leaving navigation mode
  useEffect(() => {
    if (!map || !isMapReady) return;
    if (navState !== "navigating") {
      map.easeTo({ bearing: 0, pitch: 0, duration: 300 });
    }
  }, [navState, map, isMapReady]);

  // Effect 2: Setup orientation listeners (only recreated when map changes, not navState)
  useEffect(() => {
    if (!map || !isMapReady) return;

    // Throttle state for map rotation
    let lastBearing = 0;
    let lastUpdate = 0;
    const THROTTLE_MS = 250; // Max 4 updates/sec
    const MIN_DELTA = 3; // Ignore changes < 3 degrees

    // Track if user is interacting with the map (pan/zoom)
    let isUserInteracting = false;

    const onInteractionStart = () => {
      isUserInteracting = true;
    };
    const onInteractionEnd = () => {
      // Small delay before re-enabling rotation to avoid jank
      setTimeout(() => {
        isUserInteracting = false;
      }, 300);
    };

    map.on("dragstart", onInteractionStart);
    map.on("dragend", onInteractionEnd);
    map.on("zoomstart", onInteractionStart);
    map.on("zoomend", onInteractionEnd);

    // Detect platform once (iOS uses webkitCompassHeading, Android uses alpha)
    const isIOS =
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function";

    const handler = (e) => {
      // Only rotate map when navigating (check ref to avoid stale closure)
      if (!isNavigatingRef.current) return;

      // Skip rotation if user is panning/zooming
      if (isUserInteracting) return;

      // Calculate heading based on platform
      let heading;
      if (isIOS && e.webkitCompassHeading !== null && e.webkitCompassHeading !== undefined) {
        // iOS Safari: 0-360, 0=North, clockwise
        heading = e.webkitCompassHeading;
      } else if (!isIOS && e.alpha !== null) {
        // Android Chrome: 0-360, counter-clockwise - need to invert
        heading = (360 - e.alpha) % 360;
      } else {
        return;
      }

      // Throttle updates
      const now = Date.now();
      const bearingDelta = Math.abs(heading - lastBearing);
      // Handle wraparound (359° → 1° is only 2°, not 358°)
      const wrappedDelta = Math.min(bearingDelta, 360 - bearingDelta);

      if (now - lastUpdate < THROTTLE_MS && wrappedDelta < MIN_DELTA) {
        return;
      }

      lastBearing = heading;
      lastUpdate = now;

      // Use jumpTo for instant rotation (no animation = less GPU load)
      // Preserve pitch at 45° to avoid reset
      map.jumpTo({
        bearing: heading,
        pitch: 45,
      });
    };

    // Only add ONE listener per platform (prevents double-firing)
    const eventName = isIOS ? "deviceorientation" : "deviceorientationabsolute";
    window.addEventListener(eventName, handler);

    return () => {
      window.removeEventListener(eventName, handler);
      map.off("dragstart", onInteractionStart);
      map.off("dragend", onInteractionEnd);
      map.off("zoomstart", onInteractionStart);
      map.off("zoomend", onInteractionEnd);
    };
  }, [map, isMapReady]); // Note: no navState dependency - uses ref instead

  // Effect 3: Set initial navigation view when entering navigation mode
  useEffect(() => {
    if (!map || !isMapReady || navState !== "navigating") return;
    // Set initial navigation view: zoom in, pitch 45°
    map.easeTo({ pitch: 45, zoom: 18, duration: 500 });
  }, [navState, map, isMapReady]);

  return (
    <div className="app-container">
      {/* Map container - always rendered */}
      <div ref={mapContainerRef} className="map-container" />

      {/* GGV Logo - top center */}
      <img src={ggvLogo} alt="GGV" className="ggv-logo" />

      {/* Conditional overlays based on navState */}
      <AnimatePresence mode="wait">
        {navState === "gps-permission" && (
          <GPSPermissionOverlay
            key="gps-permission"
            onGrant={() => setNavState("welcome")}
            triggerGeolocate={triggerGeolocate}
          />
        )}

        {navState === "welcome" && (
          <WelcomeOverlay
            key="welcome"
            blocks={blocks}
            onSelectDestination={(dest) => {
              setDestination(dest);
              setNavState("orientation-permission");
            }}
          />
        )}

        {navState === "orientation-permission" && (
          <OrientationPermissionOverlay
            key="orientation-permission"
            onGrant={() => setNavState("navigating")}
          />
        )}

        {navState === "navigating" && (
          <NavigationOverlay
            key="navigating"
            map={map}
            distanceRemaining={distanceRemaining}
            destination={destination}
            steps={steps}
            userLocation={userLocation}
            onCancel={() => {
              setNavState("welcome");
              setDestination(null);
            }}
          />
        )}

        {navState === "arrived" && (
          <ArrivedOverlay
            key="arrived"
            destination={destination}
            onNavigateAgain={() => {
              setNavState("welcome");
              setDestination(null);
            }}
            onExitVillage={() => {
              setDestination({
                type: "exit",
                coordinates: VILLAGE_EXIT,
                name: "Village Exit",
              });
              setNavState("navigating");
            }}
          />
        )}

        {navState === "exit-complete" && (
          <ExitCompleteOverlay
            key="exit-complete"
            onReset={() => {
              setNavState("welcome");
              setDestination(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Inline Overlay Components
 * Following Framer Motion animation patterns from existing codebase
 */

// Animation variants (from src/lib/animations.js patterns)
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", damping: 25 },
  },
  exit: { scale: 0.8, opacity: 0 },
};

/**
 * GPS Permission Overlay
 *
 * First screen in the navigation flow. Requests native GPS permission via
 * MapLibre's GeolocateControl before allowing the user to proceed.
 *
 * Flow:
 * 1. User taps "Enable GPS" button
 * 2. triggerGeolocate() prompts native iOS/Android permission dialog
 * 3. If granted → onGrant() is called → proceeds to WelcomeOverlay
 * 4. If denied → error message displayed, user must enable in browser settings
 *
 * @param {Object} props
 * @param {() => void} props.onGrant - Callback when GPS permission is granted
 * @param {() => Promise<GeolocationPosition>} props.triggerGeolocate - Triggers native GPS permission request
 */
function GPSPermissionOverlay({ onGrant, triggerGeolocate }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(null);

  const handleEnableGPS = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      // Trigger the native GeolocateControl (requests permission + starts tracking)
      await triggerGeolocate();
      // Permission granted, proceed to welcome screen
      onGrant();
    } catch (err) {
      console.error("GPS permission error:", err);
      setError("Location access denied. Please enable in your browser settings.");
      setIsRequesting(false);
    }
  };

  return (
    <motion.div
      className="overlay gps-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="modal gps-modal" variants={modalVariants}>
        {/* GPS Icon with pulse animation */}
        <div className="gps-icon-wrapper">
          <svg
            className="gps-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          </svg>
        </div>

        <h1 className="gps-title">Enable Location</h1>
        <p className="gps-tagalog">(I-enable ang Lokasyon)</p>

        <p className="gps-description">
          MyGGV GPS needs your location to guide you through the village.
          <span className="tagalog-inline">
            Kailangan ng MyGGV GPS ang iyong lokasyon para gabayan ka sa village.
          </span>
        </p>

        {error && <div className="error-message">{error}</div>}

        <button className="gps-btn" onClick={handleEnableGPS} disabled={isRequesting}>
          <svg
            className="gps-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          {isRequesting ? "Requesting..." : "Enable GPS"}
        </button>
      </motion.div>
    </motion.div>
  );
}

function WelcomeOverlay({ blocks, onSelectDestination }) {
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedLot, setSelectedLot] = useState("");
  const [lots, setLots] = useState([]);
  const [isLoadingLots, setIsLoadingLots] = useState(false);

  // Fetch lots from Supabase when block changes
  useEffect(() => {
    if (!selectedBlock) {
      setLots([]);
      setSelectedLot("");
      return;
    }

    setIsLoadingLots(true);
    supabase.rpc("get_lots_by_block", { block_name: selectedBlock }).then(({ data, error }) => {
      if (error) {
        console.error("Error fetching lots:", error);
        setLots([]);
      } else if (data) {
        setLots(data);
        if (data.length > 0) {
          setSelectedLot(data[0].lot);
        }
      }
      setIsLoadingLots(false);
    });
  }, [selectedBlock]);

  const handleNavigate = () => {
    if (selectedBlock && selectedLot) {
      const lot = lots.find((l) => l.lot === selectedLot);
      if (lot?.coordinates) {
        // PostGIS returns GeoJSON: {type: "Point", coordinates: [lng, lat]}
        onSelectDestination({
          type: "lot",
          coordinates: [lot.coordinates.coordinates[0], lot.coordinates.coordinates[1]],
          name: `Block ${selectedBlock}, Lot ${selectedLot}`,
        });
      }
    }
  };

  return (
    <motion.div
      className="overlay welcome-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="modal welcome-modal" variants={modalVariants}>
        {/* Destination Icon */}
        <div className="welcome-icon-wrapper">
          <svg
            className="welcome-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>

        <h1 className="welcome-title">Choose Destination</h1>
        <p className="welcome-tagalog">(Pumili ng Destinasyon)</p>

        <div className="welcome-block-selector">
          <select
            id="block-select"
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="welcome-select"
          >
            <option value="" disabled>
              Select Block (Pumili ng Block)
            </option>
            {blocks
              .filter((block) => block.name && block.name.trim() !== "")
              .map((block) => (
                <option key={block.name} value={block.name}>
                  Block {block.name}
                </option>
              ))}
          </select>
        </div>

        <div className="welcome-block-selector">
          <select
            id="lot-select"
            value={selectedLot}
            onChange={(e) => setSelectedLot(e.target.value)}
            className="welcome-select"
            disabled={!selectedBlock || isLoadingLots || lots.length === 0}
          >
            <option value="" disabled>
              {isLoadingLots
                ? "Loading... (Nag-lo-load...)"
                : !selectedBlock
                  ? "Select a block first (Pumili muna ng Block)"
                  : lots.length === 0
                    ? "No lots available (Walang available na Lot)"
                    : "Select Lot (Pumili ng Lot)"}
            </option>
            {lots.map((l) => (
              <option key={l.lot} value={l.lot}>
                Lot {l.lot}
              </option>
            ))}
          </select>
        </div>

        <button
          className="welcome-btn"
          onClick={handleNavigate}
          disabled={!selectedBlock || !selectedLot || isLoadingLots}
        >
          <svg
            className="welcome-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Navigate
        </button>
      </motion.div>
    </motion.div>
  );
}

function OrientationPermissionOverlay({ onGrant }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(null);

  const handleRequest = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      // iOS 13+ requires explicit permission
      // https://developer.apple.com/documentation/safari-release-notes/safari-13-release-notes#Media
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === "granted") {
          onGrant();
        } else {
          setError("Permission denied. Please enable in Settings.");
        }
      } else {
        // Android doesn't need permission
        onGrant();
      }
    } catch (err) {
      console.error("Orientation permission error:", err);
      setError("Failed to request permission. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <motion.div
      className="overlay orientation-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="modal orientation-modal" variants={modalVariants}>
        {/* Compass Icon */}
        <div className="orientation-icon-wrapper">
          <svg
            className="orientation-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon
              points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
              fill="currentColor"
            />
          </svg>
        </div>

        <h1 className="orientation-title">Enable Compass</h1>
        <p className="orientation-tagalog">(I-enable ang Compass)</p>

        <p className="orientation-description">
          Enable device orientation for accurate compass heading during navigation.
          <span className="tagalog-inline">
            I-enable ang device orientation para sa tamang direksyon habang nag-navigate.
          </span>
        </p>

        {error && <div className="error-message">{error}</div>}

        <button className="orientation-btn" onClick={handleRequest} disabled={isRequesting}>
          <svg
            className="orientation-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon
              points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
              fill="currentColor"
            />
          </svg>
          {isRequesting ? "Requesting..." : "Enable Compass"}
        </button>
      </motion.div>
    </motion.div>
  );
}

// NavigationOverlay - memoized to prevent re-renders on every GPS update
const NavigationOverlay = memo(function NavigationOverlay({
  map,
  distanceRemaining,
  destination,
  steps,
  userLocation,
  onCancel,
}) {
  const formatDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

  // Memoize currentStep calculation (expensive: iterates steps + calculates distance)
  // Only recalculate when lat/lng change, not when other userLocation properties change
  const currentStep = useMemo(() => {
    if (!steps?.length || !userLocation) return null;

    for (const step of steps) {
      if (!step.location) continue;
      const dist = getDistance(
        userLocation.latitude,
        userLocation.longitude,
        step.location[1],
        step.location[0],
      );
      // Return first step that's within 200m and not yet passed
      if (dist < 200 && step.type !== "arrive") {
        return { ...step, distanceToStep: Math.round(dist) };
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, userLocation?.latitude, userLocation?.longitude]);

  // Memoize zoom handlers to prevent recreating on every render
  const handleZoomIn = useCallback(() => {
    if (map) {
      const currentZoom = map.getZoom();
      map.easeTo({ zoom: Math.min(currentZoom + 1, 20), duration: 200 });
    }
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (map) {
      const currentZoom = map.getZoom();
      map.easeTo({ zoom: Math.max(currentZoom - 1, 14), duration: 200 });
    }
  }, [map]);

  return (
    <motion.div
      className="navigation-overlay"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
    >
      <div className="nav-header-compact">
        {/* Turn instruction (left) */}
        <div className="nav-turn">
          {currentStep ? (
            <>
              <span className="nav-turn-icon">{currentStep.icon}</span>
              <span className="nav-turn-dist">{currentStep.distanceToStep}m</span>
            </>
          ) : (
            <span className="nav-turn-icon">↑</span>
          )}
        </div>

        {/* Destination + distance (center) */}
        <div className="nav-center">
          <div className="nav-dest-name">{destination?.name || "Navigating..."}</div>
          <div className="nav-remaining">{formatDistance(distanceRemaining)}</div>
        </div>

        {/* Cancel button (right) */}
        <button className="nav-cancel-btn" onClick={onCancel} aria-label="Stop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Map controls */}
      <div className="nav-map-controls">
        <button className="map-control-btn" onClick={handleZoomIn} aria-label="Zoom in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button className="map-control-btn" onClick={handleZoomOut} aria-label="Zoom out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
});

function ArrivedOverlay({ destination, onNavigateAgain, onExitVillage }) {
  return (
    <motion.div
      className="overlay arrived-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="modal arrived-modal" variants={modalVariants}>
        {/* Success Icon */}
        <div className="arrived-icon-wrapper">
          <svg
            className="arrived-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 className="arrived-title">You've Arrived!</h1>
        <p className="arrived-tagalog">(Nakarating ka na!)</p>

        <p className="arrived-description">
          You have reached <strong>{destination?.name || "your destination"}</strong>.
          <span className="tagalog-inline">
            Nakarating ka na sa {destination?.name || "iyong destinasyon"}.
          </span>
        </p>

        <button className="arrived-btn" onClick={onNavigateAgain}>
          <svg
            className="arrived-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Navigate Somewhere Else
        </button>

        <button className="arrived-btn-secondary" onClick={onExitVillage}>
          <svg
            className="arrived-exit-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Exit Village
        </button>
      </motion.div>
    </motion.div>
  );
}

function ExitCompleteOverlay({ onReset }) {
  return (
    <motion.div
      className="overlay exit-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="modal exit-modal" variants={modalVariants}>
        {/* Wave Icon */}
        <div className="exit-icon-wrapper">
          <svg
            className="exit-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
        </div>

        <h1 className="exit-title">Safe Travels!</h1>
        <p className="exit-tagalog">(Ingat sa byahe!)</p>

        <p className="exit-description">
          You have exited Garden Grove Village. Thank you for using MyGGV GPS!
          <span className="tagalog-inline">
            Lumabas ka na sa Garden Grove Village. Salamat sa paggamit ng MyGGV GPS!
          </span>
        </p>

        <button className="exit-btn" onClick={onReset}>
          <svg
            className="exit-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Start New Navigation
        </button>
      </motion.div>
    </motion.div>
  );
}
