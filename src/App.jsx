import { useEffect, useRef, useCallback, useState } from "react";
import useAdaptivePitch from "./hooks/useAdaptivePitch";
import { Map, GeolocateControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import WelcomeModalMobile from "./components/WelcomeModalMobile";
import NavigationDisplay from "./components/NavigationDisplay";
import ArrivalModalNew from "./components/ArrivalModalNew";
import useDeviceOrientation from "./hooks/useDeviceOrientation";
import { useNavigationState } from "./hooks/useNavigationState";
import { useMapConfig } from "./hooks/useMapConfig";
import { useRouteManager } from "./hooks/useRouteManager";
import { useMapTransitions } from "./hooks/useMapTransitions";
import { useBlockPolygons } from "./hooks/useBlockPolygons";
import { useMapZoomEvents } from "./hooks/useMapZoomEvents";

import { initMapLibreDirections, cleanupDirections } from "./lib/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { MapMarkers } from "./components/MapMarkers";
import { RouteLayers } from "./components/RouteLayers";
import { MapControls } from "./components/MapControls";
import { useAvailableBlocks } from "./hooks/useLocations";
import { cleanupDirectionIcons } from "./utils/mapIcons";

function App() {
  // ========================================
  // REFS AND DATA HOOKS
  // ========================================
  const mapRef = useRef(null);
  const { data: availableBlocks = [] } = useAvailableBlocks();

  // ========================================
  // SIMPLE GEOLOCATION STATE - Using MapLibre GeolocateControl
  // ========================================
  const [userLocation, setUserLocation] = useState(null);
  const geolocateControlRef = useRef(null);

  // ========================================
  // NAVIGATION STATE HOOKS
  // ========================================
  const {
    navigationState,
    destination,
    isMapReady,
    mapType,
    orientationEnabled,
    setNavigationState,
    setDestination,
    setIsMapReady,
    setOrientationEnabled,
    handleArrival,
    handleMapTypeToggle,
    handleOrientationToggle,
  } = useNavigationState();

  // ========================================
  // GPS PROCESSING HOOKS
  // ========================================

  // Note: useAdaptiveGPS supprimé - GeolocateControl gère ses propres options GPS

  // Adaptive pitch based on context
  const { pitch: adaptivePitch, pitchMode } = useAdaptivePitch(
    navigationState,
    navigationState === "navigating"
  );

  // Device orientation hook - MUST be declared before useRouteManager
  const {
    compass,
    isActive,
    getCurrentOrientation,
    requestPermission: requestOrientationPermission,
  } = useDeviceOrientation({
    enabled: orientationEnabled && navigationState === "navigating",
    smoothingFactor: 0.8,
    throttleMs: 100,
  });

  // Route management
  const {
    route,
    traveledRoute,
    handleDestinationSelected,
    handleExitVillage,
    handleNewDestination,
    autoCreateRoute,
  } = useRouteManager(
    mapRef,
    userLocation,
    destination,
    navigationState,
    setNavigationState,
    setDestination,
    geolocateControlRef
  );

  // ========================================
  // SIMPLE GEOLOCATION MANAGEMENT
  // ========================================

  // Debug userLocation changes
  useEffect(() => {
    console.log(
      "🔍 userLocation changed:",
      userLocation ? "GPS AVAILABLE" : "GPS NULL"
    );
  }, [userLocation]);

  // Tentative de création automatique de route quand la position devient disponible
  useEffect(() => {
    console.log("🔍 Route creation check:", {
      userLocation: !!userLocation,
      destination: !!destination,
      navigationState,
      route: !!route,
    });

    if (
      userLocation &&
      destination &&
      navigationState === "navigating" &&
      !route
    ) {
      console.log("🔄 ✅ ALL CONDITIONS MET - Creating route automatically");
      autoCreateRoute();
    }
  }, [userLocation, destination, navigationState, route, autoCreateRoute]);

  // Geolocate event handlers
  const handleGeolocate = useCallback((e) => {
    const location = {
      latitude: e.coords.latitude,
      longitude: e.coords.longitude,
      accuracy: e.coords.accuracy,
      heading: e.coords.heading,
      speed: e.coords.speed,
      timestamp: e.timestamp,
    };
    console.log("📍 MapLibre Geolocate received:", location);
    setUserLocation(location);
    console.log("✅ userLocation state updated");
  }, []);

  const handleGeolocateError = useCallback((e) => {
    console.error("❌ GeolocateControl error:", e);
  }, []);

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
    getCurrentOrientation,
    setOrientationEnabled,
  });

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
  const { initialViewState, blocksGeoJSON, mapStyle, getPolygonCenter } =
    useMapConfig(userLocation, navigationState, adaptivePitch, mapType);

  // Map transitions are handled by useMapTransitions hook above

  useBlockPolygons({
    mapRef,
    isMapReady,
    mapType,
    blocksGeoJSON,
  });

  // Auto route creation is handled by useRouteManager hook above

  useMapZoomEvents({
    mapRef,
    isMapReady,
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

  // Debug states - commented out to prevent console spam
  // console.log("🗺️ App states:", {
  //   navigationState,
  //   hasLocation,
  //   permissionGranted,
  //   isLocationLoading,
  //   locationError,
  //   route: route ? `${route.features?.length} features` : "null",
  //   traveledRoute: traveledRoute ? `${traveledRoute.features?.length} features` : "null",
  //   userLocation: userLocation ? "present" : "absent",
  //   destination: destination ? "present" : "absent",
  //   rawLocation: rawUserLocation ? `${rawUserLocation.latitude.toFixed(6)}, ${rawUserLocation.longitude.toFixed(6)}` : "null"
  // });

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
            navigationState={navigationState}
            orientationEnabled={orientationEnabled}
            handleMapTypeToggle={handleMapTypeToggle}
            handleNewDestination={handleNewDestination}
            handleOrientationToggle={handleOrientationToggle}
          />

          {/* Geolocate control - hidden but functional */}
          <GeolocateControl
            ref={geolocateControlRef}
            position="top-left"
            positionOptions={{
              enableHighAccuracy: true,
              timeout: 30000,
              maximumAge: 60000,
            }}
            trackUserLocation={true}
            showAccuracyCircle={true}
            showUserHeading={true}
            onGeolocate={handleGeolocate}
            onError={handleGeolocateError}
            style={{ display: 'none' }}
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

      <WelcomeModalMobile
        isOpen={navigationState === "welcome"}
        onDestinationSelected={handleDestinationSelected}
        onCancel={() => setNavigationState("permission")}
        onOrientationToggle={handleOrientationToggle}
        requestOrientationPermission={requestOrientationPermission}
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


      <Footer />
    </>
  );
}

export default App;
