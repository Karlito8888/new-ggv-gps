import { useEffect } from 'react';

/**
 * Hook pour gérer les événements de zoom de la carte
 */
export function useMapZoomEvents({
  mapRef,
  isMapReady
}) {
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      const map = mapRef.current.getMap();

      const handleZoomChange = () => {
        // Zoom change handler - no logging needed
      };

      // Log initial du zoom
      handleZoomChange();

      // Listen to zoom changes
      map.on("zoom", handleZoomChange);
      map.on("zoomend", () => {
        // Zoom end handler - no logging needed
      });

      // Cleanup
      return () => {
        map.off("zoom", handleZoomChange);
        map.off("zoomend", handleZoomChange);
      };
    }
  }, [isMapReady, mapRef]);
}