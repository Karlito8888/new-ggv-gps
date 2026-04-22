import { useState, useEffect, useEffectEvent, useRef } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";

interface UseDeviceOrientationReturn {
  heading: number | null;
  isOffCenter: boolean;
  userInteractionTimeRef: React.RefObject<number | null>;
  handleRecenter: (map: MaplibreMap, userLocation: { longitude: number; latitude: number }) => void;
}

/**
 * Hook that manages device orientation (compass) for map rotation during navigation.
 *
 * Responsibilities:
 * - Listens to DeviceOrientationEvent (iOS compass + Android alpha)
 * - Throttles bearing updates to avoid jank (max 4/sec, min 3° delta)
 * - Detects user map interactions (drag/zoom) and pauses rotation
 * - Auto-recenters after 5 seconds of inactivity
 *
 * Uses useEffectEvent to access latest isNavigating state without re-subscribing.
 */
export function useDeviceOrientation(
  map: MaplibreMap | null,
  isMapReady: boolean,
  isNavigating: boolean
): UseDeviceOrientationReturn {
  const [heading, setHeading] = useState<number | null>(null);
  const [isOffCenter, setIsOffCenter] = useState(false);

  // Track user interaction for auto-recenter
  const userInteractionTimeRef = useRef<number | null>(null);
  const recenterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useEffectEvent gives us a stable ref to the latest isNavigating value
  // without adding it as a dependency to the orientation listener effect.
  // This avoids re-subscribing to DeviceOrientation on every navState change.
  const isNavigatingEvent = useEffectEvent(() => isNavigating);

  // Main effect: orientation listener + map interaction tracking
  // Only re-subscribes when map instance changes (not on navState changes)
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
      if (isNavigatingEvent()) {
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
      if (isNavigatingEvent()) {
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
      // Only rotate map when navigating (via useEffectEvent — always fresh value)
      if (!isNavigatingEvent()) return;

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
  }, [map, isMapReady]); // Note: no isNavigating dependency — uses useEffectEvent instead

  // Re-center button handler
  const handleRecenter = (
    map: MaplibreMap,
    userLocation: { longitude: number; latitude: number }
  ) => {
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

  return { heading, isOffCenter, userInteractionTimeRef, handleRecenter };
}
