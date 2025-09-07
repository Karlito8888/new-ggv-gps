import { useEffect } from 'react';

/**
 * Hook pour gérer l'affichage des polygones de blocs sur la carte
 */
export function useBlockPolygons({
  mapRef,
  isMapReady,
  mapType,
  blocksGeoJSON
}) {
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      const map = mapRef.current.getMap();

      const manageBlockPolygons = () => {
        try {
          if (mapType === "osm") {
            // OSM mode: add polygons
            if (!map.getSource("blocks")) {
              // Add blocks source
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

            console.log("🗺️ Block polygons displayed (OSM mode)");
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
            console.log("🗺️ Block polygons hidden (satellite mode)");
          }
        } catch (error) {
          console.error("❌ Error managing polygons:", error);
        }
      };

      // If style is already loaded, manage immediately
      if (map.isStyleLoaded()) {
        manageBlockPolygons();
      } else {
        // Otherwise, wait for style to load
        map.once('styledata', manageBlockPolygons);
      }
    }
  }, [mapType, isMapReady, blocksGeoJSON, mapRef]);
}