import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMapSetup } from "./hooks/useMapSetup";
import { useRouting } from "./hooks/useRouting";
import { useNavigation } from "./hooks/useNavigation";
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
  const [deviceOrientation, setDeviceOrientation] = useState(null);

  // Initialize map and GPS tracking
  const { map, userLocation, isMapReady, triggerGeolocate } = useMapSetup(mapContainerRef);

  // Calculate route when destination is selected
  useRouting(map, userLocation, destination);

  // Navigation logic (bearing, arrival detection)
  const { bearing, distanceRemaining, hasArrived } = useNavigation(map, userLocation, destination);

  // Handle arrival
  useEffect(() => {
    if (hasArrived && navState === "navigating") {
      setNavState("arrived");
    }
  }, [hasArrived, navState]);

  // Handle device orientation AND map rotation (heading-up navigation)
  useEffect(() => {
    if (!map || !isMapReady) return;

    // Reset to north-up when not navigating
    if (navState !== "navigating") {
      map.easeTo({ bearing: 0, pitch: 0, duration: 300 });
      return;
    }

    // Set initial navigation view: zoom in, pitch 45°, center on user
    if (userLocation) {
      map.easeTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 18,
        pitch: 45,
        duration: 500,
      });
    } else {
      map.easeTo({ pitch: 45, zoom: 18, duration: 500 });
    }

    // Throttle state for map rotation
    let lastBearing = 0;
    let lastUpdate = 0;
    const THROTTLE_MS = 100; // Max 10 updates/sec
    const MIN_DELTA = 2; // Ignore changes < 2 degrees

    const handler = (e) => {
      // Calculate heading (iOS vs Android)
      let heading;
      if (e.webkitCompassHeading !== null && e.webkitCompassHeading !== undefined) {
        // iOS Safari: 0-360, 0=North, clockwise
        heading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Android Chrome: 0-360, counter-clockwise - need to invert
        heading = (360 - e.alpha) % 360;
      } else {
        return;
      }

      // Update state for UI compass in NavigationOverlay
      setDeviceOrientation({
        alpha: e.alpha || 0,
        webkitHeading: e.webkitCompassHeading || null,
      });

      // Throttle map rotation updates
      const now = Date.now();
      const bearingDelta = Math.abs(heading - lastBearing);
      // Handle wraparound (359° → 1° is only 2°, not 358°)
      const wrappedDelta = Math.min(bearingDelta, 360 - bearingDelta);

      if (now - lastUpdate < THROTTLE_MS && wrappedDelta < MIN_DELTA) {
        return;
      }

      lastBearing = heading;
      lastUpdate = now;

      // Rotate map smoothly to follow device heading
      map.easeTo({
        bearing: heading,
        duration: 100,
        easing: (t) => t, // Linear for continuous motion
      });
    };

    window.addEventListener("deviceorientationabsolute", handler);
    window.addEventListener("deviceorientation", handler);

    return () => {
      window.removeEventListener("deviceorientationabsolute", handler);
      window.removeEventListener("deviceorientation", handler);
      // Reset map orientation on cleanup
      if (map) {
        map.easeTo({ bearing: 0, pitch: 0, duration: 300 });
      }
    };
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
            bearing={bearing}
            distanceRemaining={distanceRemaining}
            destination={destination}
            deviceOrientation={deviceOrientation}
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
            disabled={!selectedBlock || isLoadingLots}
          >
            <option value="" disabled>
              Select Lot (Pumili ng Lot)
            </option>
            {isLoadingLots ? (
              <option value="">Loading...</option>
            ) : (
              lots.map((l) => (
                <option key={l.lot} value={l.lot}>
                  Lot {l.lot}
                </option>
              ))
            )}
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

function NavigationOverlay({
  map,
  bearing,
  distanceRemaining,
  destination,
  deviceOrientation,
  onCancel,
}) {
  const formatDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
  const heading = deviceOrientation?.webkitHeading || deviceOrientation?.alpha || bearing;

  const handleZoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom();
      map.easeTo({ zoom: Math.min(currentZoom + 1, 20), duration: 200 });
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom();
      map.easeTo({ zoom: Math.max(currentZoom - 1, 14), duration: 200 });
    }
  };

  const handlePitchToggle = () => {
    if (map) {
      const currentPitch = map.getPitch();
      // Toggle between 0° (2D) and 45° (3D)
      const newPitch = currentPitch > 20 ? 0 : 45;
      map.easeTo({ pitch: newPitch, duration: 300 });
    }
  };

  return (
    <motion.div
      className="navigation-overlay"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
    >
      <div className="nav-header">
        <div className="nav-destination">
          <svg
            className="nav-destination-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          <h2>{destination?.name || "Navigating..."}</h2>
        </div>
        <button className="nav-stop-btn" onClick={onCancel} aria-label="Stop navigation">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="nav-info">
        <div className="nav-distance">
          <div className="distance-value">{formatDistance(distanceRemaining)}</div>
          <div className="distance-label">remaining • natitira</div>
        </div>

        <div className="nav-compass">
          <div className="compass-ring">
            <div className="compass-arrow" style={{ transform: `rotate(${heading}deg)` }}>
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2L19 21L12 17L5 21L12 2Z" />
              </svg>
            </div>
          </div>
        </div>
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
        <button className="map-control-btn" onClick={handlePitchToggle} aria-label="Toggle 3D view">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" />
            <path d="M12 12L20 7.5" />
            <path d="M12 12V21" />
            <path d="M12 12L4 7.5" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

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
