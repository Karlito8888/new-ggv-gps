import { useEffect, useRef } from "react";
import useSmoothedLocation from "./hooks/useSmoothedLocation";
import useAdaptiveGPS from "./hooks/useAdaptiveGPS";
import useAdaptivePitch from "./hooks/useAdaptivePitch";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import LocationPermissionModalNew from "./components/LocationPermissionModalNew";
import WelcomeModalMobile from "./components/WelcomeModalMobile";
import NavigationDisplay from "./components/NavigationDisplay";
import ArrivalModalNew from "./components/ArrivalModalNew";
import NavigationAlerts from "./components/NavigationAlerts";
import useDeviceOrientation from "./hooks/useDeviceOrientation";
import { useNavigationState } from "./hooks/useNavigationState";
import { useMapConfig } from "./hooks/useMapConfig";
import { useRouteManager } from "./hooks/useRouteManager";
import { useMapTransitions } from "./hooks/useMapTransitions";
import { useGeolocationManager } from "./hooks/useGeolocationManager";
import { useBlockPolygons } from "./hooks/useBlockPolygons";
import { useMapZoomEvents } from "./hooks/useMapZoomEvents";

import {
  initMapLibreDirections,
  cleanupDirections,
} from "./lib/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { MapMarkers } from "./components/MapMarkers";
import { RouteLayers } from "./components/RouteLayers";
import { MapControls } from "./components/MapControls";
import { useAvailableBlocks } from "./hooks/useLocations";
import { cleanupDirectionIcons } from "./utils/mapIcons";

// Constantes de configuration
const GEOLOCATION_CONFIG = {
  TIMEOUT: 10000,
  MAX_AGE: 300000,
  RETRY_DELAY: 1000,
  MIN_ACCURACY_DESKTOP: 5000,
};

