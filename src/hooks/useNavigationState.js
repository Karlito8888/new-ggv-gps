import { useState, useCallback } from "react";

// Default coordinates (Garden Grove Village) - imported from useMapConfig
const DEFAULT_COORDS = {
  latitude: 14.347872973134175,
  longitude: 120.95134859887523,
};

export function useNavigationState() {
  // Navigation states: Sequential permission workflow  
  const [navigationState, setNavigationState] = useState("gps-permission"); // gps-permission, welcome, orientation-permission, navigating, arrived, exit-complete
  const [rawUserLocation, setRawUserLocation] = useState(null);
  const [previousUserLocation, setPreviousUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapType, setMapType] = useState("osm"); // 'osm' ou 'satellite'
  const [orientationEnabled, setOrientationEnabled] = useState(false);

  // Simple navigation handlers
  const handleDestinationSelected = useCallback((dest) => {
    if (import.meta.env.DEV) console.log("🎯 Destination selected → Stored for navigation");
    setDestination(dest);
  }, []);

  const handleArrival = useCallback(() => {
    setNavigationState("arrived");
  }, []);

  const handleExitComplete = useCallback(() => {
    setNavigationState("exit-complete");
  }, []);

  const handleStartNewNavigation = useCallback(() => {
    setDestination(null);
    setNavigationState("gps-permission");
  }, []);

  const handleNewDestinationSimple = useCallback(() => {
    setDestination(null);
    setNavigationState("welcome");
  }, []);

  const handleMapTypeToggle = useCallback(() => {
    setMapType(prev => prev === "osm" ? "satellite" : "osm");
  }, []);

  // New permission handlers
  const handleGpsPermissionGranted = useCallback(() => {
    if (import.meta.env.DEV) console.log("📍 GPS permission granted → Welcome");
    setNavigationState("welcome");
  }, []);

  const handleOrientationPermissionRequest = useCallback(() => {
    if (import.meta.env.DEV) console.log("🧭 Starting orientation permission flow");
    setNavigationState("orientation-permission");
  }, []);

  const handleOrientationPermissionGranted = useCallback(() => {
    if (import.meta.env.DEV) console.log("🧭 Orientation permission granted → Navigation");
    setNavigationState("navigating");
  }, []);

  const handleDestinationSelectedAndProceed = useCallback((dest) => {
    if (import.meta.env.DEV) console.log("🎯 Destination selected → Orientation Permission");
    setDestination(dest);
    setNavigationState("orientation-permission");
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
    handleDestinationSelected,
    handleDestinationSelectedAndProceed,
    handleArrival,
    handleExitComplete,
    handleStartNewNavigation,
    handleNewDestination: handleNewDestinationSimple,
    handleMapTypeToggle,
    handleGpsPermissionGranted,
    handleOrientationPermissionRequest,
    handleOrientationPermissionGranted,
  };
}