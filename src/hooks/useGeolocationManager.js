import { useCallback, useEffect } from "react";

/**
 * Hook for managing geolocation events and controls
 * Merges functionality from useGeolocationEvents.js and useGeolocateControlEvents.js
 */
export function useGeolocationManager(
  geolocateControlRef,
  updateRouteWithLocation,
  navigationState,
  destination,
  originalRoute,
  route,
  previousUserLocation
) {
  // Get current position utility function
  const getCurrentPosition = useCallback(() => {
    if (navigator.geolocation) {
      console.log("📍 Getting current position...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("📍 Current position retrieved:", position);
          const newRawLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          console.log(
            "📍 Coordinates:",
            newRawLocation.latitude,
            newRawLocation.longitude,
            "±" + newRawLocation.accuracy + "m"
          );
        },
        (error) => {
          console.error("❌ Error retrieving position:", error);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    }
  }, []);

  // Event handler for geolocate events
  const handleGeolocate = useCallback(
    (e) => {
      console.log("📍 GPS position received:", e);
      const position = e.data || e; // Event can be in e.data or directly in e
      if (!position || !position.coords) {
        console.warn("⚠️ Invalid GPS position:", position);
        return;
      }
      console.log(
        "📍 Coordinates:",
        position.coords.latitude,
        position.coords.longitude,
        "±" + position.coords.accuracy + "m"
      );
      const newRawLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      console.log("📍 GPS Heading not available");

      // Smart route management using route manager hook
      if (navigationState === "navigating" && destination && originalRoute) {
        updateRouteWithLocation(newRawLocation, previousUserLocation);
      }
    },
    [
      navigationState,
      destination,
      originalRoute,
      updateRouteWithLocation,
      previousUserLocation,
    ]
  );

  // Event handler for geolocate errors
  const handleGeolocateError = useCallback((e) => {
    console.error("❌ Geolocation error:", e.data);
    console.error("❌ Error code:", e.data?.code);
    console.error("❌ Message:", e.data?.message);
  }, []);

  // Configure geolocate control events
  useEffect(() => {
    if (geolocateControlRef.current) {
      const geolocateControl = geolocateControlRef.current;

      // Add event handlers
      geolocateControl.on("geolocate", handleGeolocate);
      geolocateControl.on("error", handleGeolocateError);

      return () => {
        // Clean up event handlers
        geolocateControl.off("geolocate", handleGeolocate);
        geolocateControl.off("error", handleGeolocateError);
      };
    }
  }, [geolocateControlRef, handleGeolocate, handleGeolocateError]);

  return {
    getCurrentPosition,
    handleGeolocate,
    handleGeolocateError,
  };
}