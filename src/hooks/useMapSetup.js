import { useState, useEffect, useRef } from "react";
import { blocks } from "../data/blocks";
import destinationMarkerImg from "../assets/default-marker.png";
import protomapsLightLayers from "../data/protomaps-light-layers.json";
import "../styles/maplibre-gl.css";

// Eagerly start downloading map libraries at module parse time
// (overlaps with React render cycle instead of waiting for useEffect)
const mapLibsPromise = Promise.all([import("maplibre-gl"), import("pmtiles")]);

/** @type {[number, number]} */
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
 * Uses dynamic import for MapLibre to enable code-splitting and lazy loading.
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
  const maplibreRefForCleanup = useRef(null);

  // Initialize map with lazy-loaded MapLibre
  useEffect(() => {
    if (!containerRef.current) return;

    let mapInstance = null;
    let isCancelled = false;

    // Named handler for proper cleanup
    const onStyleImageMissing = (e) => {
      if (!mapInstance.hasImage(e.id)) {
        mapInstance.addImage(e.id, {
          width: 1,
          height: 1,
          data: new Uint8Array(4),
        });
      }
    };

    const initMap = async () => {
      // Await pre-started map library downloads (initiated at module level)
      const [maplibregl, { Protocol }] = await mapLibsPromise;

      if (isCancelled) return;

      const MapLibre = maplibregl.default || maplibregl;
      maplibreRefForCleanup.current = MapLibre;

      // Register PMTiles protocol BEFORE map construction
      const protocol = new Protocol();
      MapLibre.addProtocol("pmtiles", protocol.tile);

      // Protomaps style with pre-generated layers (build-time, no runtime dependency)
      const mapStyle = {
        version: 8,
        glyphs: "/map-fonts/{fontstack}/{range}.pbf",
        sprite: new URL("/sprites/light", window.location.origin).href,
        sources: {
          protomaps: {
            type: "vector",
            url: "pmtiles:///tiles/ggv.pmtiles",
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: protomapsLightLayers,
      };

      mapInstance = new MapLibre.Map({
        container: containerRef.current,
        style: mapStyle,
        center: VILLAGE_CENTER,
        zoom: 15,
        maxBounds: [
          [120.942, 14.34],
          [120.962, 14.358],
        ], // Village bounds + margin (limits tile loading)
      });

      // Fix: Create transparent placeholder for missing sprite images
      mapInstance.on("styleimagemissing", onStyleImageMissing);

      // Suppress non-critical style errors (null values in tile data)
      mapInstance.on("error", (e) => {
        if (e.error?.message?.includes("Expected value to be of type")) {
          return; // Ignore style expression errors from tile data
        }
        console.error("Map error:", e.error);
      });

      mapInstance.on("load", () => {
        if (isCancelled) return;

        addBlocksLayer(mapInstance);

        const geolocate = new MapLibre.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        });
        mapInstance.addControl(geolocate, "bottom-right");
        geolocateRef.current = geolocate;

        // Persistent listener for all GPS updates
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
      isCancelled = true;
      if (mapInstance) {
        mapInstance.off("styleimagemissing", onStyleImageMissing);
        mapInstance.remove();
      }
      if (maplibreRefForCleanup.current) {
        maplibreRefForCleanup.current.removeProtocol("pmtiles");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Triggers the native GeolocateControl to request GPS permission and start tracking.
   * Uses MapLibre's once() method for clean one-time event handling.
   *
   * @returns {Promise<GeolocationPosition>} Resolves with position if permission granted
   * @throws {Error} Rejects if permission denied or GeolocateControl not ready
   */
  const triggerGeolocate = async () => {
    if (!geolocateRef.current) {
      throw new Error("GeolocateControl not ready");
    }

    const geolocate = geolocateRef.current;

    // Setup one-time listeners BEFORE triggering (auto-cleanup via once())
    const resultPromise = Promise.race([
      geolocate.once("geolocate"),
      geolocate.once("error").then((err) => Promise.reject(err)),
    ]);

    // Trigger GPS permission dialog
    geolocate.trigger();

    return resultPromise;
  };

  return { map, userLocation, isMapReady, triggerGeolocate };
}

/**
 * Updates or creates a destination marker on the map.
 * Uses the default-marker.png image as an icon.
 *
 * @param {maplibregl.Map} map - MapLibre map instance
 * @param {{ coordinates: [number, number], name: string } | null} destination - Destination object or null to hide
 */
export async function updateDestinationMarker(map, destination) {
  if (!map || !map.isStyleLoaded()) return;

  const sourceId = "destination-marker";
  const layerId = "destination-marker-layer";
  const imageId = "destination-icon";

  // Load image if not already loaded (MapLibre official method)
  if (!map.hasImage(imageId)) {
    try {
      const image = await map.loadImage(destinationMarkerImg);
      if (!map.hasImage(imageId)) {
        map.addImage(imageId, image.data);
      }
    } catch (err) {
      console.error("Failed to load destination marker image:", err);
      return;
    }
  }

  // Create GeoJSON data
  /** @type {GeoJSON.FeatureCollection} */
  const geojson = {
    type: "FeatureCollection",
    features: destination
      ? [
          {
            type: "Feature",
            properties: { name: destination.name },
            geometry: {
              type: "Point",
              coordinates: destination.coordinates,
            },
          },
        ]
      : [],
  };

  // Update or create source and layer
  if (map.getSource(sourceId)) {
    /** @type {import('maplibre-gl').GeoJSONSource} */ (map.getSource(sourceId)).setData(geojson);
  } else {
    map.addSource(sourceId, { type: "geojson", data: geojson });
    map.addLayer({
      id: layerId,
      type: "symbol",
      source: sourceId,
      layout: {
        "icon-image": imageId,
        "icon-size": 0.5,
        "icon-anchor": "bottom",
      },
    });
  }
}
