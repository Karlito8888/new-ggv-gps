import { useState, useEffect, useRef, type RefObject } from "react";
import type {
  Map as MaplibreMap,
  GeolocateControl,
  GeoJSONSource,
  MapStyleImageMissingEvent,
  ErrorEvent as MapErrorEvent,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { blocks } from "../data/blocks";
import destinationMarkerImg from "../assets/default-marker.png";
import protomapsLightLayers from "../data/protomaps-light-layers.json";
import "../styles/maplibre-gl.css";

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface Destination {
  name: string;
  coordinates: [number, number];
}

interface UseMapSetupReturn {
  map: MaplibreMap | null;
  userLocation: UserLocation | null;
  isMapReady: boolean;
  triggerGeolocate: () => Promise<GeolocationPosition>;
}

interface MaplibreModule {
  Map: typeof import("maplibre-gl").Map;
  GeolocateControl: typeof import("maplibre-gl").GeolocateControl;
  addProtocol: (protocol: string, handler: unknown) => void;
  removeProtocol: (protocol: string) => void;
}

// Eagerly start downloading map libraries at module parse time
// (overlaps with React render cycle instead of waiting for useEffect)
const mapLibsPromise = Promise.all([import("maplibre-gl"), import("pmtiles")]);

const VILLAGE_CENTER: [number, number] = [120.95134859887523, 14.347872973134175];

// Calculate centroid of polygon
function getCentroid(coords: [number, number][]): [number, number] {
  let x = 0,
    y = 0;
  for (const [lng, lat] of coords) {
    x += lng;
    y += lat;
  }
  return [x / coords.length, y / coords.length];
}

const labelsGeoJSON: FeatureCollection = {
  type: "FeatureCollection",
  features: blocks.map((block) => ({
    type: "Feature" as const,
    properties: { name: block.name },
    geometry: { type: "Point" as const, coordinates: getCentroid(block.coords) },
  })),
};

function addBlocksLayer(map: MaplibreMap): void {
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
 */
export function useMapSetup(containerRef: RefObject<HTMLDivElement | null>): UseMapSetupReturn {
  const [map, setMap] = useState<MaplibreMap | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const geolocateRef = useRef<GeolocateControl | null>(null);
  const maplibreRefForCleanup = useRef<MaplibreModule | null>(null);

  // Initialize map with lazy-loaded MapLibre
  useEffect(() => {
    if (!containerRef.current) return;

    let mapInstance: MaplibreMap | null = null;
    let isCancelled = false;

    // Named handler for proper cleanup
    const onStyleImageMissing = (e: MapStyleImageMissingEvent) => {
      if (mapInstance && !mapInstance.hasImage(e.id)) {
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

      const MapLibre: MaplibreModule = (maplibregl as any).default || maplibregl;
      maplibreRefForCleanup.current = MapLibre;

      // Register PMTiles protocol BEFORE map construction
      const protocol = new Protocol();
      MapLibre.addProtocol("pmtiles", protocol.tile);

      // Protomaps style with pre-generated layers (build-time, no runtime dependency)
      const mapStyle = {
        version: 8 as const,
        glyphs: "/map-fonts/{fontstack}/{range}.pbf",
        sprite: new URL("/sprites/light", window.location.origin).href,
        sources: {
          protomaps: {
            type: "vector" as const,
            url: "pmtiles:///tiles/ggv.pmtiles",
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: protomapsLightLayers as unknown as import("maplibre-gl").LayerSpecification[],
      };

      mapInstance = new MapLibre.Map({
        container: containerRef.current!,
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
      mapInstance.on("error", (e: MapErrorEvent) => {
        if (e.error?.message?.includes("Expected value to be of type")) {
          return; // Ignore style expression errors from tile data
        }
        console.error("Map error:", e.error);
      });

      mapInstance.on("load", () => {
        if (isCancelled) return;

        addBlocksLayer(mapInstance!);

        const geolocate = new MapLibre.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        });
        mapInstance!.addControl(geolocate, "bottom-right");
        geolocateRef.current = geolocate;

        // Persistent listener for all GPS updates
        geolocate.on("geolocate", (pos: GeolocationPosition) => {
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
   */
  const triggerGeolocate = async (): Promise<GeolocationPosition> => {
    if (!geolocateRef.current) {
      throw new Error("GeolocateControl not ready");
    }

    const geolocate = geolocateRef.current;

    // Setup one-time listeners BEFORE triggering (auto-cleanup via once())
    const resultPromise = Promise.race([
      geolocate.once("geolocate") as Promise<GeolocationPosition>,
      (geolocate.once("error") as Promise<unknown>).then((err) => Promise.reject(err)),
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
 */
export async function updateDestinationMarker(
  map: MaplibreMap | null,
  destination: Destination | null
): Promise<void> {
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
  const geojson: FeatureCollection = {
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
    (map.getSource(sourceId) as GeoJSONSource).setData(geojson);
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
