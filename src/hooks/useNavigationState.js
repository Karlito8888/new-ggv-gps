import { useState, useCallback } from "react";

// Default coordinates (Garden Grove Village) - imported from useMapConfig
const DEFAULT_COORDS = {
  latitude: 14.347872973134175,
  longitude: 120.95134859887523,
};

export function useNavigationState(geolocateControlRef = null, getCurrentPosition = null) {
  // Navigation states
  const [navigationState, setNavigationState] = useState("permission"); // permission, welcome, navigating, arrived
  const [rawUserLocation, setRawUserLocation] = useState(null);
  const [previousUserLocation, setPreviousUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapType, setMapType] = useState("osm"); // 'osm' ou 'satellite'
  const [orientationEnabled, setOrientationEnabled] = useState(false);

  // Navigation handlers
  const handleLocationPermissionGranted = useCallback(() => {
    console.log("🔓 Geolocation permission granted");
    setNavigationState("welcome");

    // Trigger GeolocateControl to get position
    if (geolocateControlRef?.current) {
      console.log("🎯 Triggering GeolocateControl...");
      geolocateControlRef.current.trigger();

      // Get current position after delay
      if (getCurrentPosition) {
        setTimeout(getCurrentPosition, 1000);
      }
    } else {
      console.warn("⚠️ GeolocateControl ref non disponible");
    }
  }, [geolocateControlRef, getCurrentPosition]);

  const handleLocationPermissionDenied = useCallback((errorMessage) => {
    console.error("Location permission denied:", errorMessage);
    setNavigationState("welcome");
  }, []);

  const handleDestinationSelectedSimple = useCallback((dest) => {
    console.log("🎯 Destination selected:", dest);
    setDestination(dest);
    setNavigationState("navigating");
  }, []);

  const handleArrival = useCallback(() => {
    setNavigationState("arrived");
  }, []);

  const handleNewDestinationSimple = useCallback(() => {
    setDestination(null);
    setNavigationState("welcome");
  }, []);

  const handleMapTypeToggle = useCallback(() => {
    setMapType(prev => prev === "osm" ? "satellite" : "osm");
  }, []);

  const handleOrientationToggle = useCallback((enabled) => {
    console.log(`🧭 Orientation ${enabled ? 'enabled' : 'disabled'}`);
    setOrientationEnabled(enabled);
  }, []);

  

  return {
    // States
    navigationState,
    rawUserLocation,
    previousUserLocation,
    destination,
    isMapReady,
    mapType,
    orientationEnabled,
    DEFAULT_COORDS,
    
    // Setters
    setNavigationState,
    setRawUserLocation,
    setPreviousUserLocation,
    setDestination,
    setIsMapReady,
    setMapType,
    setOrientationEnabled,
    
    // Handlers
    handleLocationPermissionGranted,
    handleLocationPermissionDenied,
    handleDestinationSelected: handleDestinationSelectedSimple,
    handleArrival,
    handleNewDestination: handleNewDestinationSimple,
    handleMapTypeToggle,
    handleOrientationToggle,
  };
}