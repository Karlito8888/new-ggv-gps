/**
 * Utilitaires géographiques réutilisables
 * Optimisé avec les API natives MapLibre pour les calculs de projection
 */

/**
 * Calcule la distance entre deux points GPS en utilisant les projections MapLibre
 * Plus précis et optimisé que la formule Haversine
 * @param {number} lat1 - Latitude du premier point
 * @param {number} lon1 - Longitude du premier point
 * @param {number} lat2 - Latitude du second point
 * @param {number} lon2 - Longitude du second point
 * @param {Object} map - Instance MapLibre (optionnel mais recommandé)
 * @returns {number} Distance en mètres
 */
export function calculateDistance(lat1, lon1, lat2, lon2, map = null) {
  // Utiliser MapLibre project() si disponible pour plus de précision
  if (map && typeof map.project === 'function') {
    try {
      const pixel1 = map.project([lon1, lat1]);
      const pixel2 = map.project([lon2, lat2]);
      
      // Calculer la distance en pixels puis convertir en mètres
      const pixelDistance = Math.sqrt(
        Math.pow(pixel2.x - pixel1.x, 2) + Math.pow(pixel2.y - pixel1.y, 2)
      );
      
      // Convertir la distance pixel en distance réelle basée sur le zoom
      const zoom = map.getZoom();
      // Approximation : à zoom 15, 1 pixel ≈ 1.5m (varie selon la latitude)
      const metersPerPixel = 1.5 * Math.pow(2, 15 - zoom);
      
      return pixelDistance * metersPerPixel;
    } catch (error) {
      console.warn('MapLibre project() failed, fallback to Haversine:', error);
    }
  }
  
  // Fallback : formule Haversine originale
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
 * Calcule l'angle de direction entre deux points GPS avec MapLibre
 * Utilise les projections pixel pour des calculs plus précis
 * @param {number} lat1 - Latitude du premier point
 * @param {number} lon1 - Longitude du premier point
 * @param {number} lat2 - Latitude du second point
 * @param {number} lon2 - Longitude du second point
 * @param {Object} map - Instance MapLibre (optionnel mais recommandé)
 * @returns {number} Angle en degrés (0-360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2, map = null) {
  // Utiliser MapLibre project() si disponible pour plus de précision
  if (map && typeof map.project === 'function') {
    try {
      const pixel1 = map.project([lon1, lat1]);
      const pixel2 = map.project([lon2, lat2]);
      
      // Calculer le bearing à partir des coordonnées pixel
      const deltaX = pixel2.x - pixel1.x;
      const deltaY = pixel2.y - pixel1.y;
      
      // Convertir en degrés (0° = nord, 90° = est)
      let bearing = Math.atan2(deltaX, -deltaY) * 180 / Math.PI;
      return (bearing + 360) % 360;
    } catch (error) {
      console.warn('MapLibre project() failed for bearing, fallback to trig:', error);
    }
  }
  
  // Fallback : calcul trigonométrique original
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
 * @param {Object} map - Instance MapLibre (optionnel)
 * @returns {number} Distance totale en mètres
 */
export function calculateRouteDistance(routeData, map = null) {
  if (!routeData?.features?.[0]?.geometry?.coordinates) return 0;
  
  const coordinates = routeData.features[0].geometry.coordinates;
  
  return coordinates.reduce((total, coord, index) => {
    if (index === 0) return 0;
    const prevCoord = coordinates[index - 1];
    return total + calculateDistance(prevCoord[1], prevCoord[0], coord[1], coord[0], map);
  }, 0);
}

/**
 * Crée un snap-to-road basique
 * @param {Object} userPos - Position utilisateur {latitude, longitude}
 * @param {Array} routeCoordinates - Coordonnées de la route
 * @param {number} maxDistance - Distance maximale pour snap (défaut: 20m)
 * @param {Object} map - Instance MapLibre (optionnel)
 * @returns {Object|null} Position snappée ou null
 */
export function snapToRoad(userPos, routeCoordinates, maxDistance = 20, map = null) {
  if (!routeCoordinates || routeCoordinates.length === 0) return null;
  
  const closestPoint = findClosestPointOnRoute(
    userPos.latitude, 
    userPos.longitude, 
    routeCoordinates,
    map
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
 * @param {Object} map - Instance MapLibre (optionnel)
 * @returns {Array} Liste des virages détectés
 */
export function detectTurns(routeCoordinates, userPos, lookAheadDistance = 100, map = null) {
  if (!routeCoordinates || routeCoordinates.length < 3) return [];
  
  const turns = [];
  
  const closestPoint = findClosestPointOnRoute(
    userPos.latitude, 
    userPos.longitude, 
    routeCoordinates,
    map
  );
  
  if (!closestPoint) return [];
  
  const startIndex = closestPoint.segmentIndex;
  
  for (let i = startIndex; i < routeCoordinates.length - 2; i++) {
    const [currentLon, currentLat] = routeCoordinates[i];
    const [nextLon, nextLat] = routeCoordinates[i + 1];
    const [futureLon, futureLat] = routeCoordinates[i + 2];
    
    const distanceToTurn = calculateDistance(
      userPos.latitude, userPos.longitude,
      nextLat, nextLon,
      map
    );
    
    if (distanceToTurn > lookAheadDistance) continue;
    
    const bearing1 = calculateBearing(currentLat, currentLon, nextLat, nextLon, map);
    const bearing2 = calculateBearing(nextLat, nextLon, futureLat, futureLon, map);
    
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

/**
 * Trouve le point le plus proche sur une route par rapport à la position utilisateur
 * Optimisé avec MapLibre project() pour des calculs plus rapides et précis
 * @param {number} userLat - Latitude de l'utilisateur
 * @param {number} userLon - Longitude de l'utilisateur
 * @param {Object} routeGeometry - Géométrie de la route GeoJSON
 * @param {Object} map - Instance MapLibre (optionnel mais recommandé)
 * @returns {Object|null} Informations sur le point le plus proche
 */
export function findClosestPointOnRoute(userLat, userLon, routeGeometry, map = null) {
  if (
    !routeGeometry ||
    !routeGeometry.coordinates ||
    routeGeometry.coordinates.length < 2
  ) {
    return null;
  }

  const coordinates = routeGeometry.coordinates;
  
  // Optimisation MapLibre : utiliser les projections pixel pour des calculs plus rapides
  if (map && typeof map.project === 'function') {
    try {
      const userPixel = map.project([userLon, userLat]);
      let closestPixel = null;
      let minPixelDistance = Infinity;
      let segmentIndex = 0;
      let positionOnSegment = 0;

      // Convertir toutes les coordonnées en pixels une fois
      const pixelCoordinates = coordinates.map(coord => map.project([coord[0], coord[1]]));

      // Vérifier chaque segment avec des calculs pixel
      for (let i = 0; i < pixelCoordinates.length - 1; i++) {
        const pixel1 = pixelCoordinates[i];
        const pixel2 = pixelCoordinates[i + 1];

        // Calculer le point le plus proche sur ce segment (algorithme de projection vectorielle)
        const dx = pixel2.x - pixel1.x;
        const dy = pixel2.y - pixel1.y;
        const lenSq = dx * dx + dy * dy;

        let param = 0;
        if (lenSq !== 0) {
          const t = ((userPixel.x - pixel1.x) * dx + (userPixel.y - pixel1.y) * dy) / lenSq;
          param = Math.max(0, Math.min(1, t));
        }

        const closestX = pixel1.x + param * dx;
        const closestY = pixel1.y + param * dy;
        
        const pixelDistance = Math.sqrt(
          Math.pow(userPixel.x - closestX, 2) + Math.pow(userPixel.y - closestY, 2)
        );

        if (pixelDistance < minPixelDistance) {
          minPixelDistance = pixelDistance;
          closestPixel = { x: closestX, y: closestY };
          segmentIndex = i;
          positionOnSegment = param;
        }
      }

      // Convertir le point pixel le plus proche en coordonnées géographiques
      if (closestPixel) {
        const closestLngLat = map.unproject([closestPixel.x, closestPixel.y]);
        
        // Convertir la distance pixel en mètres (approximation basée sur le zoom)
        const zoom = map.getZoom();
        const metersPerPixel = 1.5 * Math.pow(2, 15 - zoom);
        const distanceInMeters = minPixelDistance * metersPerPixel;

        return {
          point: [closestLngLat.lng, closestLngLat.lat],
          segmentIndex,
          positionOnSegment,
          distance: distanceInMeters,
        };
      }
    } catch (error) {
      console.warn('MapLibre projection failed for closest point, fallback to geometric:', error);
    }
  }

  // Fallback : calcul géométrique original amélioré
  let closestPoint = null;
  let minDistance = Infinity;
  let segmentIndex = 0;
  let positionOnSegment = 0;

  // Vérifier chaque segment de la route
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];

    // Calculer le point le plus proche sur ce segment
    const A = userLat - lat1;
    const B = userLon - lon1;
    const C = lat2 - lat1;
    const D = lon2 - lon1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = lat1;
      yy = lon1;
      param = 0;
    } else if (param > 1) {
      xx = lat2;
      yy = lon2;
      param = 1;
    } else {
      xx = lat1 + param * C;
      yy = lon1 + param * D;
    }

    const distance = calculateDistance(userLat, userLon, xx, yy, map);

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = [yy, xx]; // [lon, lat]
      segmentIndex = i;
      positionOnSegment = param;
    }
  }

  return {
    point: closestPoint,
    segmentIndex,
    positionOnSegment,
    distance: minDistance,
  };
}