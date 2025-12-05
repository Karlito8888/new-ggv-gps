import { useState, useCallback } from "react";
import {
  createRoute,
  shouldRecalculateRoute,
  updateRecalculationState,
  resetRecalculationState,
  createRemainingRoute,
  shouldUpdateRemainingRoute,
  createTraveledRoute,
  clearRouteSources,
  VILLAGE_EXIT_COORDS,
} from "../lib/navigation";

export function useRouteManager(
  mapRef,
  userLocation,
  destination,
  navigationState,
  setNavigationState,
  setDestination,
) {
  // Route states - kept for business logic (deviation detection, etc.)
  // Visual rendering is handled by native MapLibre sources
  const [route, setRoute] = useState(null);
  const [originalRoute, setOriginalRoute] = useState(null);
  const [traveledRoute, setTraveledRoute] = useState(null);
  const [lastRouteUpdatePosition, setLastRouteUpdatePosition] = useState(null);

  // Create route to destination
  const createRouteToDestination = useCallback(
    async (dest, currentUserLocation) => {
      if (!currentUserLocation) {
        if (import.meta.env.DEV) console.log("⏳ Waiting for user location...");
        return;
      }

      if (!dest.coordinates || !Array.isArray(dest.coordinates) || dest.coordinates.length < 2) {
        console.error("❌ Invalid destination coordinates:", dest.coordinates);
        throw new Error("Invalid destination coordinates");
      }

      if (import.meta.env.DEV) {
        console.log("🚀 Attempting route creation...");
        console.log("📍 From:", currentUserLocation.latitude, currentUserLocation.longitude);
        console.log("📍 To:", dest.coordinates[1], dest.coordinates[0]);
      }

      try {
        // createRoute() now updates native MapLibre sources directly
        const routeResult = await createRoute(
          currentUserLocation.latitude,
          currentUserLocation.longitude,
          dest.coordinates[1],
          dest.coordinates[0],
          mapRef.current?.getMap(),
        );

        // Keep FeatureCollection format for business logic
        const routeData = {
          type: "FeatureCollection",
          features: routeResult.type === "Feature" ? [routeResult] : routeResult.features || [],
        };

        if (import.meta.env.DEV) console.log("📍 Route created:", routeData);
        setRoute(routeData);
        setOriginalRoute(routeData);
        setLastRouteUpdatePosition({
          lat: currentUserLocation.latitude,
          lon: currentUserLocation.longitude,
        });

        updateRecalculationState(currentUserLocation.latitude, currentUserLocation.longitude);
        return routeData;
      } catch (error) {
        console.error("❌ Route creation error:", error);
        throw error;
      }
    },
    [mapRef],
  );

  // Route creation function - called when navigation starts
  const createRouteWhenReady = useCallback(
    async (dest, currentUserLocation) => {
      if (import.meta.env.DEV) {
        console.log("📍 Creating route for navigation:", dest);
        console.log("📍 User location available:", currentUserLocation ? "YES" : "NO");
      }

      resetRecalculationState();

      if (currentUserLocation) {
        await createRouteToDestination(dest, currentUserLocation);
        if (import.meta.env.DEV) console.log("🚀 Route created successfully");
      } else {
        if (import.meta.env.DEV) console.log("⏳ Waiting for user location...");

        setTimeout(() => {
          if (!currentUserLocation) {
            console.warn("⚠️ GPS unavailable after 30s");
          }
        }, 30000);
      }
    },
    [createRouteToDestination],
  );

  // Handle exit village
  const handleExitVillage = useCallback(async () => {
    const exitDestination = {
      blockNumber: "",
      lotNumber: "",
      coordinates: VILLAGE_EXIT_COORDS,
      address: "Salamat po !\n🙏 Ingat 🙏",
    };

    console.log("🚪 Exit village requested - starting navigation to exit");

    if (
      !VILLAGE_EXIT_COORDS ||
      !Array.isArray(VILLAGE_EXIT_COORDS) ||
      VILLAGE_EXIT_COORDS.length < 2
    ) {
      console.error("❌ Invalid village exit coordinates");
      return;
    }

    setDestination(exitDestination);
    setNavigationState("navigating");
    resetRecalculationState();

    if (userLocation) {
      try {
        // createRoute() updates native MapLibre sources directly
        const routeResult = await createRoute(
          userLocation.latitude,
          userLocation.longitude,
          VILLAGE_EXIT_COORDS[1],
          VILLAGE_EXIT_COORDS[0],
          mapRef.current?.getMap(),
        );

        const routeData = {
          type: "FeatureCollection",
          features: routeResult.type === "Feature" ? [routeResult] : routeResult.features || [],
        };

        setRoute(routeData);
        setOriginalRoute(routeData);
        setLastRouteUpdatePosition({
          lat: userLocation.latitude,
          lon: userLocation.longitude,
        });

        updateRecalculationState(userLocation.latitude, userLocation.longitude);

        console.log("✅ Exit route created successfully");
        return exitDestination;
      } catch (error) {
        console.error("Exit route creation error:", error);
        throw error;
      }
    }
    return exitDestination;
  }, [userLocation, mapRef, setDestination, setNavigationState]);

  // Handle new destination (reset all route states)
  const handleNewDestination = useCallback(() => {
    // Clear native MapLibre sources
    const map = mapRef.current?.getMap();
    if (map) {
      clearRouteSources(map);
    }

    setDestination(null);
    setNavigationState("welcome");
    setRoute(null);
    setOriginalRoute(null);
    setTraveledRoute(null);
    setLastRouteUpdatePosition(null);
  }, [setDestination, setNavigationState, mapRef]);

  // Update route based on new user location
  const updateRouteWithLocation = useCallback(
    async (newRawLocation, previousUserLocation) => {
      if (!destination || !originalRoute) return;

      const map = mapRef.current?.getMap();

      // Check if we need to recalculate the entire route (user is off-route)
      const shouldRecalc = shouldRecalculateRoute(
        newRawLocation.latitude,
        newRawLocation.longitude,
        route,
        false,
        previousUserLocation?.latitude,
        previousUserLocation?.longitude,
        map,
      );

      if (shouldRecalc) {
        console.log("🔄 Automatic recalculation triggered - user is off route");
        try {
          // createRoute() updates native MapLibre sources directly
          const routeResult = await createRoute(
            newRawLocation.latitude,
            newRawLocation.longitude,
            destination.coordinates[1],
            destination.coordinates[0],
            map,
          );

          const routeData = {
            type: "FeatureCollection",
            features: routeResult.type === "Feature" ? [routeResult] : routeResult.features || [],
          };

          setRoute(routeData);
          setOriginalRoute(routeData);
          setLastRouteUpdatePosition({
            lat: newRawLocation.latitude,
            lon: newRawLocation.longitude,
          });

          updateRecalculationState(newRawLocation.latitude, newRawLocation.longitude);
        } catch (error) {
          console.error("Route update error:", error);
        }
      } else {
        // Check if we should update the remaining route (progressive route trimming)
        const shouldUpdateRemaining = shouldUpdateRemainingRoute(
          newRawLocation.latitude,
          newRawLocation.longitude,
          originalRoute,
          lastRouteUpdatePosition,
        );

        if (shouldUpdateRemaining) {
          console.log("✂️ Updating remaining route - trimming traveled portion");

          // These functions now update native MapLibre sources directly
          const remainingRoute = createRemainingRoute(
            newRawLocation.latitude,
            newRawLocation.longitude,
            originalRoute,
            map,
          );

          const traveledPortion = createTraveledRoute(
            newRawLocation.latitude,
            newRawLocation.longitude,
            originalRoute,
            map,
          );

          // Keep state for business logic
          setRoute(remainingRoute);
          setTraveledRoute(traveledPortion);
          setLastRouteUpdatePosition({
            lat: newRawLocation.latitude,
            lon: newRawLocation.longitude,
          });
        }
      }
    },
    [destination, originalRoute, route, lastRouteUpdatePosition, mapRef],
  );

  // Auto-create route when userLocation becomes available
  const autoCreateRoute = useCallback(async () => {
    if (
      userLocation &&
      destination &&
      destination.coordinates &&
      Array.isArray(destination.coordinates) &&
      destination.coordinates.length >= 2 &&
      navigationState === "navigating" &&
      !route
    ) {
      console.log("🚀 User position available - automatic route creation");
      console.log("📍 From:", userLocation.latitude, userLocation.longitude);
      console.log("📍 To:", destination.coordinates[1], destination.coordinates[0]);

      try {
        const routeResult = await createRouteToDestination(destination, userLocation);
        if (routeResult) {
          console.log("✅ Route created automatically:", routeResult);
        } else {
          console.error("❌ Automatic route creation failed");
        }
      } catch (error) {
        console.error("❌ Automatic route creation error:", error);
      }
    }
  }, [userLocation, destination, navigationState, route, createRouteToDestination]);

  return {
    // States (kept for business logic, not for rendering)
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
    createRouteWhenReady,
    handleExitVillage,
    handleNewDestination,
    updateRouteWithLocation,
    autoCreateRoute,
  };
}
