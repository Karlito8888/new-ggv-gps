import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMapSetup } from "./hooks/useMapSetup";
import { useRouting } from "./hooks/useRouting";
import { useNavigation } from "./hooks/useNavigation";
import { blocks } from "./data/blocks";
import { publicPois } from "./data/public-pois";
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
  const { map, userLocation, isMapReady, setMapStyle } =
    useMapSetup(mapContainerRef);

  // Calculate route when destination is selected
  // eslint-disable-next-line no-unused-vars
  const { routeGeoJSON, distance, duration, isCalculating } = useRouting(
    map,
    userLocation,
    destination,
  );

  // Navigation logic (bearing, arrival detection)
  const { bearing, nextTurn, distanceRemaining, hasArrived } = useNavigation(
    map,
    userLocation,
    routeGeoJSON,
    destination,
  );

  // Handle arrival
  useEffect(() => {
    if (hasArrived && navState === "navigating") {
      setNavState("arrived");
    }
  }, [hasArrived, navState]);

  // Handle device orientation events (iOS + Android)
  useEffect(() => {
    if (navState !== "navigating") return;

    const handleOrientation = (event) => {
      setDeviceOrientation({
        alpha: event.alpha || 0, // Compass heading (0-360)
        beta: event.beta || 0, // Front-to-back tilt
        gamma: event.gamma || 0, // Left-to-right tilt
        webkitHeading: event.webkitCompassHeading || null, // iOS Safari
      });
    };

    // Android Chrome
    window.addEventListener("deviceorientationabsolute", handleOrientation);
    // iOS Safari + fallback
    window.addEventListener("deviceorientation", handleOrientation);

    return () => {
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation,
      );
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [navState]);

  return (
    <div className="app-container">
      {/* Map container - always rendered */}
      <div ref={mapContainerRef} className="map-container" />

      {/* Conditional overlays based on navState */}
      <AnimatePresence mode="wait">
        {navState === "gps-permission" && (
          <GPSPermissionOverlay
            key="gps-permission"
            onGrant={() => setNavState("welcome")}
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
            nextTurn={nextTurn}
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

      {/* Map style toggle (always visible when map ready) */}
      {isMapReady && (
        <div className="map-style-toggle">
          <button
            onClick={() => setMapStyle("osm")}
            className="style-btn"
            aria-label="Street map"
          >
            🗺️
          </button>
          <button
            onClick={() => setMapStyle("satellite")}
            className="style-btn"
            aria-label="Satellite"
          >
            🛰️
          </button>
        </div>
      )}
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

function GPSPermissionOverlay({ onGrant }) {
  return (
    <motion.div
      className="overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div className="modal" variants={modalVariants}>
        <h1>📍 GPS Permission Required</h1>
        <p>
          MyGGV GPS needs access to your location to provide turn-by-turn
          navigation.
        </p>
        <button className="btn-primary" onClick={onGrant}>
          Enable GPS
        </button>
        <p className="text-sm text-gray-500 mt-4">
          The GPS control will appear on the map. Click it to start tracking.
        </p>
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
        const centerLng =
          block.coords.reduce((sum, c) => sum + c[0], 0) / block.coords.length;
        const centerLat =
          block.coords.reduce((sum, c) => sum + c[1], 0) / block.coords.length;

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
          <p className="text-center text-gray-600">
            Get directions to exit the village
          </p>
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
        <p>
          Enable device orientation for accurate compass heading during
          navigation.
        </p>

        {error && <div className="error-message">{error}</div>}

        <button
          className="btn-primary"
          onClick={handleRequest}
          disabled={isRequesting}
        >
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
  nextTurn,
  distanceRemaining,
  destination,
  deviceOrientation,
  onCancel,
}) {
  // Format distance for display
  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  // Calculate compass heading (use device orientation if available)
  const compassHeading =
    deviceOrientation?.webkitHeading || deviceOrientation?.alpha || bearing;

  return (
    <motion.div
      className="navigation-overlay"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
    >
      <div className="nav-header">
        <h2>{destination?.name || "Navigating..."}</h2>
        <button className="btn-cancel" onClick={onCancel}>
          ✕
        </button>
      </div>

      <div className="nav-distance">
        <div className="distance-value">
          {formatDistance(distanceRemaining)}
        </div>
        <div className="distance-label">remaining</div>
      </div>

      {nextTurn && (
        <div className="nav-turn">
          <div className="turn-instruction">{nextTurn.instruction}</div>
          <div className="turn-distance">
            {formatDistance(nextTurn.distance)}
          </div>
        </div>
      )}

      <div className="nav-compass">
        <div
          className="compass-arrow"
          style={{ transform: `rotate(${compassHeading}deg)` }}
        >
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
          You have reached{" "}
          <strong>{destination?.name || "your destination"}</strong>
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
