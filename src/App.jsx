import { useState, useRef, useEffect, startTransition } from "react";
import { LazyMotion, domAnimation, AnimatePresence, MotionConfig } from "framer-motion";
import { useMapSetup, updateDestinationMarker } from "./hooks/useMapSetup";
import { useRouting } from "./hooks/useRouting";
import { useNavigation } from "./hooks/useNavigation";
import { supabase } from "./lib/supabase";
import ggvLogo from "./assets/img/ggv.png";
import { GpsPermissionOverlay } from "./components/GpsPermissionOverlay";
import { WelcomeOverlay } from "./components/WelcomeOverlay";
import { OrientationOverlay } from "./components/OrientationOverlay";
import { NavigationOverlay } from "./components/NavigationOverlay";
import { ArrivedOverlay } from "./components/ArrivedOverlay";
import { ExitCompleteOverlay } from "./components/ExitCompleteOverlay";

// Village exit coordinates (from CLAUDE.md)
const VILLAGE_EXIT = [120.951863, 14.35098];

/**
 * App Component
 *
 * Main application with 6-state navigation flow:
 * gps-permission → welcome → orientation-permission → navigating → arrived → exit-complete
 *
 * Uses direct MapLibre GL JS (no react-map-gl wrapper)
 * Overlay components extracted to src/components/
 * Uses simple useState (no React Router, no Context)
 */
