import { useState, useCallback } from "react";

// Default coordinates (Garden Grove Village) - imported from useMapConfig
const DEFAULT_COORDS = {
  latitude: 14.347872973134175,
  longitude: 120.95134859887523,
};

export function useNavigationState() {
  // Navigation states
  const [navigationState, setNavigationState] = useState("welcome"); // welcome, navigating, arrived (permission géré par GeolocateControl)
  const [rawUserLocation, setRawUserLocation] = useState(null);
  const [previousUserLocation, setPreviousUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapType, setMapType] = useState("osm"); // 'osm' ou 'satellite'
  const [orientationEnabled, setOrientationEnabled] = useState(false);

  // Navigation handlers
  const handleLocationPermissionGranted = useCallback(() => {
    if (import.meta.env.DEV) console.log("🔓 Geolocation permission granted");
    setNavigationState("welcome");
  }, []);

  const handleLocationPermissionDenied = useCallback((errorMessage) => {
    console.error("Location permission denied:", errorMessage);
    setNavigationState("welcome");
  }, []);

  const handleDestinationSelectedSimple = useCallback((dest) => {
    if (import.meta.env.DEV) console.log("🎯 Destination selected:", dest);
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
    if (import.meta.env.DEV) console.log(`🧭 Orientation ${enabled ? 'enabled' : 'disabled'}`);
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