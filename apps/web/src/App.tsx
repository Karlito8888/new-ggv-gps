import { useEffect, useMemo, useRef } from "react";
import { useCourseUpCamera, useNavigationFlow, useRouting, type CameraDriver } from "@ggv/shared";
import { useMapSetup, updateDestinationMarker } from "./hooks/useMapSetup";
import { setRouteData } from "./lib/routeLayers";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import ggvLogo from "./assets/img/ggv.png";
import { GpsPermissionOverlay } from "./components/GpsPermissionOverlay";
import { WelcomeOverlay } from "./components/WelcomeOverlay";
import { NavigationOverlay } from "./components/NavigationOverlay";
import { ArrivedOverlay } from "./components/ArrivedOverlay";
import { ExitCompleteOverlay } from "./components/ExitCompleteOverlay";
import { UpdateToast } from "./components/UpdateToast";
import arrivalBellSrc from "./assets/audio/arrival-bell.mp3";

export default function App() {
  // Map container ref for MapLibre
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Blocks list from Convex (reactive; undefined while loading, auto-retries on reconnect)
  const blocks = useQuery(anyApi.locations.blocks) as string[] | undefined;

  // Initialize map and GPS tracking
  const { map, userLocation, isMapReady, triggerGeolocate, userMarkerRef } =
    useMapSetup(mapContainerRef);

  // Navigation state machine + arrival detection. Arrival feedback: haptic (Android only, iOS
  // silently ignores) + bell sound.
  const flow = useNavigationFlow(userLocation, () => {
    navigator.vibrate?.([100, 50, 100]);
    new Audio(arrivalBellSrc).play().catch(() => {});
  });
  const { navState, destination, showArrivedModal } = flow;

  // Calculate route when destination is selected
  const { steps, routeSource, routeGeoJSON, isRecalculating } = useRouting(
    map !== null,
    userLocation,
    destination,
    (geometry) => {
      if (map) setRouteData(map, geometry);
    },
    () => navigator.vibrate?.(200)
  );

  // Course-up 3D camera: single driver, bearing from GPS course (no sensor).
  const cameraDriver = useMemo<CameraDriver | null>(() => {
    if (!map || !isMapReady) return null;
    return {
      jumpTo: (o) => map.jumpTo(o),
      easeTo: (o) =>
        map.easeTo({
          ...o,
          easing: (t) => t, // linear -> continuous motion, no easeTo pile-up
          essential: true, // stay smooth under prefers-reduced-motion
        }),
      // dragstart fires only on user gestures, never on programmatic easeTo.
      onUserPan: (cb) => {
        map.on("dragstart", cb);
        return () => {
          map.off("dragstart", cb);
        };
      },
    };
  }, [map, isMapReady]);
  useCourseUpCamera(cameraDriver, navState === "navigating", userLocation);

  // Effect: Show/hide the custom user marker based on navState.
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker) return;
    marker.getElement().style.display = navState === "navigating" ? "block" : "none";
  }, [navState, userMarkerRef]);

  // Effect: Update destination marker on map when destination changes
  useEffect(() => {
    if (map && isMapReady) {
      updateDestinationMarker(map, destination);
    }
  }, [map, isMapReady, destination]);

  return (
    <div className="app-container">
      {/* Map container - always rendered */}
      <div ref={mapContainerRef} className="map-container" />

      {/* GGV Logo - top center */}
      <img src={ggvLogo} alt="GGV" className="ggv-logo" />

      {/* Conditional overlays based on navState */}
      {navState === "gps-permission" ? (
        <GpsPermissionOverlay
          onGrant={flow.grantGps}
          triggerGeolocate={triggerGeolocate}
          isMapReady={isMapReady}
        />
      ) : null}

      {navState === "welcome" ? (
        <WelcomeOverlay
          blocks={blocks ?? []}
          isLoadingBlocks={blocks === undefined}
          onSelectDestination={flow.selectDestination}
        />
      ) : null}

      {navState === "navigating" && !showArrivedModal ? (
        <NavigationOverlay
          distanceRemaining={flow.distanceRemaining}
          destination={destination}
          steps={steps}
          routeSource={routeSource}
          routeGeoJSON={routeGeoJSON}
          userLocation={userLocation}
          isRecalculating={isRecalculating}
          onCancel={flow.cancelNavigation}
        />
      ) : null}

      {navState === "exit-complete" ? <ExitCompleteOverlay /> : null}

      {/* Arrived modals — floating, map stays interactive */}
      {showArrivedModal ? (
        <ArrivedOverlay
          destination={destination}
          onNavigateAgain={flow.navigateAgain}
          onExitVillage={flow.exitVillage}
        />
      ) : null}

      {/* SW update notification toast */}
      <UpdateToast />
    </div>
  );
}
