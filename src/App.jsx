import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMapSetup } from "./hooks/useMapSetup";
import { useRouting } from "./hooks/useRouting";
import { useNavigation } from "./hooks/useNavigation";
import { blocks } from "./data/blocks";
import { publicPois } from "./data/public-pois";
import ggvLogo from "./assets/img/ggv.png";
import stopIcon from "./assets/img/stop.png";
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

    // Set initial navigation pitch
    map.easeTo({ pitch: 45, duration: 300 });

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
            pois={publicPois}
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

function WelcomeOverlay({ blocks, pois, onSelectDestination }) {
  const [selectedType, setSelectedType] = useState("block");
  const [selectedBlock, setSelectedBlock] = useState("");

  useEffect(() => {
    if (blocks.length > 0 && !selectedBlock) {
      setSelectedBlock(blocks[0].name);
    }
  }, [blocks, selectedBlock]);

  const handleNavigate = () => {
    if (selectedType === "block" && selectedBlock) {
      const block = blocks.find((b) => b.name === selectedBlock);
      if (block) {
        // Calculate center of block polygon
        const centerLng = block.coords.reduce((sum, c) => sum + c[0], 0) / block.coords.length;
        const centerLat = block.coords.reduce((sum, c) => sum + c[1], 0) / block.coords.length;

        onSelectDestination({
          type: "block",
          coordinates: [centerLng, centerLat],
          name: `Block ${block.name}`,
        });
      }
    } else if (selectedType === "poi") {
      // For simplicity, navigate to Guard Post (only active POI)
      const guardPost = pois[0];
      onSelectDestination({
        type: "poi",
        coordinates: guardPost.coords,
        name: guardPost.name,
      });
    } else if (selectedType === "exit") {
      onSelectDestination({
        type: "exit",
        coordinates: VILLAGE_EXIT,
        name: "Village Exit",
      });
    }
  };

  return (
    <motion.div
      className="overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="modal" variants={modalVariants}>
        <h1>🏘️ Where to?</h1>

        <div className="destination-type-selector">
          <button
            className={`type-btn ${selectedType === "block" ? "active" : ""}`}
            onClick={() => setSelectedType("block")}
          >
            Block
          </button>
          <button
            className={`type-btn ${selectedType === "poi" ? "active" : ""}`}
            onClick={() => setSelectedType("poi")}
          >
            Guard Post
          </button>
          <button
            className={`type-btn ${selectedType === "exit" ? "active" : ""}`}
            onClick={() => setSelectedType("exit")}
          >
            Exit
          </button>
        </div>

        {selectedType === "block" && (
          <div className="block-selector">
            <label htmlFor="block-select">Select Block:</label>
            <select
              id="block-select"
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="select-input"
            >
              {blocks.map((block) => (
                <option key={block.name} value={block.name}>
                  Block {block.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedType === "poi" && (
          <p className="text-center text-gray-600">
            Navigate to the Guard Post at the village entrance
          </p>
        )}

        {selectedType === "exit" && (
          <p className="text-center text-gray-600">Get directions to exit the village</p>
        )}

        <button className="btn-primary mt-4" onClick={handleNavigate}>
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
      className="overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="modal" variants={modalVariants}>
        <h1>🧭 Compass Permission</h1>
        <p>Enable device orientation for accurate compass heading during navigation.</p>

        {error && <div className="error-message">{error}</div>}

        <button className="btn-primary" onClick={handleRequest} disabled={isRequesting}>
          {isRequesting ? "Requesting..." : "Enable Compass"}
        </button>

        <button className="btn-secondary mt-2" onClick={onGrant}>
          Skip (navigate without compass)
        </button>
      </motion.div>
    </motion.div>
  );
}

function NavigationOverlay({
  bearing,
  distanceRemaining,
  destination,
  deviceOrientation,
  onCancel,
}) {
  const formatDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
  const heading = deviceOrientation?.webkitHeading || deviceOrientation?.alpha || bearing;

  return (
    <motion.div
      className="navigation-overlay"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
    >
      <div className="nav-header">
        <h2>{destination?.name || "Navigating..."}</h2>
        <button className="btn-stop" onClick={onCancel} aria-label="Arrêter la navigation">
          <img src={stopIcon} alt="Stop" />
        </button>
      </div>

      <div className="nav-distance">
        <div className="distance-value">{formatDistance(distanceRemaining)}</div>
        <div className="distance-label">remaining</div>
      </div>

      <div className="nav-compass">
        <div className="compass-arrow" style={{ transform: `rotate(${heading}deg)` }}>
          ↑
        </div>
      </div>
    </motion.div>
  );
}

function ArrivedOverlay({ destination, onNavigateAgain, onExitVillage }) {
  return (
    <motion.div
      className="overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="modal" variants={modalVariants}>
        <h1>🎉 You've Arrived!</h1>
        <p className="text-center text-lg">
          You have reached <strong>{destination?.name || "your destination"}</strong>
        </p>

        <button className="btn-primary mt-4" onClick={onNavigateAgain}>
          Navigate Somewhere Else
        </button>

        <button className="btn-secondary mt-2" onClick={onExitVillage}>
          Exit Village
        </button>
      </motion.div>
    </motion.div>
  );
}

function ExitCompleteOverlay({ onReset }) {
  return (
    <motion.div
      className="overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="modal" variants={modalVariants}>
        <h1>👋 Safe Travels!</h1>
        <p className="text-center">
          You have exited Garden Grove Village. Thank you for using MyGGV GPS!
        </p>

        <button className="btn-primary mt-4" onClick={onReset}>
          Start New Navigation
        </button>
      </motion.div>
    </motion.div>
  );
}
