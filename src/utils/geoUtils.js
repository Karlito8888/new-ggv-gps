/**
 * Utilitaires géographiques réutilisables
 * Standardisé sur Turf.js pour une précision uniforme
 */

import * as turf from "@turf/turf";

/**
 * Calcule la distance entre deux points GPS en utilisant Turf.js
 * @param {number} lat1 - Latitude du premier point
 * @param {number} lon1 - Longitude du premier point
 * @param {number} lat2 - Latitude du second point
 * @param {number} lon2 - Longitude du second point
 * @returns {number} Distance en mètres
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  return turf.distance([lon1, lat1], [lon2, lat2], { units: 'meters' });
}

/**
 * Calcule l'angle de direction entre deux points GPS en utilisant Turf.js
 * @param {number} lat1 - Latitude du premier point
 * @param {number} lon1 - Longitude du premier point
 * @param {number} lat2 - Latitude du second point
 * @param {number} lon2 - Longitude du second point
 * @returns {number} Angle en degrés (0-360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const bearing = turf.bearing([lon1, lat1], [lon2, lat2]);
  return (bearing + 360) % 360; // Normaliser pour avoir 0-360°
}

/**
 * Formate une distance pour affichage utilisateur
 * @param {number} distance - Distance en mètres
 * @returns {string} Distance formatée (ex: "150m", "1.2km")
 */
export function formatDistance(distance) {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}

/**
 * Convertit un angle de direction en direction cardinale
 * @param {number} bearing - Angle en degrés (0-360)
 * @returns {Object} Objet avec direction et icône
 */
export function bearingToDirection(bearing) {
  // Normaliser le bearing entre 0-360 de manière simple
  const normalizedBearing = ((bearing % 360) + 360) % 360;

  const directions = [
    { name: "North", icon: "↑", min: 337.5, max: 22.5 },
    { name: "Northeast", icon: "↗", min: 22.5, max: 67.5 },
    { name: "East", icon: "→", min: 67.5, max: 112.5 },
    { name: "Southeast", icon: "↘", min: 112.5, max: 157.5 },
    { name: "South", icon: "↓", min: 157.5, max: 202.5 },
    { name: "Southwest", icon: "↙", min: 202.5, max: 247.5 },
    { name: "West", icon: "←", min: 247.5, max: 292.5 },
    { name: "Northwest", icon: "↖", min: 292.5, max: 337.5 },
  ];

  // Trouver la direction avec une simple recherche
  return directions.find(dir =>
    (dir.min <= normalizedBearing && normalizedBearing < dir.max) ||
    (dir.min > dir.max && (normalizedBearing >= dir.min || normalizedBearing < dir.max))
  ) || { name: "North", icon: "↑" };
}

/**
 * Calcule la distance totale d'une route en utilisant Turf.js
 * @param {Object} routeData - Données de route GeoJSON
 * @returns {number} Distance totale en mètres
 */
export function calculateRouteDistance(routeData) {
  if (!routeData?.features?.[0]?.geometry?.coordinates) return 0;

  const routeLine = turf.lineString(routeData.features[0].geometry.coordinates);
  return turf.length(routeLine, { units: 'meters' });
}





/**
 * Trouve le point le plus proche sur une route par rapport à la position utilisateur
 * Utilise Turf.js pour des calculs précis et optimisés
 * @param {number} userLat - Latitude de l'utilisateur
 * @param {number} userLon - Longitude de l'utilisateur
 * @param {Object} routeGeometry - Géométrie de la route GeoJSON
 * @returns {Object|null} Informations sur le point le plus proche
 */
export function findClosestPointOnRoute(userLat, userLon, routeGeometry) {
  if (
    !routeGeometry ||
    !routeGeometry.coordinates ||
    routeGeometry.coordinates.length < 2
  ) {
    return null;
  }

  const userPoint = turf.point([userLon, userLat]);
  const routeLine = turf.lineString(routeGeometry.coordinates);

  // Utiliser Turf.js pour trouver le point le plus proche
  const nearest = turf.nearestPointOnLine(routeLine, userPoint, { units: 'meters' });

  return {
    point: nearest.geometry.coordinates, // [lon, lat]
    segmentIndex: nearest.properties.index,
    positionOnSegment: nearest.properties.location, // Position sur le segment (0-1)
    distance: nearest.properties.dist, // Distance en mètres
  };
}