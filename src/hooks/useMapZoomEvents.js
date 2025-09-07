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
        const currentZoom = map.getZoom();
        console.log("🔍 Zoom actuel:", currentZoom.toFixed(2));
      };

      // Log initial du zoom
      handleZoomChange();

      // Listen to zoom changes
      map.on("zoom", handleZoomChange);
      map.on("zoomend", () => {
        const finalZoom = map.getZoom();
        console.log("🔍 Zoom final:", finalZoom.toFixed(2));
      });

      // Cleanup
      return () => {
        map.off("zoom", handleZoomChange);
        map.off("zoomend", handleZoomChange);
      };
    }
  }, [isMapReady, mapRef]);
}