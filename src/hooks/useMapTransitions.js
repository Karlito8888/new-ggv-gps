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

  // Dynamic pitch update - optimized with flyTo()
  useEffect(() => {
    if (!mapRef.current?.getMap() || !isMapReady || isTransitioning.current) return;
    
    isTransitioning.current = true;
    const map = mapRef.current.getMap();
    
    // Utiliser flyTo() pour une transition plus fluide du pitch
    map.flyTo({
      pitch: adaptivePitch,
      duration: pitchMode === 'cinematic' ? 1200 : 600,
      speed: 0.8,
      curve: 1,
      essential: true
    });
    
    setTimeout(() => {
      isTransitioning.current = false;
    }, pitchMode === 'cinematic' ? 1200 : 600);
    
  }, [adaptivePitch, pitchMode, mapRef, isMapReady]);

  // Device orientation effect - optimized with flyTo()
  useEffect(() => {
    if (!mapRef.current?.getMap() || !isMapReady || !orientationEnabled || !isActive || navigationState !== "navigating" || isTransitioning.current) return;
    
    isTransitioning.current = true;
    const map = mapRef.current.getMap();
    
    // Utiliser flyTo() pour une transition plus fluide du bearing
    map.flyTo({
      bearing: compass,
      duration: 300,
      speed: 1.2,
      curve: 1,
      essential: true
    });
    
    setTimeout(() => {
      isTransitioning.current = false;
    }, 300);
    
  }, [compass, isActive, orientationEnabled, navigationState, mapRef, isMapReady]);

  // Handle orientation toggle - optimized with flyTo()
  const handleOrientationToggle = useCallback(async (enabled) => {
    setOrientationEnabled(enabled);
    
    if (!mapRef.current?.getMap() || !isMapReady) return;
    
    try {
      const targetBearing = enabled ? await getCurrentOrientation() : 0;
      const map = mapRef.current.getMap();
      
      // Utiliser flyTo() pour une transition plus fluide
      map.flyTo({
        bearing: targetBearing,
        duration: 600,
        speed: 1,
        curve: 1.2,
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