function App() {
  // ========================================
  // REFS AND DATA HOOKS
  // ========================================
  const mapRef = useRef(null);
  const geolocateControlRef = useRef(null);
  const { data: availableBlocks = [] } = useAvailableBlocks();

  // ========================================
  // NAVIGATION STATES
  // ========================================
  const {
    navigationState,
    rawUserLocation,
    previousUserLocation,
    destination,
    isMapReady,
    mapType,
    orientationEnabled,
    DEFAULT_COORDS,
setNavigationState,
    setIsMapReady,
    setOrientationEnabled,
    handleLocationPermissionGranted,
    handleLocationPermissionDenied,
    handleArrival,
    handleMapTypeToggle,
    handleOrientationToggle,
  } = useNavigationState(geolocateControlRef, getCurrentPosition);

  // ========================================
  // GPS PROCESSING HOOKS
  // ========================================
  const {
    location: userLocation,
    speed,
    speedKmh,
  } = useSmoothedLocation(rawUserLocation, {
    maxJumpDistance: 50,
    minAccuracy: GEOLOCATION_CONFIG.MIN_ACCURACY_DESKTOP,
    smoothingFactor: 0.3,
    maxSpeed: 50,
  });

  // Adaptive GPS optimization for battery saving
  const { gpsOptions, fitBoundsOptions } = useAdaptiveGPS(
    speed,
    navigationState === "navigating"
  );

  // Adaptive pitch based on speed and context
  const { pitch: adaptivePitch, pitchMode } = useAdaptivePitch(
    speedKmh,
    navigationState,
    navigationState === "navigating"
  );

  // Route management
  const {
    route,
    traveledRoute,
    originalRoute,
    lastRouteUpdatePosition,
    handleDestinationSelected,
    handleExitVillage,
    handleNewDestination,
    updateRouteWithLocation,
  } = useRouteManager(mapRef, userLocation, destination, navigationState);

  // Device orientation hook - only enabled during navigation
  const { compass, isActive, getCurrentOrientation } = useDeviceOrientation({
    enabled: orientationEnabled && navigationState === "navigating",
    smoothingFactor: 0.8,
    throttleMs: 100
  });

  // Map transitions (pitch, bearing, orientation)
  useMapTransitions({
    mapRef,
    isMapReady,
    adaptivePitch,
    pitchMode,
    compass,
    isActive,
    orientationEnabled,
    navigationState,
    speedKmh,
    getCurrentOrientation,
    setOrientationEnabled
  });

  // ========================================
  // HANDLERS AND UTILITY FUNCTIONS
  // ========================================
  const {
    getCurrentPosition,
  } = useGeolocationManager(
    geolocateControlRef,
    updateRouteWithLocation,
    navigationState,
    destination,
    originalRoute,
    route,
    previousUserLocation,
    lastRouteUpdatePosition
  );

  // Cleanup directions and icons
  useEffect(() => {
    const currentMapRef = mapRef.current;

    return () => {
      // Clean up MapLibre Directions instance
      cleanupDirections();

      // Clean up direction icons
      if (currentMapRef) {
        const map = currentMapRef.getMap();
        if (map) {
          cleanupDirectionIcons(map);
        }
      }
    };
  }, []);

  // Map configuration
  const {
    initialViewState,
    blocksGeoJSON,
    mapStyle,
    getPolygonCenter,
  } = useMapConfig(userLocation, navigationState, adaptivePitch, mapType);

  // Map transitions are handled by useMapTransitions hook above

  useBlockPolygons({
    mapRef,
    isMapReady,
    mapType,
    blocksGeoJSON
  });

  // Auto route creation is handled by useRouteManager hook above

  useMapZoomEvents({
    mapRef,
    isMapReady
  });

  // Initial block management - once at load
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    const map = mapRef.current.getMap();

    // Initialize MapLibre Directions if not already done
    if (map) {
      initMapLibreDirections(map);
    }

    return () => {
      // Global cleanup
      const currentMap = map;
      if (currentMap) {
        try {
          currentMap.off("render");
          if (currentMap.getLayer("blocks-fill"))
            currentMap.removeLayer("blocks-fill");
          if (currentMap.getLayer("blocks-border"))
            currentMap.removeLayer("blocks-border");
          if (currentMap.getSource("blocks")) currentMap.removeSource("blocks");
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      }
    };
  }, [isMapReady]);

  // Debug route states
  console.log("🗺️ Route states:", {
    route: route ? `${route.features?.length} features` : "null",
    traveledRoute: traveledRoute
      ? `${traveledRoute.features?.length} features`
      : "null",
    navigationState,
    userLocation: userLocation ? "present" : "absent",
    destination: destination ? "present" : "absent",
  });

  return (
    <>
      <Header />
      <main style={{ width: "100%", height: "100%", position: "relative" }}>
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle={mapStyle}
          onLoad={() => setIsMapReady(true)}
          onError={(e) => {
            console.error(
              "Erreur de carte:",
              e.error.message || "Erreur inconnue"
            );
            // Error logged to console only - not shown to user
          }}
          // Assurer que les interactions tactiles restent fonctionnelles
          interactiveLayerIds={
            navigationState === "navigating" ? [] : undefined
          }
          touchZoomRotate={true}
          doubleClickZoom={true}
          dragPan={true}
          dragRotate={navigationState !== "navigating"}
          scrollZoom={true}
          touchPitch={true}
        >
          {/* Map controls */}
          <MapControls
            geolocateControlRef={geolocateControlRef}
            gpsOptions={gpsOptions}
            fitBoundsOptions={fitBoundsOptions}
            navigationState={navigationState}
            orientationEnabled={orientationEnabled}
            isActive={isActive}
            compass={compass}
            adaptivePitch={adaptivePitch}
            handleMapTypeToggle={handleMapTypeToggle}
            handleNewDestination={handleNewDestination}
            handleOrientationToggle={handleOrientationToggle}
          />

          {/* Route layers */}
          <RouteLayers
            route={route}
            traveledRoute={traveledRoute}
            navigationState={navigationState}
          />

          <MapMarkers 
            destination={destination}
            getPolygonCenter={getPolygonCenter}
            navigationState={navigationState}
            handleNewDestination={handleNewDestination}
          />
        </Map>

        {/* Navigation interface */}
        {navigationState === "navigating" && userLocation && destination && (
          <NavigationDisplay
            userLocation={userLocation}
            destination={destination}
            deviceBearing={0}
            onArrival={handleArrival}
            isOrientationActive={false}
          />
        )}

        {/* Messages d'erreur - Hidden from users */}
        {/* Error messages are logged to console only */}
      </main>

      {/* Modals */}
      <LocationPermissionModalNew
        isOpen={navigationState === "permission"}
        onPermissionGranted={handleLocationPermissionGranted}
        onPermissionDenied={handleLocationPermissionDenied}
      />

      <WelcomeModalMobile
        isOpen={navigationState === "welcome"}
        onDestinationSelected={handleDestinationSelected}
        onCancel={() => setNavigationState("permission")}
        onOrientationToggle={handleOrientationToggle}
        availableBlocks={availableBlocks}
      />

      {destination && (
        <ArrivalModalNew
          isOpen={navigationState === "arrived"}
          destination={destination}
          onNewDestination={handleNewDestination}
          onExitVillage={handleExitVillage}
        />
      )}

      {/* Smart navigation alerts */}
      <NavigationAlerts
        userLocation={userLocation}
        route={route}
        speedKmh={speedKmh}
        isNavigating={navigationState === "navigating"}
      />

      <Footer />
    </>
  );
}

export default App;
