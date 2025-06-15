// MapLibre GL JS integration and directions setup

import MapLibreGlDirections from "@maplibre/maplibre-gl-directions";
import { ROUTING_CONFIG } from './constants.js';

// Initialize MapLibre Directions
let directions = null;

/**
 * Initialize MapLibre Directions with map instance
 * @param {Object} map - MapLibre GL JS map instance
 * @returns {Object} Directions instance
 */
export function initMapLibreDirections(map) {
  directions = new MapLibreGlDirections(map, {
    requestOptions: ROUTING_CONFIG.DIRECTIONS_OPTIONS,
    styles: {
      route: {
        "line-color": "#3b82f6",
        "line-width": 4,
        "line-opacity": 0.8,
      },
      routeAlternatives: {
        "line-color": "#94a3b8",
        "line-width": 3,
      },
    },
  });
  return directions;
}

/**
 * Cleanup directions instance
 */
export function cleanupDirections() {
  if (directions) {
    directions.remove();
    directions = null;
  }
}

/**
 * Get current directions instance
 * @returns {Object|null} Current directions instance
 */
export function getDirections() {
  return directions;
}