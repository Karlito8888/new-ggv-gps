// Enhanced MapLibre integration with BearingsControl
import MapLibreGlDirections, { BearingsControl, LoadingIndicatorControl } from "@maplibre/maplibre-gl-directions";
import { ROUTING_CONFIG } from './constants.js';
import { bearingManager, BEARING_TYPES } from './bearingManager.js';
import { BEARINGS_CONTROL_CONFIG } from './bearingsIntegration.js';

// Enhanced directions instance with bearings support
let enhancedDirections = null;
let bearingsControl = null;
let loadingIndicator = null;

/**
 * Configuration avancée pour MapLibre Directions avec support des bearings
 */
const ENHANCED_DIRECTIONS_CONFIG = {
  ...ROUTING_CONFIG.DIRECTIONS_OPTIONS,
  bearings: true, // Activer le support des bearings
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
    waypointHover: {
      "circle-radius": 10,
      "circle-color": "#1d4ed8",
    }
  },
};

/**
 * Initialise MapLibre Directions avec support avancé des bearings
 * @param {Object} map - MapLibre GL JS map instance
 * @param {Object} options - Options de configuration
 * @returns {Object} Enhanced directions instance
 */
export function initEnhancedDirections(map, options = {}) {
  try {
    // Créer l'instance directions avec support des bearings
    enhancedDirections = new MapLibreGlDirections(map, {
      ...ENHANCED_DIRECTIONS_CONFIG,
      ...options
    });

    // Ajouter le contrôle des bearings
    bearingsControl = new BearingsControl(enhancedDirections, {
      ...BEARINGS_CONTROL_CONFIG,
      respectMapBearing: true, // Important pour la synchronisation
    });
    
    // Ajouter l'indicateur de chargement
    loadingIndicator = new LoadingIndicatorControl(enhancedDirections);

    // Ajouter les contrôles à la carte
    map.addControl(bearingsControl, 'top-right');
    map.addControl(loadingIndicator, 'top-left');

    // Écouter les événements de changement de waypoints
    enhancedDirections.on('waypointschanged', handleWaypointsChanged);
    enhancedDirections.on('routingstart', handleRoutingStart);
    enhancedDirections.on('routingend', handleRoutingEnd);

    console.log('🧭 Enhanced MapLibre Directions initialisé avec support des bearings');
    return enhancedDirections;

  } catch (error) {
    console.error('Erreur lors de l\'initialisation des directions avancées:', error);
    return null;
  }
}

/**
 * Synchronise l'orientation du device avec les waypoints
 * @param {number} deviceBearing - Orientation du device
 */
export function syncDeviceBearingWithDirections(deviceBearing) {
  if (!enhancedDirections) return;

  try {
    const waypoints = enhancedDirections.waypoints;
    if (waypoints.length > 0) {
      // Mettre à jour le bearing manager
      bearingManager.updateDeviceBearing(deviceBearing);

      // Synchroniser avec les waypoints bearings
      const currentBearings = enhancedDirections.waypointsBearings;
      const updatedBearings = [...currentBearings];

      // Appliquer l'orientation du device au premier waypoint (position utilisateur)
      if (updatedBearings.length > 0) {
        updatedBearings[0] = [deviceBearing, 45]; // [angle, degrees]
        enhancedDirections.waypointsBearings = updatedBearings;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la synchronisation des bearings:', error);
  }
}

/**
 * Met à jour la navigation avec une nouvelle destination
 * @param {number} userLat - Latitude utilisateur
 * @param {number} userLon - Longitude utilisateur
 * @param {number} destLat - Latitude destination
 * @param {number} destLon - Longitude destination
 */
export function updateNavigationWithBearings(userLat, userLon, destLat, destLon) {
  if (!enhancedDirections) return;

  try {
    // Définir les waypoints
    const waypoints = [
      [userLon, userLat], // Position utilisateur
      [destLon, destLat]  // Destination
    ];

    enhancedDirections.setWaypoints(waypoints);

    // Mettre à jour le bearing manager
    bearingManager.updateDestinationBearing(userLat, userLon, destLat, destLon);

    console.log('🎯 Navigation mise à jour avec bearings:', {
      from: [userLat, userLon],
      to: [destLat, destLon],
      bearings: bearingManager.getAllBearings()
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la navigation:', error);
  }
}

/**
 * Gestionnaire d'événement pour les changements de waypoints
 * @private
 */
function handleWaypointsChanged(event) {
  console.log('📍 Waypoints changés:', event.waypoints);
  
  // Synchroniser avec le bearing manager si nécessaire
  if (event.waypoints.length >= 2) {
    const [start, end] = event.waypoints;
    bearingManager.updateDestinationBearing(
      start.geometry.coordinates[1],
      start.geometry.coordinates[0],
      end.geometry.coordinates[1],
      end.geometry.coordinates[0]
    );
  }
}

/**
 * Gestionnaire d'événement pour le début du routage
 * @private
 */
function handleRoutingStart() {
  console.log('🔄 Calcul d\'itinéraire démarré...');
}

/**
 * Gestionnaire d'événement pour la fin du routage
 * @private
 */
function handleRoutingEnd(event) {
  console.log('✅ Itinéraire calculé:', event.routes);
}

/**
 * Nettoie les instances et contrôles
 */
export function cleanupEnhancedDirections() {
  if (enhancedDirections) {
    // Supprimer les listeners
    enhancedDirections.off('waypointschanged', handleWaypointsChanged);
    enhancedDirections.off('routingstart', handleRoutingStart);
    enhancedDirections.off('routingend', handleRoutingEnd);
    
    // Nettoyer l'instance
    enhancedDirections.clear();
    enhancedDirections = null;
  }

  bearingsControl = null;
  loadingIndicator = null;
  
  console.log('🧹 Enhanced directions nettoyé');
}

/**
 * Récupère l'instance directions actuelle
 * @returns {Object|null} Enhanced directions instance
 */
export function getEnhancedDirections() {
  return enhancedDirections;
}

/**
 * Récupère le contrôle des bearings
 * @returns {Object|null} BearingsControl instance
 */
export function getBearingsControl() {
  return bearingsControl;
}

/**
 * Active/désactive l'interactivité des directions
 * @param {boolean} interactive - État d'interactivité
 */
export function setDirectionsInteractive(interactive = true) {
  if (enhancedDirections) {
    enhancedDirections.interactive = interactive;
    console.log(`🎮 Interactivité des directions: ${interactive ? 'activée' : 'désactivée'}`);
  }
}