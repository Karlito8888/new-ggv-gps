import { useEffect, useCallback } from 'react';

/**
 * Hook spécialisé pour la gestion des permissions GPS
 * Gère l'auto-trigger, retry mechanism et transitions d'états
 */
const useGpsPermission = ({
  navigationState,
  isMapReady,
  mapRef,
  geolocateControlRef,
  handleGpsPermissionGranted,
  handleGpsPermissionDenied
}) => {
  // Robust GPS auto-trigger with retry mechanism
  const triggerGpsWithRetry = useCallback(async () => {
    console.log("🚀 Starting GPS auto-trigger sequence");
    
    // Double-check all conditions
    if (!isMapReady) {
      console.warn("⚠️ Map not ready yet for GPS trigger");
      return false;
    }
    
    if (!mapRef?.current) {
      console.warn("⚠️ Map ref not available for GPS trigger");
      return false;
    }
    
    if (!geolocateControlRef?.current) {
      console.warn("⚠️ GeolocateControl ref not available - waiting...");
      // Retry after short delay - ref might not be initialized yet
      return false;
    }
    
    try {
      console.log("🎯 All GPS conditions met - triggering GeolocateControl");
      geolocateControlRef.current.trigger();
      return true;
    } catch (error) {
      console.error("❌ GPS trigger failed:", error);
      return false;
    }
  }, [isMapReady, mapRef, geolocateControlRef]);
  
  // Auto-trigger GPS with robust retry mechanism
  useEffect(() => {
    if (navigationState !== "gps-permission") {
      console.log(`📱 Not in gps-permission state (current: ${navigationState})`);
      return;
    }
    
    console.log("📍 GPS Permission state entered - starting auto-trigger");
    
    let retryCount = 0;
    const maxRetries = 10;
    const retryDelay = 500; // ms
    const maxWaitTime = 5000; // ms
    
    const attemptGpsTrigger = async () => {
      const success = await triggerGpsWithRetry();
      
      if (success) {
        console.log("✅ GPS auto-trigger successful");
        return;
      }
      
      retryCount++;
      console.log(`🔄 GPS trigger attempt ${retryCount}/${maxRetries} failed`);
      
      if (retryCount < maxRetries) {
        console.log(`⏳ Retrying GPS trigger in ${retryDelay}ms...`);
        setTimeout(attemptGpsTrigger, retryDelay);
      } else {
        console.error("💀 GPS auto-trigger failed after all retries - proceeding to welcome");
        handleGpsPermissionDenied("Auto-trigger failed after retries");
      }
    };
    
    // Start attempt sequence
    const initialDelay = 100; // Small delay to ensure everything is initialized
    const initialTimer = setTimeout(attemptGpsTrigger, initialDelay);
    
    // Safety timeout - if nothing happens after 5 seconds, give up
    const safetyTimer = setTimeout(() => {
      console.error("⏰ GPS auto-trigger timeout - forcing fallback to welcome");
      handleGpsPermissionDenied("Auto-trigger timeout");
    }, maxWaitTime);
    
    return () => {
      clearTimeout(initialTimer);
      clearTimeout(safetyTimer);
    };
  }, [
    navigationState, 
    triggerGpsWithRetry, 
    handleGpsPermissionDenied
  ]);
  
  // GPS success handler
  const handleGpsSuccess = useCallback((e) => {
    const location = {
      latitude: e.coords.latitude,
      longitude: e.coords.longitude,
      accuracy: e.coords.accuracy,
      heading: e.coords.heading,
      speed: e.coords.speed,
      timestamp: e.timestamp,
    };
    
    console.log("📍 GPS success - location received:", location);
    
    // Transition from gps-permission to welcome state when GPS is successful
    if (navigationState === "gps-permission") {
      console.log("🎉 GPS permission granted - transitioning to welcome screen");
      handleGpsPermissionGranted();
    }
    
    return location;
  }, [navigationState, handleGpsPermissionGranted]);
  
  // GPS error handler  
  const handleGpsError = useCallback((e) => {
    console.error("❌ GPS error received:", e);
    
    // If GPS fails during gps-permission state, still show welcome screen
    if (navigationState === "gps-permission") {
      console.log("⚠️ GPS permission denied or failed - proceeding to welcome screen");
      handleGpsPermissionDenied(e.message || "GPS permission denied");
    }
  }, [navigationState, handleGpsPermissionDenied]);
  
  return {
    handleGpsSuccess,
    handleGpsError,
  };
};

export default useGpsPermission;