import { useEffect, useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Map, GeolocateControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

// Components
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import MapLoadingOverlay from "../components/MapLoadingOverlay";
import AnimatedOutlet from "../components/AnimatedOutlet";
import { MapMarkers } from "../components/MapMarkers";
import { MapControls } from "../components/MapControls/MapControls";

// Hooks
import useAdaptivePitch from "../hooks/useAdaptivePitch";
import useDeviceOrientation from "../hooks/useDeviceOrientation";
import { useMapConfig } from "../hooks/useMapConfig";
import { useMapTransitions } from "../hooks/useMapTransitions";
import { useBlockPolygons } from "../hooks/useBlockPolygons";
import { useSymbolLayerInteractions } from "../hooks/useSymbolLayerInteractions";

// Context
import { useNavigation } from "../hooks/useNavigation";

// Utils - Native MapLibre route layer management
import { initNativeRouteLayers, cleanupRouteLayers } from "../lib/navigation";
import { gpsTransition, recenterMap, cleanupMapResources } from "../utils/mapTransitions";

/**
 * MapLayout - Persistent map wrapper for all routes
 * The map remains mounted across route changes to avoid re-initialization
 *
 * Route visualization is now handled by native MapLibre layers (not React components)
 * for better performance during navigation updates.
 */
export default function MapLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get shared state from context
  const {
    mapRef,
    geolocateControlRef,
    userLocation,
    setUserLocation,
    isMapReady,
    setIsMapReady,
    destination,
    setDestination,
    mapType,
    handleMapTypeToggle,
    orientationEnabled,
    setOrientationEnabled,
    route,
    traveledRoute,
    clearDestination,
  } = useNavigation();

  // Derive navigation state from current route
  const getNavigationState = useCallback(() => {
    const path = location.pathname;
    if (path === "/") return "gps-permission";
    if (path === "/welcome") return "welcome";
    if (path === "/navigate") return "navigating";
    if (path === "/arrived") return "arrived";
    if (path === "/exit-complete") return "exit-complete";
    return "gps-permission";
  }, [location.pathname]);

  const navigationState = getNavigationState();

  // GPS error state for user feedback
  const [gpsError, setGpsError] = useState(null);

  // Adaptive pitch based on context
  const { pitch: adaptivePitch, pitchMode } = useAdaptivePitch(
    navigationState,
    navigationState === "navigating",
  );

  // Device orientation hook
  const {
    compass,
    isActive,
    getCurrentOrientation,
    requestPermission: requestOrientationPermission,
  } = useDeviceOrientation({
    enabled: orientationEnabled && navigationState === "navigating",
  });

  // Map configuration
  const { initialViewState, blocksGeoJSON, mapStyle, getPolygonCenter } = useMapConfig(
    userLocation,
    navigationState,
    adaptivePitch,
    mapType,
  );

  // Map transitions (pitch, bearing, orientation)
  const { handleOrientationToggle } = useMapTransitions({
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
    requestOrientationPermission,
  });

  // Block polygons
  useBlockPolygons({
    mapRef,
    isMapReady,
    mapType,
    blocksGeoJSON,
  });

  // Symbol layer interactions
  useSymbolLayerInteractions(
    mapRef,
    (poi) => {
      console.log("POI clicked:", poi);
    },
    (dest) => {
      console.log("Destination clicked:", dest);
    },
  );

  // GPS event handlers
  const handleGeolocate = useCallback(
    async (e) => {
      const loc = {
        latitude: e.coords.latitude,
        longitude: e.coords.longitude,
        accuracy: e.coords.accuracy,
        heading: e.coords.heading,
        speed: e.coords.speed,
        timestamp: e.timestamp,
      };

      setUserLocation(loc);

      // Transition to welcome when GPS is first acquired
      if (location.pathname === "/" && mapRef.current && isMapReady) {
        console.log("GPS acquired - transitioning to welcome");
        await gpsTransition(mapRef.current, loc, true);
        navigate("/welcome");
      }
    },
    [location.pathname, mapRef, isMapReady, setUserLocation, navigate],
  );

  const handleGeolocateError = useCallback((e) => {
    console.error("GPS error:", e.code, e.message);

    // Map error codes to user-friendly messages
    const errorMessages = {
      1: "Location permission denied. Please enable location access in your device settings.",
      2: "Location unavailable. Please check your GPS/WiFi settings and try again.",
      3: "Location request timed out. Please check your connection and try again.",
    };

    setGpsError(errorMessages[e.code] || `GPS Error: ${e.message}`);
  }, []);

  const handleOutOfMaxBounds = useCallback((e) => {
    console.warn("User position out of maxBounds:", {
      latitude: e.coords?.latitude,
      longitude: e.coords?.longitude,
    });
  }, []);

  const handleTrackUserLocationStart = useCallback(() => {
    console.log("GPS tracking started");
  }, []);

  const handleTrackUserLocationEnd = useCallback(() => {
    console.log("GPS tracking ended");
  }, []);

  // Recenter map handler
  const handleRecenterMap = useCallback(async () => {
    if (!mapRef.current || !userLocation) return;
    await recenterMap(mapRef.current, userLocation);
  }, [mapRef, userLocation]);

  // Handle new destination (clear and go to welcome)
  const handleNewDestination = useCallback(() => {
    clearDestination();
    navigate("/welcome");
  }, [clearDestination, navigate]);

  // Auto-center when navigation starts
  useEffect(() => {
    if (navigationState === "navigating" && userLocation && isMapReady) {
      handleRecenterMap();
    }
  }, [navigationState, userLocation, isMapReady, handleRecenterMap]);

  // Initialize native MapLibre route layers when map is ready
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (map) {
      initNativeRouteLayers(map);
    }
  }, [isMapReady, mapRef]);

  // Cleanup map resources on unmount
  useEffect(() => {
    const currentMapRef = mapRef.current;
    return () => {
      // Cleanup native route layers
      const map = currentMapRef?.getMap();
      if (map) {
        cleanupRouteLayers(map);
      }
      cleanupMapResources({ current: currentMapRef });
    };
  }, [mapRef]);

  // Context value to pass to child routes via Outlet
  const outletContext = {
    mapRef,
    geolocateControlRef,
    userLocation,
    destination,
    setDestination,
    navigationState,
    orientationEnabled,
    setOrientationEnabled,
    handleOrientationToggle,
    handleMapTypeToggle,
    handleRecenterMap,
    handleNewDestination,
    getPolygonCenter,
    route,
    traveledRoute,
    gpsError,
    setGpsError,
  };

  return (
    <>
      <Header />
      <main className="main-content">
        {/* Loading overlay during map initialization */}
        <MapLoadingOverlay isVisible={!isMapReady} />

        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle={mapStyle}
          onLoad={() => setIsMapReady(true)}
          onError={(e) => console.error("Map error:", e.error?.message || "Unknown error")}
          interactiveLayerIds={navigationState === "navigating" ? [] : undefined}
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
            userLocation={userLocation}
            handleMapTypeToggle={handleMapTypeToggle}
            handleNewDestination={handleNewDestination}
            handleOrientationToggle={handleOrientationToggle}
            handleRecenterMap={handleRecenterMap}
          />

          {/* Geolocate control - hidden but functional */}
          <GeolocateControl
            ref={geolocateControlRef}
            position="top-left"
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation={true}
            showAccuracyCircle={true}
            showUserHeading={true}
            onGeolocate={handleGeolocate}
            onError={handleGeolocateError}
            onOutOfMaxBounds={handleOutOfMaxBounds}
            onTrackUserLocationStart={handleTrackUserLocationStart}
            onTrackUserLocationEnd={handleTrackUserLocationEnd}
            style={{ display: "none" }}
          />

          {/* Route layers are now managed natively by MapLibre via initNativeRouteLayers() */}
          {/* No React component needed - sources/layers are updated directly */}

          {/* Map markers */}
          <MapMarkers
            destination={destination}
            getPolygonCenter={getPolygonCenter}
            navigationState={navigationState}
            handleNewDestination={handleNewDestination}
          />
        </Map>

        {/* Page content rendered via AnimatedOutlet for smooth transitions */}
        <AnimatedOutlet context={outletContext} />
      </main>
      <Footer />
    </>
  );
}
