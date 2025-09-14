import { useEffect } from 'react';

/**
 * Hook pour gérer l'affichage des polygones de blocs sur la carte
 * Gère le cycle de vie complet des polygones (création, mise à jour, suppression)
 */
export function useBlockPolygons({
  mapRef,
  isMapReady,
  mapType,
  blocksGeoJSON
}) {
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current.getMap();
    if (!map) {
      console.warn("Map instance not available for polygon management");
      return;
    }

    const manageBlockPolygons = () => {
      try {
        if (mapType === "osm") {
          // OSM mode: add polygons
          if (!map.getSource("blocks")) {
            map.addSource("blocks", {
              type: "geojson",
              data: blocksGeoJSON,
            });
          }

          // Add polygon layers if they don't exist
          if (!map.getLayer("blocks-fill")) {
            map.addLayer({
              id: "blocks-fill",
              type: "fill",
              source: "blocks",
              paint: {
                "fill-color": ["get", "color"],
                "fill-opacity": 0.8,
                "fill-outline-color": "#999",
              },
            });
          }

          if (!map.getLayer("blocks-border")) {
            map.addLayer({
              id: "blocks-border",
              type: "line",
              source: "blocks",
              paint: {
                "line-color": "#999",
                "line-width": 1,
                "line-opacity": 1.0,
              },
            });
          }
        } else {
          // Satellite mode: remove polygons
          if (map.getLayer("blocks-fill")) {
            map.removeLayer("blocks-fill");
          }
          if (map.getLayer("blocks-border")) {
            map.removeLayer("blocks-border");
          }
          if (map.getSource("blocks")) {
            map.removeSource("blocks");
          }
        }
      } catch (error) {
        console.error("Error managing block polygons:", error.message);
      }
    };

    // If style is already loaded, manage immediately
    if (map.isStyleLoaded()) {
      manageBlockPolygons();
    } else {
      // Otherwise, wait for style to load
      map.once('styledata', manageBlockPolygons);
    }

    // Cleanup function - ensures proper cleanup when component unmounts or dependencies change
    return () => {
      if (map && map.isStyleLoaded()) {
        try {
          if (map.getLayer("blocks-fill")) {
            map.removeLayer("blocks-fill");
          }
          if (map.getLayer("blocks-border")) {
            map.removeLayer("blocks-border");
          }
          if (map.getSource("blocks")) {
            map.removeSource("blocks");
          }
        } catch (cleanupError) {
          console.warn("Error during polygon cleanup:", cleanupError.message);
        }
      }
    };
  }, [mapType, isMapReady, blocksGeoJSON, mapRef]);
}