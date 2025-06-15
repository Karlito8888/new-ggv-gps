// Custom hook for route creation, management, and updates
// Handles route calculation, recalculation, and MapLibre integration

import { useState, useCallback, useEffect } from 'react';
import {
  createRoute,
  updateNavigationRoute,
  shouldRecalculateRoute,
  updateRecalculationState,
  resetRecalculationState,
  createRemainingRoute,
  shouldUpdateRemainingRoute,
  createTraveledRoute,
  VILLAGE_EXIT_COORDS,
} from '../lib/navigation.js';
import { formatRouteForMapLibre } from '../lib/mapUtils.js';

/**
 * Custom hook for route management
 * @param {Object} locationTracking - Location tracking hook data
 * @param {Object} navigationState - Navigation state hook data
 * @returns {Object} Route data and management functions
 */
export function useRouteManagement(locationTracking, navigationState) {
  const [route, setRoute] = useState(null);
  const [originalRoute, setOriginalRoute] = useState(null);
  const [traveledRoute, setTraveledRoute] = useState(null);
  const [lastRouteUpdatePosition, setLastRouteUpdatePosition] = useState(null);
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);

  const { userLocation } = locationTracking;
  const { destination, isNavigatingState } = navigationState;

  /**
   * Create a new route to destination
   * @param {Object} dest - Destination object
   * @param {Object} userLoc - User location object
   */
  const createNewRoute = useCallback(async (dest, userLoc) => {
    if (!dest || !userLoc) {
      console.error('❌ Missing destination or user location for route creation');
      return;
    }

    console.log('🛣️ Creating new route...', {
      from: [userLoc.latitude, userLoc.longitude],
      to: dest.coordinates,
    });

    setIsCreatingRoute(true);
    setRouteError(null);

    try {
      // Reset recalculation state for new navigation
      resetRecalculationState();

      // Update MapLibre native route with bearings
      updateNavigationRoute(
        userLoc.latitude,
        userLoc.longitude,
        dest.coordinates[1],
        dest.coordinates[0],
        0 // Device bearing handled by MapLibre native controls
      );

      // Create traditional route for display
      const routeResult = await createRoute(
        userLoc.latitude,
        userLoc.longitude,
        dest.coordinates[1],
        dest.coordinates[0]
      );

      // Format for MapLibre
      const routeData = formatRouteForMapLibre(routeResult);

      if (routeData) {
        setRoute(routeData);
        setOriginalRoute(routeData);
        setLastRouteUpdatePosition({
          lat: userLoc.latitude,
          lon: userLoc.longitude,
        });

        // Update recalculation state after successful route creation
        updateRecalculationState(userLoc.latitude, userLoc.longitude);
        
        console.log('✅ Route created successfully');
      } else {
        throw new Error('Failed to format route data');
      }
    } catch (error) {
      console.error('❌ Error creating route:', error);
      setRouteError(error.message);
    } finally {
      setIsCreatingRoute(false);
    }
  }, []);

  /**
   * Create exit route to village exit
   * @param {Object} userLoc - User location object (optional, will use current location if not provided)
   */
  const createExitRoute = useCallback(async (userLoc = null) => {
    const currentUserLocation = userLoc || userLocation;
    
    if (!currentUserLocation) {
      console.error('❌ Missing user location for exit route');
      return null;
    }

    const exitDestination = {
      blockNumber: "",
      lotNumber: "",
      coordinates: VILLAGE_EXIT_COORDS,
      address: "Salamat po !\n🙏 Ingat 🙏",
    };

    console.log('🚪 Creating exit route...');
    await createNewRoute(exitDestination, currentUserLocation);
    
    return exitDestination;
  }, [createNewRoute, userLocation]);

  /**
   * Handle route recalculation when user goes off-route
   * @param {Object} userLoc - Current user location
   */
  const handleRouteRecalculation = useCallback(async (userLoc) => {
    if (!destination || !originalRoute || !userLoc) return;

    const shouldRecalc = shouldRecalculateRoute(
      userLoc.latitude,
      userLoc.longitude,
      route
    );

    if (shouldRecalc) {
      console.log('🔄 Automatic recalculation triggered - user is off route');
      
      try {
        const routeResult = await createRoute(
          userLoc.latitude,
          userLoc.longitude,
          destination.coordinates[1],
          destination.coordinates[0]
        );

        const routeData = formatRouteForMapLibre(routeResult);

        if (routeData) {
          setRoute(routeData);
          setOriginalRoute(routeData);
          setLastRouteUpdatePosition({
            lat: userLoc.latitude,
            lon: userLoc.longitude,
          });

          // Update recalculation state after successful recalculation
          updateRecalculationState(userLoc.latitude, userLoc.longitude);
          console.log('✅ Route recalculated successfully');
        }
      } catch (error) {
        console.error('❌ Error recalculating route:', error);
        setRouteError(error.message);
      }
    }
  }, [destination, originalRoute, route]);

  /**
   * Handle progressive route trimming (remove traveled portions)
   * @param {Object} userLoc - Current user location
   */
  const handleRouteUpdate = useCallback((userLoc) => {
    if (!originalRoute || !lastRouteUpdatePosition || !userLoc) return;

    const shouldUpdateRemaining = shouldUpdateRemainingRoute(
      userLoc.latitude,
      userLoc.longitude,
      originalRoute,
      lastRouteUpdatePosition
    );

    if (shouldUpdateRemaining) {
      console.log('✂️ Updating remaining route - trimming traveled portion');
      
      try {
        const remainingRoute = createRemainingRoute(
          userLoc.latitude,
          userLoc.longitude,
          originalRoute
        );

        const traveledPortion = createTraveledRoute(
          userLoc.latitude,
          userLoc.longitude,
          originalRoute
        );

        setRoute(remainingRoute);
        setTraveledRoute(traveledPortion);
        setLastRouteUpdatePosition({
          lat: userLoc.latitude,
          lon: userLoc.longitude,
        });

        console.log('✅ Route updated successfully');
      } catch (error) {
        console.error('❌ Error updating route:', error);
      }
    } else {
      console.log('📍 Position updated, no route changes needed');
    }
  }, [originalRoute, lastRouteUpdatePosition]);

  /**
   * Clear all route data
   */
  const clearRoute = useCallback(() => {
    console.log('🧹 Clearing route data');
    setRoute(null);
    setOriginalRoute(null);
    setTraveledRoute(null);
    setLastRouteUpdatePosition(null);
    setRouteError(null);
    resetRecalculationState();
  }, []);

  // Auto-manage routes based on location updates during navigation
  useEffect(() => {
    if (!isNavigatingState || !userLocation || !destination) return;

    // First try recalculation (if user is off-route)
    handleRouteRecalculation(userLocation);
    
    // Then try progressive route update (if still on-route)
    handleRouteUpdate(userLocation);
  }, [
    userLocation,
    destination,
    isNavigatingState,
    handleRouteRecalculation,
    handleRouteUpdate,
  ]);

  return {
    // Route data
    route,
    originalRoute,
    traveledRoute,
    lastRouteUpdatePosition,
    
    // Status
    isCreatingRoute,
    routeError,
    hasRoute: !!route,
    
    // Route management functions
    createNewRoute,
    createExitRoute,
    clearRoute,
    
    // Manual control functions (if needed)
    handleRouteRecalculation,
    handleRouteUpdate,
  };
}

export default useRouteManagement;