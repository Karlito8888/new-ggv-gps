import { useState, useEffect, useRef, type RefObject } from "react";
import type {
  Map as MaplibreMap,
  GeolocateControl,
  Marker,
  MapStyleImageMissingEvent,
  ErrorEvent as MapErrorEvent,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { blocks } from "../data/blocks";
import protomapsLightLayers from "../data/protomaps-light-layers.json";
import "../styles/maplibre-gl.css";

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface Destination {
  name: string;
  coordinates: [number, number];
  type?: string;
}

interface UseMapSetupReturn {
  map: MaplibreMap | null;
  userLocation: UserLocation | null;
  isMapReady: boolean;
  triggerGeolocate: () => Promise<GeolocationPosition>;
  userMarkerRef: React.RefObject<Marker | null>;
}

interface MaplibreModule {
  Map: typeof import("maplibre-gl").Map;
  GeolocateControl: typeof import("maplibre-gl").GeolocateControl;
  Marker: typeof import("maplibre-gl").Marker;
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
  const userMarkerRef = useRef<Marker | null>(null);

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

        // Create custom user location arrow marker (hidden by default, shown during navigation)
        const arrowEl = document.createElement("div");
        arrowEl.className = "user-location-arrow";
        const marker = new MapLibre.Marker({
          element: arrowEl,
          rotationAlignment: "map",
          pitchAlignment: "map",
        });
        marker.setLngLat(VILLAGE_CENTER).addTo(mapInstance!);
        arrowEl.style.display = "none"; // Hidden until navigation starts
        userMarkerRef.current = marker;

        // Persistent listener for all GPS updates
        geolocate.on("geolocate", (pos: GeolocationPosition) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ latitude, longitude });
          // Update custom marker position
          if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([longitude, latitude]);
          }
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

  return { map, userLocation, isMapReady, triggerGeolocate, userMarkerRef };
}

// Module-level ref for the destination HTML Marker (singleton, managed outside React)
let destMarkerInstance: import("maplibre-gl").Marker | null = null;
let destMarkerVersion = 0; // Guards against race conditions in async marker creation

const ARRIVAL_ZONE_SOURCE = "arrival-zone";
const ARRIVAL_ZONE_LAYER = "arrival-zone-circle";

/**
 * Updates or creates a custom destination marker (CSS pin + pulse) and arrival zone circle.
 */
export function updateDestinationMarker(
  map: MaplibreMap | null,
  destination: Destination | null
): void {
  if (!map || !map.isStyleLoaded()) return;

  // Remove existing marker
  if (destMarkerInstance) {
    destMarkerInstance.remove();
    destMarkerInstance = null;
  }

  // Remove arrival zone layer/source
  if (map.getLayer(ARRIVAL_ZONE_LAYER)) {
    map.removeLayer(ARRIVAL_ZONE_LAYER);
  }
  if (map.getSource(ARRIVAL_ZONE_SOURCE)) {
    map.removeSource(ARRIVAL_ZONE_SOURCE);
  }

  if (!destination) return;

  // Create HTML marker with pin + pulse
  const el = document.createElement("div");
  el.className = "dest-marker-container";
  el.innerHTML = '<div class="dest-marker-pulse"></div><div class="dest-marker-pin"></div>';

  // Guard against race condition: if updateDestinationMarker is called again
  // before this .then() resolves, the version check prevents stale markers
  const thisVersion = ++destMarkerVersion;
  mapLibsPromise.then(([maplibregl]) => {
    if (thisVersion !== destMarkerVersion) return; // Stale — newer call superseded us
    const MapLibre = (maplibregl as any).default || maplibregl;
    destMarkerInstance = new MapLibre.Marker({ element: el, anchor: "bottom" });
    destMarkerInstance!.setLngLat(destination.coordinates).addTo(map);
  });

  // Add arrival zone circle layer (12m radius)
  const geojson: FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: destination.coordinates,
        },
      },
    ],
  };

  map.addSource(ARRIVAL_ZONE_SOURCE, { type: "geojson", data: geojson });
  map.addLayer({
    id: ARRIVAL_ZONE_LAYER,
    type: "circle",
    source: ARRIVAL_ZONE_SOURCE,
    paint: {
      // 12m radius — convert meters to pixels using zoom-dependent expression
      // At latitude ~14.35°, 1px at zoom 20 ≈ 0.15m, so 12m ≈ 80px at z20
      "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 15, 5, 17, 20, 19, 50, 20, 80],
      "circle-color": "rgba(66, 133, 244, 0.15)",
      "circle-stroke-color": "#4285F4",
      "circle-stroke-width": 1,
      "circle-pitch-alignment": "map",
    },
  });
}
