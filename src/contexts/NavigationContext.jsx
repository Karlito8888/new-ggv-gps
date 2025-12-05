import { createContext, useState, useCallback, useRef } from "react";

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  // Map reference - shared across all pages
  const mapRef = useRef(null);
  const geolocateControlRef = useRef(null);

  // GPS state
  const [userLocation, setUserLocation] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Destination state (also stored in URL for persistence)
  const [destination, setDestination] = useState(null);

  // Map preferences
  const [mapType, setMapType] = useState("osm"); // 'osm' ou 'satellite'
  const [orientationEnabled, setOrientationEnabled] = useState(false);

  // Route state
  const [route, setRoute] = useState(null);
  const [traveledRoute, setTraveledRoute] = useState(null);

  // Map type toggle
  const handleMapTypeToggle = useCallback(() => {
    setMapType((prev) => (prev === "osm" ? "satellite" : "osm"));
  }, []);

  // Clear destination (for new navigation)
  const clearDestination = useCallback(() => {
    setDestination(null);
    setRoute(null);
    setTraveledRoute(null);
  }, []);

  const value = {
    // Refs
    mapRef,
    geolocateControlRef,

    // GPS state
    userLocation,
    setUserLocation,
    isMapReady,
    setIsMapReady,

    // Destination
    destination,
    setDestination,
    clearDestination,

    // Map preferences
    mapType,
    setMapType,
    handleMapTypeToggle,
    orientationEnabled,
    setOrientationEnabled,

    // Route state
    route,
    setRoute,
    traveledRoute,
    setTraveledRoute,
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export default NavigationContext;
