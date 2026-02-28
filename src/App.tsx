import { useState, useRef, useEffect, startTransition } from "react";
import { LazyMotion, domAnimation, AnimatePresence, MotionConfig } from "framer-motion";
import { useMapSetup, updateDestinationMarker } from "./hooks/useMapSetup";
import type { Destination } from "./hooks/useMapSetup";
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
import arrivalBellSrc from "./assets/audio/arrival-bell.mp3";

type NavState =
  | "gps-permission"
  | "welcome"
  | "orientation-permission"
  | "navigating"
  | "arrived"
  | "exit-complete";

interface BlockData {
  name: string;
}

// Village exit coordinates (from CLAUDE.md)
const VILLAGE_EXIT: [number, number] = [120.951863, 14.35098];

export default function App() {
  // Map container ref for MapLibre
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Navigation state machine (6 states)
  const [navState, setNavState] = useState<NavState>("gps-permission");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [hasOrientationPermission, setHasOrientationPermission] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [isOffCenter, setIsOffCenter] = useState(false);

  // Blocks data (pre-loaded during GPS permission screen)
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  const [blocksError, setBlocksError] = useState<string | null>(null);

  // Shared fetch logic (async only — setState in .then callback is safe)
  const fetchBlocks = () => {
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

  // Retry button handler (event handler — sync setState is OK)
  const retryLoadBlocks = () => {
    setBlocksError(null);
    setIsLoadingBlocks(true);
    fetchBlocks();
  };

  // Pre-load blocks on mount (async fetch only, no sync setState)
  useEffect(() => {
    fetchBlocks();
  }, []);

  // Initialize map and GPS tracking
  const { map, userLocation, isMapReady, triggerGeolocate, userMarkerRef } =
    useMapSetup(mapContainerRef);

  // Calculate route when destination is selected
  const { steps, routeSource, routeGeoJSON, isRecalculating } = useRouting(
    map,
    userLocation,
    destination
  );

  // Navigation logic (distance, arrival detection)
  const { distanceRemaining, hasArrived, arrivedAt } = useNavigation(userLocation, destination);

  // Generate destination key for tracking
  const destinationKey = destination?.coordinates
    ? `${destination.coordinates[0]},${destination.coordinates[1]}`
    : null;

  // Track which destination we've already shown the arrival modal for
  const arrivedDestinationRef = useRef<string | null>(null);
  const lastDestinationKeyRef = useRef<string | null>(null);

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

    // Arrival feedback: haptic (Android only, iOS silently ignores) + bell sound
    navigator.vibrate?.([100, 50, 100]);
    new Audio(arrivalBellSrc).play().catch(() => {});

    const isExitDestination = destination?.type === "exit";

    // Snap map to user position at max zoom for arrival view
    if (!isExitDestination && map && map.isStyleLoaded() && userLocation) {
      map.jumpTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 20,
        bearing: 0,
        pitch: 0,
      });
    }

    startTransition(() => {
      setNavState(isExitDestination ? "exit-complete" : "arrived");
    });
  }, [hasArrived, navState, arrivedAt, destinationKey, destination, map, userLocation]);

  // Track if we're currently navigating (used by orientation effect)
  const isNavigatingRef = useRef(false);
  const hasInitialNavViewRef = useRef(false);
  const initialNavViewTimeRef = useRef<number>(0);
  useEffect(() => {
    isNavigatingRef.current = navState === "navigating";
    if (navState !== "navigating") {
      hasInitialNavViewRef.current = false;
    }
  }, [navState]);

  // Effect: Show/hide custom user marker + toggle native dot based on navState
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker) return;
    const el = marker.getElement();
    const isNav = navState === "navigating";
    el.style.display = isNav ? "block" : "none";
    // Toggle CSS class on app container to hide native GeolocateControl dot
    const container = mapContainerRef.current?.parentElement;
    if (container) {
      container.classList.toggle("navigating", isNav);
    }
  }, [navState, userMarkerRef]);

  // Effect: Rotate custom user marker with heading
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker || navState !== "navigating") return;
    const el = marker.getElement();
    if (heading !== null) {
      marker.setRotation(heading);
      el.classList.remove("no-heading");
    } else {
      marker.setRotation(0);
      el.classList.add("no-heading");
    }
  }, [heading, navState, userMarkerRef]);

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
  const userInteractionTimeRef = useRef<number | null>(null);
  const recenterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (isNavigatingRef.current) {
        setIsOffCenter(true);
      }
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
          setIsOffCenter(false);
        }, 5000);
      }
    };

    map.on("dragstart", onInteractionStart);
    map.on("dragend", onInteractionEnd);
    map.on("zoomstart", onInteractionStart);
    map.on("zoomend", onInteractionEnd);

    // Detect platform once (iOS uses webkitCompassHeading, Android uses alpha)
    const DOE = DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission;
    const isIOS =
      typeof DeviceOrientationEvent !== "undefined" && typeof DOE.requestPermission === "function";

    const handler = (e: DeviceOrientationEvent) => {
      // Only rotate map when navigating (check ref to avoid stale closure)
      if (!isNavigatingRef.current) return;

      // Skip rotation if user is panning/zooming
      if (isUserInteracting) return;

      // Calculate heading based on platform
      let heading: number | undefined;
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
      setHeading(heading);

      // Smooth bearing transition — 150ms easeTo cancels previous animation
      map.easeTo({
        bearing: heading,
        pitch: 45,
        duration: 150,
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

    // Skip centering during initial easeTo animation (500ms + 100ms buffer)
    if (Date.now() - initialNavViewTimeRef.current < 600) return;

    // Center map on user position
    map.setCenter([userLocation.longitude, userLocation.latitude]);
  }, [map, isMapReady, navState, userLocation]);

  // Effect 3: Set initial navigation view when entering navigation mode (one-shot)
  useEffect(() => {
    if (!map || !isMapReady || navState !== "navigating" || !userLocation) return;
    if (hasInitialNavViewRef.current) return;
    hasInitialNavViewRef.current = true;
    initialNavViewTimeRef.current = Date.now();

    map.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      ...(heading !== null && { bearing: heading }),
      pitch: 45,
      zoom: 20,
      duration: 500,
    });
  }, [navState, map, isMapReady, userLocation, heading]);

  // Re-center button handler
  const handleRecenter = () => {
    if (!map || !userLocation) return;
    userInteractionTimeRef.current = null;
    setIsOffCenter(false);
    map.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      bearing: heading ?? 0,
      pitch: 45,
      zoom: 20,
      duration: 500,
    });
  };

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
                isRecalculating={isRecalculating}
                isOffCenter={isOffCenter}
                onRecenter={handleRecenter}
                onCancel={() => {
                  setNavState("welcome");
                  setDestination(null);
                  setHeading(null);
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
