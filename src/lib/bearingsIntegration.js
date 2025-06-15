// Integration with @maplibre/maplibre-gl-directions BearingsControl
import { BearingsControl } from "@maplibre/maplibre-gl-directions";

/**
 * Configuration optimisée pour le BearingsControl
 */
export const BEARINGS_CONTROL_CONFIG = {
  defaultEnabled: true,
  debounceTimeout: 150,
  angleDefault: 0,
  angleMin: 0,
  angleMax: 359,
  angleStep: 1,
  fixedDegrees: 0, // Permet de changer les degrés
  degreesDefault: 45,
  degreesMin: 15,
  degreesMax: 360,
  degreesStep: 15,
  respectMapBearing: true, // Rotation selon l'orientation de la carte
  imageSize: 50
};

/**
 * Initialise le contrôle de bearings avec MapLibre Directions
 * @param {Object} map - Instance MapLibre GL JS
 * @param {Object} directions - Instance MapLibreGlDirections
 * @returns {BearingsControl} Instance du contrôle
 */
export function initBearingsControl(map, directions) {
  const bearingsControl = new BearingsControl(directions, BEARINGS_CONTROL_CONFIG);
  
  // Ajouter le contrôle à la carte
  map.addControl(bearingsControl, 'top-right');
  
  return bearingsControl;
}

/**
 * Synchronise l'orientation du device avec les waypoints bearings
 * @param {Object} directions - Instance MapLibreGlDirections
 * @param {number} deviceBearing - Orientation du device en degrés
 */
export function syncDeviceBearingWithWaypoints(directions, deviceBearing) {
  // Récupérer les waypoints actuels
  const waypoints = directions.waypoints;
  
  if (waypoints.length > 0) {
    // Mettre à jour le bearing du premier waypoint (position utilisateur)
    const currentBearings = directions.waypointsBearings;
    const updatedBearings = [...currentBearings];
    
    // Appliquer l'orientation du device au premier waypoint
    if (updatedBearings.length > 0) {
      updatedBearings[0] = [deviceBearing, 45]; // [angle, degrees]
    }
    
    directions.waypointsBearings = updatedBearings;
  }
}