export default function App() {
  // Map container ref for MapLibre
  const mapContainerRef = useRef(null);

  // Navigation state machine (6 states)
  const [navState, setNavState] = useState("gps-permission");
  const [destination, setDestination] = useState(null);
  const [hasOrientationPermission, setHasOrientationPermission] = useState(false);

  // Blocks data (pre-loaded during GPS permission screen)
  const [blocks, setBlocks] = useState([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  const [blocksError, setBlocksError] = useState(null);

  // Load blocks from Supabase (for retry button - OK to call setState in event handler)
  const retryLoadBlocks = () => {
    setBlocksError(null);
    setIsLoadingBlocks(true);
    supabase.rpc("get_blocks").then(({ data, error }) => {
      if (error) {
        console.error("Error fetching blocks:", error);
        setBlocksError("Failed to load blocks");
        setBlocks([]);
      } else if (data) {
        setBlocks(data);
      }
      setIsLoadingBlocks(false);
    });
  };

  // Pre-load blocks on mount (async fetch - setState only in .then callback)
  useEffect(() => {
    supabase.rpc("get_blocks").then(({ data, error }) => {
      if (error) {
        console.error("Error fetching blocks:", error);
        setBlocksError("Failed to load blocks");
        setBlocks([]);
      } else if (data) {
        setBlocks(data);
      }
      setIsLoadingBlocks(false);
    });
  }, []);

  // Initialize map and GPS tracking
  const { map, userLocation, isMapReady, triggerGeolocate } = useMapSetup(mapContainerRef);

  // Calculate route when destination is selected
  const { steps, routeSource, routeGeoJSON } = useRouting(map, userLocation, destination);

  // Navigation logic (distance, arrival detection)
  const { distanceRemaining, hasArrived, arrivedAt } = useNavigation(
    map,
    userLocation,
    destination
  );

  // Generate destination key for tracking
  const destinationKey = destination?.coordinates
    ? `${destination.coordinates[0]},${destination.coordinates[1]}`
    : null;

  // Track which destination we've already shown the arrival modal for
  const arrivedDestinationRef = useRef(null);
  const lastDestinationKeyRef = useRef(null);

  // Reset arrival tracking when destination changes
  useEffect(() => {
    if (destinationKey !== lastDestinationKeyRef.current) {
      lastDestinationKeyRef.current = destinationKey;
      // Clear arrived ref so new destination can trigger arrival
      arrivedDestinationRef.current = null;
    }
  }, [destinationKey]);

  // Handle arrival - only trigger once per destination
  // Uses startTransition to avoid cascading renders (React Compiler compliant)
  useEffect(() => {
    // Must be navigating with valid arrival data
    if (!hasArrived || navState !== "navigating" || !arrivedAt) {
      return;
    }

    // Must match current destination (not stale data)
    if (arrivedAt !== destinationKey) {
      return;
    }

    // Already shown arrival for this destination? Skip.
    if (arrivedDestinationRef.current === arrivedAt) {
      return;
    }

    // Mark this destination as arrived and show appropriate modal
    arrivedDestinationRef.current = arrivedAt;

    // Haptic feedback on arrival (Android only, iOS silently ignores)
    navigator.vibrate?.([100, 50, 100]);

    startTransition(() => {
      if (destination?.type === "exit") {
        setNavState("exit-complete");
      } else {
        setNavState("arrived");
      }
    });
  }, [hasArrived, navState, arrivedAt, destinationKey, destination]);

  // Track if we're currently navigating (used by orientation effect)
  const isNavigatingRef = useRef(false);
  useEffect(() => {
    isNavigatingRef.current = navState === "navigating";
  }, [navState]);

  // Effect 1: Reset map to north-up when leaving navigation mode
  useEffect(() => {
    if (!map || !isMapReady) return;
    if (navState !== "navigating") {
      map.easeTo({ bearing: 0, pitch: 0, duration: 300 });
    }
  }, [navState, map, isMapReady]);

  // Effect: Update destination marker on map when destination changes
  useEffect(() => {
    if (map && isMapReady) {
      updateDestinationMarker(map, destination);
    }
  }, [map, isMapReady, destination]);

  // Track user interaction for auto-recenter
  const userInteractionTimeRef = useRef(null);
  const recenterTimeoutRef = useRef(null);

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
      userInteractionTimeRef.current = Date.now();
      // Clear any pending recenter timeout
      if (recenterTimeoutRef.current) {
        clearTimeout(recenterTimeoutRef.current);
      }
    };
    const onInteractionEnd = () => {
      // Small delay before re-enabling rotation to avoid jank
      setTimeout(() => {
        isUserInteracting = false;
      }, 300);

      // Auto-recenter after 5 seconds if navigating
      if (isNavigatingRef.current) {
        recenterTimeoutRef.current = setTimeout(() => {
          userInteractionTimeRef.current = null;
        }, 5000);
      }
    };

    map.on("dragstart", onInteractionStart);
    map.on("dragend", onInteractionEnd);
    map.on("zoomstart", onInteractionStart);
    map.on("zoomend", onInteractionEnd);

    // Detect platform once (iOS uses webkitCompassHeading, Android uses alpha)
    const isIOS =
      typeof DeviceOrientationEvent !== "undefined" &&
      // @ts-expect-error iOS 13+ API not in standard TypeScript DOM types
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
      if (recenterTimeoutRef.current) {
        clearTimeout(recenterTimeoutRef.current);
      }
    };
  }, [map, isMapReady]); // Note: no navState dependency - uses ref instead

  // Effect: Keep user ALWAYS centered during navigation
  useEffect(() => {
    if (!map || !isMapReady || navState !== "navigating" || !userLocation) return;

    // Skip centering if user recently interacted (within 5 seconds)
    if (userInteractionTimeRef.current) {
      const timeSinceInteraction = Date.now() - userInteractionTimeRef.current;
      if (timeSinceInteraction < 5000) return;
    }

    // Center map on user position
    map.setCenter([userLocation.longitude, userLocation.latitude]);
  }, [map, isMapReady, navState, userLocation]);

  // Effect 3: Set initial navigation view when entering navigation mode
  useEffect(() => {
    if (!map || !isMapReady || navState !== "navigating") return;
    // Set initial navigation view: zoom in, pitch 45°
    map.easeTo({ pitch: 45, zoom: 20, duration: 500 });
  }, [navState, map, isMapReady]);

  return (
    <div className="app-container">
      {/* Map container - always rendered */}
      <div ref={mapContainerRef} className="map-container" />

      {/* GGV Logo - top center */}
      <img src={ggvLogo} alt="GGV" className="ggv-logo" />

      {/* Conditional overlays based on navState */}
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">
          <AnimatePresence mode="wait">
            {navState === "gps-permission" && (
              <GpsPermissionOverlay
                key="gps-permission"
                onGrant={() => setNavState("welcome")}
                triggerGeolocate={triggerGeolocate}
                isMapReady={isMapReady}
              />
            )}

            {navState === "welcome" && (
              <WelcomeOverlay
                key="welcome"
                blocks={blocks}
                isLoadingBlocks={isLoadingBlocks}
                blocksError={blocksError}
                onRetryBlocks={retryLoadBlocks}
                onSelectDestination={(dest) => {
                  setDestination(dest);
                  setNavState(hasOrientationPermission ? "navigating" : "orientation-permission");
                }}
              />
            )}

            {navState === "orientation-permission" && (
              <OrientationOverlay
                key="orientation-permission"
                onGrant={() => {
                  setHasOrientationPermission(true);
                  setNavState("navigating");
                }}
              />
            )}

            {navState === "navigating" && (
              <NavigationOverlay
                key="navigating"
                map={map}
                distanceRemaining={distanceRemaining}
                destination={destination}
                steps={steps}
                routeSource={routeSource}
                routeGeoJSON={routeGeoJSON}
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

            {navState === "exit-complete" && <ExitCompleteOverlay key="exit-complete" />}
          </AnimatePresence>
        </MotionConfig>
      </LazyMotion>
    </div>
  );
}
