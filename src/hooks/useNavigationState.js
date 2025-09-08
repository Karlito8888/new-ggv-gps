import { useState, useCallback } from "react";

// Default coordinates (Garden Grove Village) - imported from useMapConfig
const DEFAULT_COORDS = {
  latitude: 14.347872973134175,
  longitude: 120.95134859887523,
};

export function useNavigationState() {
  // Navigation states: Simple workflow  
  const [navigationState, setNavigationState] = useState("welcome"); // welcome, navigating, arrived, exit-complete
  const [rawUserLocation, setRawUserLocation] = useState(null);
  const [previousUserLocation, setPreviousUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapType, setMapType] = useState("osm"); // 'osm' ou 'satellite'
  const [orientationEnabled, setOrientationEnabled] = useState(false);

  // Simple navigation handlers
  const handleDestinationSelected = useCallback((dest) => {
    if (import.meta.env.DEV) console.log("🎯 Destination selected → Navigation");
    setDestination(dest);
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
    handleArrival,
    handleExitComplete,
    handleStartNewNavigation,
    handleNewDestination: handleNewDestinationSimple,
    handleMapTypeToggle,
  };
}