// Coordonnées de sortie du village
export const VILLAGE_EXIT_COORDS = [120.951863, 14.350980];

// Distance minimale pour considérer qu'on est arrivé (en mètres)
export const ARRIVAL_THRESHOLD = 10;

// Calcule la distance entre deux points en mètres (formule haversine)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Rayon de la Terre en mètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calcule l'angle de direction (bearing) entre deux points
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

// Convertit l'angle en direction cardinale
export function bearingToDirection(bearing) {
  const directions = [
    { name: 'Nord', icon: '↑' },
    { name: 'Nord-Est', icon: '↗' },
    { name: 'Est', icon: '→' },
    { name: 'Sud-Est', icon: '↘' },
    { name: 'Sud', icon: '↓' },
    { name: 'Sud-Ouest', icon: '↙' },
    { name: 'Ouest', icon: '←' },
    { name: 'Nord-Ouest', icon: '↖' }
  ];
  
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// Formate la distance pour l'affichage
export function formatDistance(distance) {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
}

// Vérifie si l'utilisateur est arrivé à destination
export function hasArrived(userLat, userLon, destLat, destLon) {
  const distance = calculateDistance(userLat, userLon, destLat, destLon);
  return distance <= ARRIVAL_THRESHOLD;
}

// Crée un itinéraire en utilisant OSRM avec fallback
export async function createRoute(startLat, startLon, endLat, endLon) {
  try {
    // Timeout de 3 secondes pour éviter les blocages
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    
    const response = await fetch(osrmUrl, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('Aucun itinéraire trouvé');
    }
    
    const route = data.routes[0];
    
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: route.geometry,
        properties: {
          distance: route.distance,
          duration: route.duration,
          steps: route.legs[0]?.steps || [],
          source: 'osrm'
        }
      }]
    };
  } catch (error) {
    console.warn('Erreur OSRM, utilisation route directe:', error);
    // Fallback vers route directe en cas d'erreur
    return createDirectRoute(startLat, startLon, endLat, endLon);
  }
}

// Fallback: Crée un itinéraire simple en ligne droite
export function createDirectRoute(startLat, startLon, endLat, endLon) {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [startLon, startLat],
          [endLon, endLat]
        ]
      },
      properties: {
        distance: calculateDistance(startLat, startLon, endLat, endLon),
        source: 'direct'
      }
    }]
  };
}

// Calcule les instructions de navigation
export function getNavigationInstructions(userLat, userLon, destLat, destLon, deviceBearing = 0) {
  const distance = calculateDistance(userLat, userLon, destLat, destLon);
  const bearing = calculateBearing(userLat, userLon, destLat, destLon);
  const direction = bearingToDirection(bearing);
  
  // Calcule l'angle relatif par rapport à l'orientation du device
  let relativeBearing = bearing - deviceBearing;
  if (relativeBearing < 0) relativeBearing += 360;
  if (relativeBearing > 360) relativeBearing -= 360;
  
  let instruction = '';
  if (distance <= ARRIVAL_THRESHOLD) {
    instruction = 'Vous êtes arrivé !';
  } else if (distance < 50) {
    instruction = `Destination à ${formatDistance(distance)}`;
  } else {
    // Instructions basées sur l'angle relatif
    if (relativeBearing < 15 || relativeBearing > 345) {
      instruction = 'Continuez tout droit';
    } else if (relativeBearing >= 15 && relativeBearing <= 75) {
      instruction = 'Tournez légèrement à droite';
    } else if (relativeBearing > 75 && relativeBearing <= 105) {
      instruction = 'Tournez à droite';
    } else if (relativeBearing > 105 && relativeBearing <= 165) {
      instruction = 'Tournez fortement à droite';
    } else if (relativeBearing > 165 && relativeBearing <= 195) {
      instruction = 'Faites demi-tour';
    } else if (relativeBearing > 195 && relativeBearing <= 255) {
      instruction = 'Tournez fortement à gauche';
    } else if (relativeBearing > 255 && relativeBearing <= 285) {
      instruction = 'Tournez à gauche';
    } else {
      instruction = 'Tournez légèrement à gauche';
    }
  }
  
  return {
    instruction,
    distance: formatDistance(distance),
    bearing,
    direction,
    relativeBearing,
    rawDistance: distance
  };
}