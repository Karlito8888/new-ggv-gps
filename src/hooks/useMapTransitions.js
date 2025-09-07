import { useEffect, useCallback } from "react";
import { applyOptimalTransition, shouldTransition } from "../utils/mapTransitions";

/**
 * Hook for managing map transitions (pitch, bearing, orientation)
 * Merges functionality from useMapEffects.js and useDeviceOrientationManager.js
 */
export function useMapTransitions({
  mapRef,
  isMapReady,
  adaptivePitch,
  pitchMode,
  compass,
  isActive,
  orientationEnabled,
  navigationState,
  speedKmh,
  getCurrentOrientation,
  setOrientationEnabled
}) {
  // Dynamic pitch update with optimal transitions
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      const map = mapRef.current.getMap();

      // Use shouldTransition to check if update is needed
      if (shouldTransition(map.getPitch(), adaptivePitch, 2)) {
        console.log(
          `🎥 Updating pitch: ${map.getPitch().toFixed(1)}° → ${adaptivePitch}°`
        );

        // Use optimal transitions
        applyOptimalTransition(map, {
          pitch: adaptivePitch,
          speed: speedKmh,
          source: "adaptive-pitch",
          context: pitchMode === "cinematic" ? "cinematic" : "navigation",
        }).catch((error) => {
          console.error("Error during pitch transition:", error);
        });
      }
    }
  }, [adaptivePitch, pitchMode, speedKmh, mapRef, isMapReady]);

  // Device orientation effect - update map bearing with device compass
  useEffect(() => {
    if (mapRef.current && isMapReady && orientationEnabled && isActive && navigationState === "navigating") {
      const map = mapRef.current.getMap();
      
      // Use shouldTransition to check if bearing update is needed
      const currentBearing = map.getBearing();
      const targetBearing = compass;
      
      // Calculate bearing difference (accounting for 360° wraparound)
      let bearingDiff = Math.abs(targetBearing - currentBearing);
      if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;
      
      if (shouldTransition(currentBearing, targetBearing, 5)) {
        console.log(
          `🧭 Updating bearing: ${currentBearing.toFixed(1)}° → ${targetBearing.toFixed(1)}°`
        );

        // Use optimal transitions for smooth bearing updates
        applyOptimalTransition(map, {
          bearing: targetBearing,
          speed: speedKmh,
          source: "device-orientation",
          context: "navigation",
        }).catch((error) => {
          console.error("Error during bearing transition:", error);
        });
      }
    }
  }, [compass, isActive, orientationEnabled, navigationState, speedKmh, mapRef, isMapReady]);

  // Handle orientation toggle
  const handleOrientationToggle = useCallback(async (enabled) => {
    console.log(`🧭 [handleOrientationToggle] Orientation ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      console.log('🧭 [handleOrientationToggle] Enabling orientation...');
      
      // First, capture current orientation before setting state
      let currentOrientation = null;
      if (mapRef.current && isMapReady) {
        try {
          console.log('🧭 [handleOrientationToggle] Capturing current device orientation for immediate sync...');
          console.log('🧭 [handleOrientationToggle] Map state:', { 
            mapExists: !!mapRef.current, 
            isReady: isMapReady,
            getCurrentOrientation: typeof getCurrentOrientation 
          });
          
          // Add a small delay to ensure permission is fully granted (iOS timing issue)
          await new Promise(resolve => setTimeout(resolve, 100));
          
          currentOrientation = await getCurrentOrientation();
          console.log(`🧭 [handleOrientationToggle] Captured orientation: ${currentOrientation}°`);
          
        } catch (error) {
          console.error('❌ [handleOrientationToggle] Failed to capture initial orientation:', error);
          // Continue anyway - we'll sync when tracking starts
        }
      }
      
      // Now enable orientation state
      console.log('🧭 [handleOrientationToggle] Setting orientation enabled state...');
      setOrientationEnabled(true);
      
      // Apply the captured orientation if we have it
      if (currentOrientation !== null && mapRef.current && isMapReady) {
        try {
          console.log(`🧭 [handleOrientationToggle] Applying captured orientation to map: ${currentOrientation.toFixed(1)}°`);
          const map = mapRef.current.getMap();
          
          // Apply current orientation immediately to the map
          await applyOptimalTransition(map, {
            bearing: currentOrientation,
            speed: speedKmh,
            source: "orientation-sync",
            context: "navigation",
          });
          
          console.log('✅ [handleOrientationToggle] Map synchronized with captured device orientation');
        } catch (error) {
          console.error('❌ [handleOrientationToggle] Failed to apply orientation to map:', error);
        }
      } else {
        console.warn('⚠️ [handleOrientationToggle] No valid orientation captured, continuous tracking will handle sync');
      }
      
    } else {
      console.log('🧭 [handleOrientationToggle] Disabling orientation...');
      // Disabling orientation - reset map bearing to north
      setOrientationEnabled(false);
      
      if (mapRef.current && isMapReady) {
        const map = mapRef.current.getMap();
        applyOptimalTransition(map, {
          bearing: 0,
          speed: speedKmh,
          source: "orientation-reset",
          context: "navigation",
        }).catch((error) => {
          console.error("❌ [handleOrientationToggle] Error resetting bearing:", error);
        });
      }
    }
  }, [mapRef, isMapReady, getCurrentOrientation, speedKmh, setOrientationEnabled]);

  return {
    handleOrientationToggle,
  };
}