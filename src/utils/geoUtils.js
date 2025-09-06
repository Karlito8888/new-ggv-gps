/**
 * Utilitaires géographiques réutilisables
 * Centralise les calculs géométriques pour éviter la duplication
 */

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

  for (const dir of directions) {
    if (dir.name === "North") {
      // Cas spécial pour le Nord (traverse 0°)
      if (bearing >= dir.min || bearing <= dir.max) {
        return { name: dir.name, icon: dir.icon };
      }
    } else {
      if (bearing >= dir.min && bearing < dir.max) {
        return { name: dir.name, icon: dir.icon };
      }
    }
  }

  return { name: "North", icon: "↑" }; // Fallback
}

/**
 * Trouve le point le plus proche sur une route
 * @param {number} userLat - Latitude utilisateur
 * @param {number} userLon - Longitude utilisateur
 * @param {Array} routeCoordinates - Coordonnées de la route [[lon, lat], ...]
 * @returns {Object|null} Point le plus proche avec distance et index
 */
export function findClosestPointOnRoute(userLat, userLon, routeCoordinates) {
  if (!routeCoordinates || routeCoordinates.length < 2) {
    return null;
  }

  let closestPoint = null;
  let minDistance = Infinity;
  let segmentIndex = 0;

  for (let i = 0; i < routeCoordinates.length; i++) {
    const [lon, lat] = routeCoordinates[i];
    const distance = calculateDistance(userLat, userLon, lat, lon);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = {
        latitude: lat,
        longitude: lon,
        distance: minDistance
      };
      segmentIndex = i;
    }
  }

  return {
    ...closestPoint,
    segmentIndex,
    coordinates: routeCoordinates[segmentIndex]
  };
}

/**
 * Vérifie si un utilisateur est hors route
 * @param {number} userLat - Latitude utilisateur
 * @param {number} userLon - Longitude utilisateur
 * @param {Array} routeCoordinates - Coordonnées de la route
 * @param {number} threshold - Seuil de déviation en mètres
 * @returns {boolean} True si hors route
 */
export function isUserOffRoute(userLat, userLon, routeCoordinates, threshold = 25) {
  const closestPoint = findClosestPointOnRoute(userLat, userLon, routeCoordinates);
  return closestPoint ? closestPoint.distance > threshold : true;
}

/**
 * Calcule la distance totale d'une route
 * @param {Object} routeData - Données de route GeoJSON
 * @returns {number} Distance totale en mètres
 */
export function calculateRouteDistance(routeData) {
  if (!routeData?.features?.[0]?.geometry?.coordinates) return 0;
  
  const coordinates = routeData.features[0].geometry.coordinates;
  let distance = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    distance += calculateDistance(
      coordinates[i-1][1], coordinates[i-1][0],
      coordinates[i][1], coordinates[i][0]
    );
  }
  
  return distance;
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
  
  // Snap seulement si on est proche de la route
  return closestPoint && closestPoint.distance < maxDistance ? closestPoint : null;
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
  
  // Trouver le point le plus proche sur la route
  const closestPoint = findClosestPointOnRoute(
    userPos.latitude, 
    userPos.longitude, 
    routeCoordinates
  );
  
  if (!closestPoint) return [];
  
  const startIndex = closestPoint.segmentIndex;
  
  // Analyser les points à venir
  for (let i = startIndex; i < routeCoordinates.length - 2; i++) {
    const currentPoint = routeCoordinates[i];
    const nextPoint = routeCoordinates[i + 1];
    const futurePoint = routeCoordinates[i + 2];
    
    // Distance jusqu'au virage
    const distanceToTurn = calculateDistance(
      userPos.latitude, userPos.longitude,
      nextPoint[1], nextPoint[0]
    );
    
    // Ne considérer que les virages dans la zone d'anticipation
    if (distanceToTurn > lookAheadDistance) continue;
    
    // Calculer l'angle du virage
    const bearing1 = calculateBearing(
      currentPoint[1], currentPoint[0],
      nextPoint[1], nextPoint[0]
    );
    const bearing2 = calculateBearing(
      nextPoint[1], nextPoint[0],
      futurePoint[1], futurePoint[0]
    );
    
    let turnAngle = bearing2 - bearing1;
    if (turnAngle > 180) turnAngle -= 360;
    if (turnAngle < -180) turnAngle += 360;
    
    // Détecter les virages significatifs (> 30 degrés)
    if (Math.abs(turnAngle) > 30) {
      turns.push({
        type: 'turn',
        direction: turnAngle > 0 ? 'right' : 'left',
        angle: Math.abs(turnAngle),
        distance: distanceToTurn,
        coordinates: nextPoint,
        severity: Math.abs(turnAngle) > 90 ? 'sharp' : 'normal'
      });
    }
  }
  
  return turns;
}
