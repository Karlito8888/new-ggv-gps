import { useEffect, useRef, useCallback, useState } from "react";
import { Map, GeolocateControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

// Components
import WelcomeModalMobile from "./components/WelcomeModalMobile";
import NavigationDisplay from "./components/NavigationDisplay";
import ArrivalModalNew from "./components/ArrivalModalNew";
import ExitSuccessModal from "./components/ExitSuccessModal";
import GpsPermissionModal from "./components/GpsPermissionModal";
import OrientationPermissionModal from "./components/OrientationPermissionModal";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import { MapMarkers } from "./components/MapMarkers";
import { MapSymbolLayers } from "./components/MapSymbolLayers";
import { useSymbolLayerInteractions } from "./hooks/useSymbolLayerInteractions";
import { RouteLayers } from "./components/RouteLayers";
import { MapControls } from "./components/MapControls/MapControls";

// Hooks
import useAdaptivePitch from "./hooks/useAdaptivePitch";
import useDeviceOrientation from "./hooks/useDeviceOrientation";
import { useNavigationState } from "./hooks/useNavigationState";
import { useMapConfig } from "./hooks/useMapConfig";
import { useRouteManager } from "./hooks/useRouteManager";
import { useMapTransitions } from "./hooks/useMapTransitions";
import { useBlockPolygons } from "./hooks/useBlockPolygons";
import { useMapZoomEvents } from "./hooks/useMapZoomEvents";
import { useAvailableBlocks } from "./hooks/useLocations";

// Utils
import { initMapLibreDirections } from "./lib/navigation";
import { gpsTransition, recenterMap, cleanupMapResources } from "./utils/mapTransitions";

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
    handleDestinationSelectedAndProceed,
    handleArrival,
    handleExitComplete,
    handleMapTypeToggle,
    handleGpsPermissionGranted,
    handleOrientationPermissionGranted,
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

  // Device orientation hook
  const {
    compass,
    isActive,
    getCurrentOrientation,
  } = useDeviceOrientation({
    enabled: orientationEnabled && navigationState === "navigating",
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

  useEffect(() => {
    if (navigationState === "gps-permission" && userLocation) {
      handleGpsPermissionGranted();
    }
  }, [navigationState, userLocation, handleGpsPermissionGranted]);

  // Simple GPS event handlers - avec transition sécurisée
  const handleGeolocate = useCallback(async (e) => {
    const location = {
      latitude: e.coords.latitude,
      longitude: e.coords.longitude,
      accuracy: e.coords.accuracy,
      heading: e.coords.heading,
      speed: e.coords.speed,
      timestamp: e.timestamp,
    };
    
    setUserLocation(location);
    
    // Transition simplifiée lors du premier positionnement GPS
    if (navigationState === "gps-permission" && mapRef.current && isMapReady) {
      console.log("📍 GPS acquired - simple transition starting");
      await gpsTransition(mapRef.current, location, true);
    }
  }, [navigationState, mapRef, isMapReady]);
  
  const handleGeolocateError = useCallback((e) => {
    console.error("GPS error:", e);
    
    // Gestion d'erreur améliorée pour desktop
    if (e.code === 1) {
      console.log("📍 GPS permission denied - showing fallback options");
      // L'utilisateur a refusé la permission
    } else if (e.code === 2) {
      console.log("📍 GPS position unavailable - trying fallback");
      // Position non disponible (souvent sur desktop)
    } else if (e.code === 3) {
      console.log("📍 GPS timeout - extending timeout for desktop");
      // Timeout (courant sur desktop avec géolocalisation IP)
    }
  }, []);

  // Auto route creation - simplified (removed verbose logs)
  useEffect(() => {
    if (userLocation && destination && navigationState === "navigating" && !route) {
      autoCreateRoute();
    }
  }, [userLocation, destination, navigationState, route, autoCreateRoute]);

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
  });

  // Symbol layer interactions
  useSymbolLayerInteractions(mapRef, 
    (poi) => {
      console.log('POI clicked:', poi);
      // Gérer le clic sur un POI si nécessaire
    },
    (destination) => {
      console.log('Destination clicked:', destination);
      // Gérer le clic sur la destination si nécessaire
    }
  );

  // Recenter map - version ultra simplifiée
  const handleRecenterMap = useCallback(async () => {
    if (!mapRef.current || !userLocation) return;
    await recenterMap(mapRef.current, userLocation);
  }, [userLocation]);

  // Auto-center when navigation starts - simplified (removed verbose logs)
  useEffect(() => {
    if (navigationState === "navigating" && userLocation && isMapReady) {
      handleRecenterMap();
    }
  }, [navigationState, userLocation, isMapReady, handleRecenterMap]);

  // Cleanup map resources - ultra simplified
  useEffect(() => {
    return () => {
      cleanupMapResources(mapRef);
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
  }, [isMapReady]);

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle={mapStyle}
          onLoad={() => setIsMapReady(true)}
          onError={(e) => console.error("Map error:", e.error?.message || "Unknown error")}
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
            positionOptions={{
              enableHighAccuracy: true,
              timeout: 45000, // Timeout plus long pour desktop
              maximumAge: 300000, // 5 minutes - plus tolérant pour desktop
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

          {/* SymbolLayer temporairement désactivé - à réactiver après correction des erreurs */}
          {/* <MapSymbolLayers
            destination={destination}
            getPolygonCenter={getPolygonCenter}
          /> */}

          {/* Legacy MapMarkers - utilisé jusqu'à ce que SymbolLayer soit corrigé */}
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
      
      <GpsPermissionModal
        isOpen={navigationState === "gps-permission"}
        geolocateControlRef={geolocateControlRef}
      />

      <WelcomeModalMobile
        isOpen={navigationState === "welcome"}
        onDestinationSelected={handleDestinationSelectedAndProceed}
        onCancel={() => setNavigationState("welcome")}
        availableBlocks={availableBlocks}
      />
      
      <OrientationPermissionModal
        isOpen={navigationState === "orientation-permission"}
        onPermissionGranted={handleOrientationPermissionGranted}
        handleOrientationToggle={handleOrientationToggle}
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
      />

      <Footer />
    </div>
  );
}

export default App;
