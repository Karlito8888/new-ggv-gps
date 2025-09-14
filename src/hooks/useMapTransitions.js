import { useEffect, useCallback, useRef } from "react";

/**
 * Hook for managing map transitions - VERSION ULTRA SIMPLIFIÉE
 * Utilise directement les API natives de MapLibre GL JS
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
  getCurrentOrientation,
  setOrientationEnabled
}) {
  // Protection simple contre les animations multiples
  const isTransitioning = useRef(false);

  // Dynamic pitch update - ultra simple
  useEffect(() => {
    if (!mapRef.current?.getMap() || !isMapReady || isTransitioning.current) return;
    
    isTransitioning.current = true;
    const map = mapRef.current.getMap();
    
    map.easeTo({
      pitch: adaptivePitch,
      duration: pitchMode === 'cinematic' ? 1200 : 600,
      essential: true
    });
    
    setTimeout(() => {
      isTransitioning.current = false;
    }, pitchMode === 'cinematic' ? 1200 : 600);
    
  }, [adaptivePitch, pitchMode, mapRef, isMapReady]);

  // Device orientation effect - ultra simple
  useEffect(() => {
    if (!mapRef.current?.getMap() || !isMapReady || !orientationEnabled || !isActive || navigationState !== "navigating" || isTransitioning.current) return;
    
    isTransitioning.current = true;
    const map = mapRef.current.getMap();
    
    map.easeTo({
      bearing: compass,
      duration: 300,
      essential: true
    });
    
    setTimeout(() => {
      isTransitioning.current = false;
    }, 300);
    
  }, [compass, isActive, orientationEnabled, navigationState, mapRef, isMapReady]);

  // Handle orientation toggle - ultra simple
  const handleOrientationToggle = useCallback(async (enabled) => {
    setOrientationEnabled(enabled);
    
    if (!mapRef.current?.getMap() || !isMapReady) return;
    
    try {
      const targetBearing = enabled ? await getCurrentOrientation() : 0;
      const map = mapRef.current.getMap();
      
      map.easeTo({
        bearing: targetBearing,
        duration: 600,
        essential: true
      });
    } catch (error) {
      console.error('Orientation toggle error:', error);
    }
  }, [mapRef, isMapReady, getCurrentOrientation, setOrientationEnabled]);

  return {
    handleOrientationToggle,
  };
}