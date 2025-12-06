import { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { blocks } from "../data/blocks";

const VILLAGE_CENTER = [120.95134859887523, 14.347872973134175];

// Calculate centroid of polygon
function getCentroid(coords) {
  let x = 0,
    y = 0;
  for (const [lng, lat] of coords) {
    x += lng;
    y += lat;
  }
  return [x / coords.length, y / coords.length];
}

const labelsGeoJSON = {
  type: "FeatureCollection",
  features: blocks.map((block) => ({
    type: "Feature",
    properties: { name: block.name },
    geometry: { type: "Point", coordinates: getCentroid(block.coords) },
  })),
};

function addBlocksLayer(map) {
  if (map.getSource("block-labels")) return;

  // Block labels only
  map.addSource("block-labels", { type: "geojson", data: labelsGeoJSON });
  map.addLayer({
    id: "block-labels",
    type: "symbol",
    source: "block-labels",
    layout: {
      "text-field": ["get", "name"],
      "text-size": 14,
      "text-anchor": "center",
      "text-font": ["Noto Sans Regular"],
    },
    paint: {
      "text-color": "#333",
      "text-halo-color": "#fff",
      "text-halo-width": 1,
    },
  });
}

/**
 * Hook to initialize MapLibre map with GPS tracking via GeolocateControl.
 *
 * @param {React.RefObject<HTMLDivElement>} containerRef - Ref to the map container element
 * @returns {{
 *   map: maplibregl.Map | null,
 *   userLocation: { latitude: number, longitude: number } | null,
 *   isMapReady: boolean,
 *   triggerGeolocate: () => Promise<GeolocationPosition>
 * }}
 */
export function useMapSetup(containerRef) {
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const geolocateRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    let mapInstance = null;

    const initMap = async () => {
      // Fetch and fix the OpenFreeMap Liberty style
      const response = await fetch("https://tiles.openfreemap.org/styles/liberty");
      const style = await response.json();

      // Fix: Use MapLibre official font server (OpenFreeMap fonts return 404)
      style.glyphs = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

      mapInstance = new maplibregl.Map({
        container: containerRef.current,
        style: style,
        center: VILLAGE_CENTER,
        zoom: 15,
      });

      // Fix: Create transparent placeholder for missing sprite images
      mapInstance.on("styleimagemissing", (e) => {
        if (!mapInstance.hasImage(e.id)) {
          mapInstance.addImage(e.id, {
            width: 1,
            height: 1,
            data: new Uint8Array(4),
          });
        }
      });

      mapInstance.on("load", () => {
        addBlocksLayer(mapInstance);

        const geolocate = new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        });
        mapInstance.addControl(geolocate);
        geolocateRef.current = geolocate;

        geolocate.on("geolocate", (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        });

        setIsMapReady(true);
      });

      setMap(mapInstance);
    };

    initMap();

    return () => {
      if (mapInstance) mapInstance.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Triggers the native GeolocateControl to request GPS permission and start tracking.
   *
   * This function:
   * 1. Calls geolocate.trigger() which prompts the native iOS/Android permission dialog
   * 2. Waits for either 'geolocate' (success) or 'error' (denied/unavailable) events
   * 3. Returns a Promise that resolves with position or rejects with error
   *
   * The browser remembers the user's choice:
   * - If granted: no popup on subsequent calls, tracking starts immediately
   * - If denied: blocked until user changes browser settings
   *
   * @returns {Promise<GeolocationPosition>} Resolves with position if permission granted
   * @throws {Error} Rejects if permission denied or GeolocateControl not ready
   */
  const triggerGeolocate = () => {
    return new Promise((resolve, reject) => {
      if (!geolocateRef.current) {
        reject(new Error("GeolocateControl not ready"));
        return;
      }

      const geolocate = geolocateRef.current;

      // One-time listeners for this trigger
      const onSuccess = (pos) => {
        geolocate.off("geolocate", onSuccess);
        geolocate.off("error", onError);
        resolve(pos);
      };

      const onError = (err) => {
        geolocate.off("geolocate", onSuccess);
        geolocate.off("error", onError);
        reject(err);
      };

      geolocate.on("geolocate", onSuccess);
      geolocate.on("error", onError);

      geolocate.trigger();
    });
  };

  return { map, userLocation, isMapReady, triggerGeolocate };
}
