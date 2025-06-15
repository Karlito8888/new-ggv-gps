// Modern MapLibre GL JS integration with native bearings support

import MapLibreGlDirections, { BearingsControl, LoadingIndicatorControl } from "@maplibre/maplibre-gl-directions";
import { NavigationControl } from 'maplibre-gl';
import { ROUTING_CONFIG } from './constants.js';

// Modern directions instance with bearings support
let directions = null;
let bearingsControl = null;
let loadingIndicator = null;

/**
 * Modern MapLibre Directions with native bearings support
 * @param {Object} map - MapLibre GL JS map instance
 * @returns {Object} Directions instance with bearings
 */
export function initMapLibreDirections(map) {
  // Create directions with bearings support
  directions = new MapLibreGlDirections(map, {
    ...ROUTING_CONFIG.DIRECTIONS_OPTIONS,
    bearings: true, // Enable native bearings support
    styles: {
      route: {
        "line-color": "#3b82f6",
        "line-width": 4,
        "line-opacity": 0.8,
      },
      routeAlternatives: {
        "line-color": "#94a3b8",
        "line-width": 3,
        "line-opacity": 0.6,
      },
      waypoint: {
        "circle-radius": 8,
        "circle-color": "#3b82f6",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    },
  });

  // Add native BearingsControl (replaces custom compass)
  bearingsControl = new BearingsControl(directions, {
    defaultEnabled: true,
    respectMapBearing: true,
    imageSize: 40,
    angleDefault: 0,
    degreesDefault: 45,
  });

  // Add loading indicator
  loadingIndicator = new LoadingIndicatorControl(directions);

  // Add controls to map
  map.addControl(bearingsControl, 'top-right');
  map.addControl(loadingIndicator, 'top-left');
  
  // Add permanent compass control (always visible)
  map.addControl(new NavigationControl({
    showCompass: true,
    showZoom: false,
    visualizePitch: true
  }), 'bottom-right');

  console.log('🧭 MapLibre Directions with native bearings initialized');
  return directions;
}

/**
 * Update navigation with device bearing
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLon - Destination longitude
 * @param {number} deviceBearing - Device bearing in degrees
 */
export function updateNavigationRoute(userLat, userLon, destLat, destLon, deviceBearing = 0) {
  if (!directions) return;

  try {
    // Set waypoints
    const waypoints = [
      [userLon, userLat], // User position
      [destLon, destLat]  // Destination
    ];

    directions.setWaypoints(waypoints);

    // Set bearings for waypoints (device bearing for start point)
    directions.waypointsBearings = [
      [deviceBearing, 45], // Start with device bearing
      undefined            // No bearing constraint for destination
    ];

    console.log('🎯 Navigation updated with bearings:', { deviceBearing, waypoints });
  } catch (error) {
    console.error('Error updating navigation:', error);
  }
}

/**
 * Sync device bearing with directions
 * @param {number} deviceBearing - Device bearing in degrees
 */
export function syncDeviceBearing(deviceBearing) {
  if (!directions) return;

  try {
    const currentBearings = directions.waypointsBearings;
    if (currentBearings.length > 0) {
      const updatedBearings = [...currentBearings];
      updatedBearings[0] = [deviceBearing, 45]; // Update first waypoint bearing
      directions.waypointsBearings = updatedBearings;
    }
  } catch (error) {
    console.error('Error syncing device bearing:', error);
  }
}

/**
 * Cleanup directions instance and controls
 */
export function cleanupDirections() {
  if (directions) {
    directions.clear();
    directions = null;
  }
  bearingsControl = null;
  loadingIndicator = null;
  console.log('🧹 MapLibre Directions cleaned up');
}

/**
 * Get current directions instance
 * @returns {Object|null} Current directions instance
 */
export function getDirections() {
  return directions;
}

/**
 * Get bearings control instance
 * @returns {Object|null} BearingsControl instance
 */
export function getBearingsControl() {
  return bearingsControl;
}