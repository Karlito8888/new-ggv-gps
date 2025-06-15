// Custom hook for managing navigation state transitions
// Handles permission -> welcome -> navigating -> arrived flow

import { useState, useCallback } from 'react';

/**
 * Navigation states enum
 */
export const NAVIGATION_STATES = {
  PERMISSION: 'permission',
  WELCOME: 'welcome', 
  NAVIGATING: 'navigating',
  ARRIVED: 'arrived',
};

/**
 * Custom hook for navigation state management
 * @returns {Object} Navigation state and handlers
 */
export function useNavigationState() {
  const [navigationState, setNavigationState] = useState(NAVIGATION_STATES.PERMISSION);
  const [destination, setDestination] = useState(null);

  // State transition handlers
  const handleLocationPermissionGranted = useCallback((position) => {
    console.log('📍 Location permission granted:', position);
    setNavigationState(NAVIGATION_STATES.WELCOME);
  }, []);

  const handleLocationPermissionDenied = useCallback((errorMessage) => {
    console.error('❌ Location permission denied:', errorMessage);
    // Still allow user to proceed to welcome screen
    setNavigationState(NAVIGATION_STATES.WELCOME);
  }, []);

  const handleDestinationSelected = useCallback((dest) => {
    console.log('🎯 Destination selected:', dest);
    setDestination(dest);
    setNavigationState(NAVIGATION_STATES.NAVIGATING);
  }, []);

  const handleArrival = useCallback(() => {
    console.log('🏁 Arrived at destination');
    setNavigationState(NAVIGATION_STATES.ARRIVED);
  }, []);

  const handleNewDestination = useCallback(() => {
    console.log('🔄 Starting new navigation');
    setDestination(null);
    setNavigationState(NAVIGATION_STATES.WELCOME);
  }, []);

  const handleExitVillage = useCallback(() => {
    console.log('🚪 Exiting village');
    // This will be handled by the route management hook
    setNavigationState(NAVIGATION_STATES.NAVIGATING);
  }, []);

  const handleBackToPermission = useCallback(() => {
    console.log('🔙 Back to permission screen');
    setDestination(null);
    setNavigationState(NAVIGATION_STATES.PERMISSION);
  }, []);

  const handleBackToNavigation = useCallback(() => {
    console.log('🔙 Back to navigation');
    setNavigationState(NAVIGATION_STATES.NAVIGATING);
  }, []);

  // State checkers
  const isPermissionState = navigationState === NAVIGATION_STATES.PERMISSION;
  const isWelcomeState = navigationState === NAVIGATION_STATES.WELCOME;
  const isNavigatingState = navigationState === NAVIGATION_STATES.NAVIGATING;
  const isArrivedState = navigationState === NAVIGATION_STATES.ARRIVED;

  return {
    // Current state
    navigationState,
    destination,
    
    // State checkers
    isPermissionState,
    isWelcomeState,
    isNavigatingState,
    isArrivedState,
    
    // State setters (for direct control if needed)
    setNavigationState,
    setDestination,
    
    // Event handlers
    handlers: {
      onLocationPermissionGranted: handleLocationPermissionGranted,
      onLocationPermissionDenied: handleLocationPermissionDenied,
      onDestinationSelected: handleDestinationSelected,
      onArrival: handleArrival,
      onNewDestination: handleNewDestination,
      onExitVillage: handleExitVillage,
      onBackToPermission: handleBackToPermission,
      onBackToNavigation: handleBackToNavigation,
    },
  };
}

export default useNavigationState;