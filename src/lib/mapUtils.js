// MapLibre GL JS utility functions
// Pure functions for map calculations and geometry operations

import { Feature } from "ol";
import { Polygon } from "ol/geom";

/**
 * Calculate the center point of a polygon using OpenLayers geometry
 * @param {Array} coords - Array of coordinate pairs [lng, lat]
 * @returns {Array} Center coordinates [lng, lat]
 */
export function getPolygonCenter(coords) {
  if (!coords || coords.length === 0) return [0, 0];
  
  try {
    const polygon = new Polygon([coords]);
    return polygon.getInteriorPoint().getCoordinates();
  } catch (error) {
    console.error('Error calculating polygon center:', error);
    // Fallback: calculate centroid manually
    return calculateCentroid(coords);
  }
}

/**
 * Fallback centroid calculation
 * @param {Array} coords - Array of coordinate pairs
 * @returns {Array} Centroid coordinates [lng, lat]
 */
function calculateCentroid(coords) {
  if (!coords || coords.length === 0) return [0, 0];
  
  let totalLng = 0;
  let totalLat = 0;
  
  coords.forEach(([lng, lat]) => {
    totalLng += lng;
    totalLat += lat;
  });
  
  return [
    totalLng / coords.length,
    totalLat / coords.length
  ];
}

/**
 * Convert blocks data to GeoJSON format for MapLibre
 * @param {Array} blocks - Array of block objects
 * @returns {Object} GeoJSON FeatureCollection
 */
export function blocksToGeoJSON(blocks) {
  return {
    type: "FeatureCollection",
    features: blocks
      .filter((block) => block.coords && block.coords.length > 0)
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
  };
}

/**
 * Create initial view state for MapLibre map
 * @param {Object} userLocation - User location object
 * @param {Object} defaultCoords - Default coordinates
 * @param {string} navigationState - Current navigation state
 * @param {Object} zoomLevels - Zoom level configuration
 * @param {Object} pitchAngles - Pitch angle configuration
 * @returns {Object} MapLibre initial view state
 */
export function createInitialViewState(
  userLocation,
  defaultCoords,
  navigationState,
  zoomLevels,
  pitchAngles
) {
  return {
    latitude: userLocation?.latitude || defaultCoords.latitude,
    longitude: userLocation?.longitude || defaultCoords.longitude,
    zoom: navigationState === "navigating" ? zoomLevels.navigating : zoomLevels.welcome,
    bearing: 0, // MapLibre native controls handle bearing
    pitch: navigationState === "navigating" ? pitchAngles.navigating : pitchAngles.welcome,
  };
}

/**
 * Format route data for MapLibre GeoJSON source
 * @param {Object} routeResult - Route result from navigation API
 * @returns {Object} Formatted GeoJSON FeatureCollection
 */
export function formatRouteForMapLibre(routeResult) {
  if (!routeResult) return null;
  
  return {
    type: "FeatureCollection",
    features: routeResult.type === "Feature" 
      ? [routeResult] 
      : routeResult.features || [],
  };
}

/**
 * Center map on user location with smooth animation
 * @param {Object} mapRef - MapLibre map reference
 * @param {Object} userLocation - User location object
 * @param {number} zoom - Target zoom level
 * @param {number} duration - Animation duration in ms
 */
export function centerMapOnUser(mapRef, userLocation, zoom = 18, duration = 1000) {
  if (!mapRef.current || !userLocation) return;
  
  mapRef.current.easeTo({
    center: [userLocation.longitude, userLocation.latitude],
    zoom,
    duration,
  });
}

/**
 * Check if a layer exists on the map
 * @param {Object} map - MapLibre map instance
 * @param {string} layerId - Layer ID to check
 * @returns {boolean} True if layer exists
 */
export function layerExists(map, layerId) {
  return map && map.getLayer && map.getLayer(layerId) !== undefined;
}

/**
 * Check if a source exists on the map
 * @param {Object} map - MapLibre map instance
 * @param {string} sourceId - Source ID to check
 * @returns {boolean} True if source exists
 */
export function sourceExists(map, sourceId) {
  return map && map.getSource && map.getSource(sourceId) !== undefined;
}

/**
 * Safely remove layer from map
 * @param {Object} map - MapLibre map instance
 * @param {string} layerId - Layer ID to remove
 */
export function safeRemoveLayer(map, layerId) {
  try {
    if (layerExists(map, layerId)) {
      map.removeLayer(layerId);
    }
  } catch (error) {
    console.error(`Error removing layer ${layerId}:`, error);
  }
}

/**
 * Safely remove source from map
 * @param {Object} map - MapLibre map instance
 * @param {string} sourceId - Source ID to remove
 */
export function safeRemoveSource(map, sourceId) {
  try {
    if (sourceExists(map, sourceId)) {
      map.removeSource(sourceId);
    }
  } catch (error) {
    console.error(`Error removing source ${sourceId}:`, error);
  }
}