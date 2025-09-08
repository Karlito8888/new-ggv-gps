import { useEffect, useRef, useCallback, useState } from "react";
import useAdaptivePitch from "./hooks/useAdaptivePitch";
import { Map, GeolocateControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import WelcomeModalMobile from "./components/WelcomeModalMobile";
import NavigationDisplay from "./components/NavigationDisplay";
import ArrivalModalNew from "./components/ArrivalModalNew";
import ExitSuccessModal from "./components/ExitSuccessModal";
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
    handleGpsPermissionGranted,
    handleGpsPermissionDenied,
    handleDestinationSelected,
    handleOrientationPermissionComplete,
    handleArrival,
    handleExitComplete,
    handleStartNewNavigation,
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
    handleExitVillage,
    handleNewDestination,
    autoCreateRoute,
  } = useRouteManager(
    mapRef,
    userLocation,
    destination,
    navigationState,
    setNavigationState,
    setDestination
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
    
    // Transition from gps-permission to welcome state when GPS is successful
    if (navigationState === "gps-permission") {
      console.log("🎉 GPS permission granted, transitioning to welcome screen");
      handleGpsPermissionGranted();
    }
  }, [navigationState, handleGpsPermissionGranted]);

  const handleGeolocateError = useCallback((e) => {
    console.error("❌ GeolocateControl error:", e);
    
    // If GPS fails during gps-permission state, still show welcome screen
    if (navigationState === "gps-permission") {
      console.log("⚠️ GPS permission denied or failed, proceeding to welcome screen");
      handleGpsPermissionDenied(e.message || "GPS permission denied");
    }
  }, [navigationState, handleGpsPermissionDenied]);

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

  // Auto-trigger GPS when map is ready and in gps-permission state
  useEffect(() => {
    if (!isMapReady || !mapRef.current || navigationState !== "gps-permission") return;

    // Auto-trigger GPS request
    if (geolocateControlRef?.current) {
      console.log("🚀 Auto-triggering GPS on app startup");
      try {
        geolocateControlRef.current.trigger();
      } catch (error) {
        console.warn("⚠️ Failed to auto-trigger GPS on startup:", error);
        // Use permission denied handler
        handleGpsPermissionDenied("Auto-trigger failed");
      }
    } else {
      console.warn("⚠️ GeolocateControl ref not available, skipping to welcome");
      handleGpsPermissionDenied("GeolocateControl not available");
    }
  }, [isMapReady, navigationState, geolocateControlRef, handleGpsPermissionDenied]);

  // Auto-trigger orientation when entering orientation-permission state
  useEffect(() => {
    if (navigationState !== "orientation-permission") return;

    const requestOrientation = async () => {
      if (requestOrientationPermission && typeof requestOrientationPermission === 'function') {
        try {
          console.log("🧭 Auto-requesting orientation permission");
          const granted = await requestOrientationPermission();
          console.log("🧭 Orientation permission result:", granted);
          
          // Enable orientation if granted
          if (granted && handleOrientationToggle) {
            handleOrientationToggle(true);
          }
          
          // Complete orientation step regardless of result
          handleOrientationPermissionComplete(granted);
        } catch (error) {
          console.warn("⚠️ Orientation permission failed:", error);
          handleOrientationPermissionComplete(false);
        }
      } else {
        // Android/Desktop - no permission needed
        console.log("🧭 Auto-enabling orientation (no permission required)");
        if (handleOrientationToggle) {
          handleOrientationToggle(true);
        }
        handleOrientationPermissionComplete(true);
      }
    };

    // Small delay to ensure user interaction context is preserved
    const timer = setTimeout(requestOrientation, 100);
    return () => clearTimeout(timer);
  }, [navigationState, requestOrientationPermission, handleOrientationToggle, handleOrientationPermissionComplete]);

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
            onExitComplete={handleExitComplete}
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
        onCancel={() => setNavigationState("gps-permission")}
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

      <ExitSuccessModal
        isOpen={navigationState === "exit-complete"}
        onStartNewNavigation={handleStartNewNavigation}
      />

      <Footer />
    </>
  );
}

export default App;
