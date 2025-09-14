/**
 * Utilitaires géographiques réutilisables
 * Version simplifiée - utilise les capacités natives de JavaScript
 */

import { findClosestPointOnRoute } from "../lib/navigation";

/**
 * Calcule la distance entre deux points GPS (formule Haversine)
 * @param {number} lat1 - Latitude du premier point
 * @param {number} lon1 - Longitude du premier point
 * @param {number} lat2 - Latitude du second point
 * @param {number} lon2 - Longitude du second point
 * @returns {number} Distance en mètres
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Rayon de la Terre en mètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calcule l'angle de direction entre deux points GPS
 * @param {number} lat1 - Latitude du premier point
 * @param {number} lon1 - Longitude du premier point
 * @param {number} lat2 - Latitude du second point
 * @param {number} lon2 - Longitude du second point
 * @returns {number} Angle en degrés (0-360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
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
 * Calcule la distance totale d'une route
 * @param {Object} routeData - Données de route GeoJSON
 * @returns {number} Distance totale en mètres
 */
export function calculateRouteDistance(routeData) {
  if (!routeData?.features?.[0]?.geometry?.coordinates) return 0;
  
  const coordinates = routeData.features[0].geometry.coordinates;
  
  return coordinates.reduce((total, coord, index) => {
    if (index === 0) return 0;
    const prevCoord = coordinates[index - 1];
    return total + calculateDistance(prevCoord[1], prevCoord[0], coord[1], coord[0]);
  }, 0);
}

/**
 * Crée un snap-to-road basique
 * @param {Object} userPos - Position utilisateur {latitude, longitude}
 * @param {Array} routeCoordinates - Coordonnées de la route
 * @param {number} maxDistance - Distance maximale pour snap (défaut: 20m)
 * @returns {Object|null} Position snappée ou null
 */
export function snapToRoad(userPos, routeCoordinates, maxDistance = 20) {
  if (!routeCoordinates || routeCoordinates.length === 0) return null;
  
  const closestPoint = findClosestPointOnRoute(
    userPos.latitude, 
    userPos.longitude, 
    routeCoordinates
  );
  
  return closestPoint && closestPoint.distance < maxDistance ? {
    latitude: closestPoint.point[1],
    longitude: closestPoint.point[0],
    distance: closestPoint.distance,
    segmentIndex: closestPoint.segmentIndex
  } : null;
}

/**
 * Détecte les virages dans une route
 * @param {Array} routeCoordinates - Coordonnées de la route
 * @param {Object} userPos - Position utilisateur
 * @param {number} lookAheadDistance - Distance d'anticipation
 * @returns {Array} Liste des virages détectés
 */
export function detectTurns(routeCoordinates, userPos, lookAheadDistance = 100) {
  if (!routeCoordinates || routeCoordinates.length < 3) return [];
  
  const turns = [];
  
  const closestPoint = findClosestPointOnRoute(
    userPos.latitude, 
    userPos.longitude, 
    routeCoordinates
  );
  
  if (!closestPoint) return [];
  
  const startIndex = closestPoint.segmentIndex;
  
  for (let i = startIndex; i < routeCoordinates.length - 2; i++) {
    const [currentLon, currentLat] = routeCoordinates[i];
    const [nextLon, nextLat] = routeCoordinates[i + 1];
    const [futureLon, futureLat] = routeCoordinates[i + 2];
    
    const distanceToTurn = calculateDistance(
      userPos.latitude, userPos.longitude,
      nextLat, nextLon
    );
    
    if (distanceToTurn > lookAheadDistance) continue;
    
    const bearing1 = calculateBearing(currentLat, currentLon, nextLat, nextLon);
    const bearing2 = calculateBearing(nextLat, nextLon, futureLat, futureLon);
    
    let turnAngle = bearing2 - bearing1;
    if (turnAngle > 180) turnAngle -= 360;
    if (turnAngle < -180) turnAngle += 360;
    
    if (Math.abs(turnAngle) > 30) {
      turns.push({
        type: 'turn',
        direction: turnAngle > 0 ? 'right' : 'left',
        angle: Math.abs(turnAngle),
        distance: distanceToTurn,
        coordinates: [nextLon, nextLat],
        severity: Math.abs(turnAngle) > 90 ? 'sharp' : 'normal'
      });
    }
  }
  
  return turns;
}