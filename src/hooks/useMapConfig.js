import { useMemo, useCallback } from "react";
import { Polygon } from "ol/geom";
import { blocks } from "../data/blocks";

export function useMapConfig(userLocation, navigationState, adaptivePitch, mapType) {
  // Default coordinates (Garden Grove Village)
  const DEFAULT_COORDS = {
    latitude: 14.347872973134175,
    longitude: 120.95134859887523,
  };

  // Memoize initial map parameters
  const initialViewState = useMemo(
    () => ({
      latitude: userLocation?.latitude || DEFAULT_COORDS.latitude,
      longitude: userLocation?.longitude || DEFAULT_COORDS.longitude,
      zoom: navigationState === "navigating" ? 18 : 16.5,
      bearing: 0, // Fixed bearing - native compass handles orientation
      pitch: adaptivePitch, // Use adaptive pitch
    }),
    [
      userLocation,
      navigationState,
      adaptivePitch,
      DEFAULT_COORDS.latitude,
      DEFAULT_COORDS.longitude,
    ]
  );

  const getPolygonCenter = useCallback((coords) => {
    if (!coords || coords.length === 0) return [0, 0];
    const polygon = new Polygon([coords]);
    return polygon.getInteriorPoint().getCoordinates();
  }, []);

  // Memoization of blocks in GeoJSON with calculated centers
  const blocksGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: blocks
        .filter((block) => block.coords.length > 0)
        .map((block) => ({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [block.coords],
          },
          properties: {
            name: block.name || "",
            color: block.color || "#E0DFDF",
            center: getPolygonCenter(block.coords),
          },
        })),
    }),
    [getPolygonCenter]
  );

  // Memoize map style
  const mapStyle = useMemo(
    () => ({
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
        satellite: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "© Esri",
          maxzoom: 18.4, // Zoom limitation to avoid pixelation
        },
      },
      layers: [
        {
          id: "base-layer",
          type: "raster",
          source: mapType,
        },
      ],
    }),
    [mapType]
  );

  return {
    initialViewState,
    blocksGeoJSON,
    mapStyle,
    getPolygonCenter,
  };
}