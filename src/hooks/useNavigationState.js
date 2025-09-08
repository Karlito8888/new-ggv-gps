import { useState, useCallback } from "react";

// Default coordinates (Garden Grove Village) - imported from useMapConfig
const DEFAULT_COORDS = {
  latitude: 14.347872973134175,
  longitude: 120.95134859887523,
};

export function useNavigationState() {
  // Navigation states: Sequential workflow for permissions
  const [navigationState, setNavigationState] = useState("gps-permission"); // gps-permission, welcome, orientation-permission, navigating, arrived, exit-complete
  const [rawUserLocation, setRawUserLocation] = useState(null);
  const [previousUserLocation, setPreviousUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapType, setMapType] = useState("osm"); // 'osm' ou 'satellite'
  const [orientationEnabled, setOrientationEnabled] = useState(false);

  // Sequential navigation handlers
  const handleGpsPermissionGranted = useCallback(() => {
    if (import.meta.env.DEV) console.log("🔓 GPS permission granted → Welcome screen");
    setNavigationState("welcome");
  }, []);

  const handleGpsPermissionDenied = useCallback((errorMessage) => {
    console.error("GPS permission denied:", errorMessage);
    // Still proceed to welcome - user can navigate without GPS
    setNavigationState("welcome");
  }, []);

  const handleDestinationSelectedSequential = useCallback((dest) => {
    if (import.meta.env.DEV) console.log("🎯 Destination selected → Orientation permission");
    setDestination(dest);
    setNavigationState("orientation-permission");
  }, []);

  const handleOrientationPermissionComplete = useCallback((granted) => {
    if (import.meta.env.DEV) console.log(`🧭 Orientation permission ${granted ? 'granted' : 'denied/skipped'} → Navigation`);
    setNavigationState("navigating");
  }, []);

  const handleArrival = useCallback(() => {
    setNavigationState("arrived");
  }, []);

  const handleExitComplete = useCallback(() => {
    setNavigationState("exit-complete");
  }, []);

  const handleStartNewNavigation = useCallback(() => {
    setDestination(null);
    setNavigationState("welcome");
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
    handleGpsPermissionGranted,
    handleGpsPermissionDenied,
    handleDestinationSelected: handleDestinationSelectedSequential,
    handleOrientationPermissionComplete,
    handleArrival,
    handleExitComplete,
    handleStartNewNavigation,
    handleNewDestination: handleNewDestinationSimple,
    handleMapTypeToggle,
    handleOrientationToggle,
  };
}