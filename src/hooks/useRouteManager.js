import { useState, useCallback } from "react";
import {
  createRoute,
  shouldRecalculateRoute,
  updateRecalculationState,
  resetRecalculationState,
  createRemainingRoute,
  shouldUpdateRemainingRoute,
  createTraveledRoute,
  VILLAGE_EXIT_COORDS,
} from "../lib/navigation";

export function useRouteManager(mapRef, userLocation, destination, navigationState) {
  // Route states
  const [route, setRoute] = useState(null);
  const [originalRoute, setOriginalRoute] = useState(null); // Store the complete original route
  const [traveledRoute, setTraveledRoute] = useState(null); // Store the traveled portion
  const [lastRouteUpdatePosition, setLastRouteUpdatePosition] = useState(null); // Track last position when route was updated

  // Create route to destination
  const createRouteToDestination = useCallback(async (dest, currentUserLocation) => {
    if (!currentUserLocation) {
      console.log("⏳ Waiting for user location...");
      return;
    }

    console.log("🚀 Attempting route creation...");
    console.log("📍 From:", currentUserLocation.latitude, currentUserLocation.longitude);
    console.log("📍 To:", dest.coordinates[1], dest.coordinates[0]);
    
    try {
      const routeResult = await createRoute(
        currentUserLocation.latitude,
        currentUserLocation.longitude,
        dest.coordinates[1],
        dest.coordinates[0],
        mapRef.current?.getMap()
      );

      // Ensure FeatureCollection format for MapLibre
      const routeData = {
        type: "FeatureCollection",
        features:
          routeResult.type === "Feature"
            ? [routeResult]
            : routeResult.features || [],
      };

      console.log("📍 Route created:", routeData);
      setRoute(routeData);
      setOriginalRoute(routeData); // Store the complete route
      setLastRouteUpdatePosition({
        lat: currentUserLocation.latitude,
        lon: currentUserLocation.longitude,
      });

      // Update recalculation state after successful route creation
      updateRecalculationState(currentUserLocation.latitude, currentUserLocation.longitude);
      return routeData;
    } catch (error) {
      console.error("❌ Route creation error:", error);
      throw error;
    }
  }, [mapRef]);

  // Handle destination selection
  const handleDestinationSelected = useCallback(async (dest) => {
    console.log("🎯 Destination selected:", dest);
    console.log(
      "📍 User location available:",
      userLocation ? "YES" : "NO"
    );

    // Reset recalculation state for new navigation
    resetRecalculationState();

    // Wait for user position to be available
    if (!userLocation) {
      console.log("⏳ Waiting for user location...");
      // Route will be automatically created when userLocation becomes available
      return;
    }

    // Create route if we have user position
    await createRouteToDestination(dest, userLocation);
  }, [userLocation, createRouteToDestination]);

  // Handle exit village
  const handleExitVillage = useCallback(async () => {
    const exitDestination = {
      blockNumber: "",
      lotNumber: "",
      coordinates: VILLAGE_EXIT_COORDS,
      address: "Salamat po !\n🙏 Ingat 🙏",
    };

    // Reset recalculation state for exit navigation
    resetRecalculationState();

    if (userLocation) {
      try {
        const routeResult = await createRoute(
          userLocation.latitude,
          userLocation.longitude,
          VILLAGE_EXIT_COORDS[1],
          VILLAGE_EXIT_COORDS[0],
          mapRef.current?.getMap()
        );

        // Ensure FeatureCollection format for MapLibre
        const routeData = {
          type: "FeatureCollection",
          features:
            routeResult.type === "Feature"
              ? [routeResult]
              : routeResult.features || [],
        };

        setRoute(routeData);
        setOriginalRoute(routeData); // Store the complete route for exit
        setLastRouteUpdatePosition({
          lat: userLocation.latitude,
          lon: userLocation.longitude,
        });

        // Update recalculation state after successful route creation
        updateRecalculationState(userLocation.latitude, userLocation.longitude);
        return exitDestination;
      } catch (error) {
        console.error("Exit route creation error:", error);
        throw error;
      }
    }
    return exitDestination;
  }, [userLocation, mapRef]);

  // Handle new destination (reset all route states)
  const handleNewDestination = useCallback(() => {
    setRoute(null);
    setOriginalRoute(null);
    setTraveledRoute(null);
    setLastRouteUpdatePosition(null);
  }, []);

  // Update route based on new user location
  const updateRouteWithLocation = useCallback(async (newRawLocation, previousUserLocation) => {
    if (!destination || !originalRoute) return;

    // Check if we need to recalculate the entire route (user is off-route)
    const shouldRecalc = shouldRecalculateRoute(
      newRawLocation.latitude,
      newRawLocation.longitude,
      route,
      false, // not forced
      previousUserLocation?.latitude,
      previousUserLocation?.longitude
    );

    if (shouldRecalc) {
      console.log(
        "🔄 Automatic recalculation triggered - user is off route"
      );
      try {
        const routeResult = await createRoute(
          newRawLocation.latitude,
          newRawLocation.longitude,
          destination.coordinates[1],
          destination.coordinates[0],
          mapRef.current?.getMap()
        );

        // Ensure FeatureCollection format for MapLibre
        const routeData = {
          type: "FeatureCollection",
          features:
            routeResult.type === "Feature"
              ? [routeResult]
              : routeResult.features || [],
        };

        setRoute(routeData);
        setOriginalRoute(routeData); // Update original route
        setLastRouteUpdatePosition({
          lat: newRawLocation.latitude,
          lon: newRawLocation.longitude,
        });

        // Update recalculation state after successful recalculation
        updateRecalculationState(
          newRawLocation.latitude,
          newRawLocation.longitude
        );
      } catch (error) {
        console.error("Route update error:", error);
      }
    } else {
      // Check if we should update the remaining route (progressive route trimming)
      const shouldUpdateRemaining = shouldUpdateRemainingRoute(
        newRawLocation.latitude,
        newRawLocation.longitude,
        originalRoute,
        lastRouteUpdatePosition
      );

      if (shouldUpdateRemaining) {
        console.log(
          "✂️ Updating remaining route - trimming traveled portion"
        );
        const remainingRoute = createRemainingRoute(
          newRawLocation.latitude,
          newRawLocation.longitude,
          originalRoute
        );

        const traveledPortion = createTraveledRoute(
          newRawLocation.latitude,
          newRawLocation.longitude,
          originalRoute
        );

        setRoute(remainingRoute);
        setTraveledRoute(traveledPortion);
        setLastRouteUpdatePosition({
          lat: newRawLocation.latitude,
          lon: newRawLocation.longitude,
        });
      } else {
        console.log("📍 Position updated, no route changes needed");
      }
    }
  }, [destination, originalRoute, route, lastRouteUpdatePosition, mapRef]);

  // Auto-create route when userLocation becomes available
  const autoCreateRoute = useCallback(async () => {
    if (
      userLocation &&
      destination &&
      navigationState === "navigating" &&
      !route
    ) {
      console.log(
        "🚀 User position available - automatic route creation"
      );
      console.log("📍 From:", userLocation.latitude, userLocation.longitude);
      console.log(
        "📍 To:",
        destination.coordinates[1],
        destination.coordinates[0]
      );

      try {
        const routeResult = await createRouteToDestination(destination, userLocation);
        if (routeResult) {
          console.log(
            "✅ Route created automatically successfully:",
            routeResult
          );
          console.log(
            "📊 Route coordinates:",
            routeResult.features?.[0]?.geometry?.coordinates?.length,
            "points"
          );
        } else {
          console.error("❌ Automatic route creation failed");
        }
      } catch (error) {
        console.error("❌ Automatic route creation error:", error);
      }
    }
  }, [userLocation, destination, navigationState, route, createRouteToDestination]);

  return {
    // States
    route,
    originalRoute,
    traveledRoute,
    lastRouteUpdatePosition,
    
    // Setters
    setRoute,
    setOriginalRoute,
    setTraveledRoute,
    setLastRouteUpdatePosition,
    
    // Handlers
    handleDestinationSelected,
    handleExitVillage,
    handleNewDestination,
    updateRouteWithLocation,
    autoCreateRoute,
  };
}