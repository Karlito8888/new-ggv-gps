import MapLibreGlDirections from "@maplibre/maplibre-gl-directions";
import * as turf from "@turf/turf";
import {
  formatDistance,
  bearingToDirection
} from "../utils/geoUtils";

// Village exit coordinates
export const VILLAGE_EXIT_COORDS = [120.951863, 14.35098];

// Route deviation and recalculation thresholds (internal use only)
const ROUTE_DEVIATION_THRESHOLD = 25; // meters - automatic recalculation threshold (réduit pour plus de réactivité)
const SIGNIFICANT_DEVIATION_THRESHOLD = 40; // meters - for detecting intentional route changes (réduit)
const MIN_RECALCULATION_INTERVAL = 8000; // 8 seconds - prevent too frequent recalculations (réduit)
const MIN_MOVEMENT_THRESHOLD = 8; // meters - minimum movement for route updates (réduit)
const DIRECTION_CHANGE_THRESHOLD = 35; // degrees - significant direction change (réduit pour plus de sensibilité)
const PERSISTENT_DEVIATION_TIME = 6000; // 6 seconds - time to confirm intentional deviation (réduit)

// Configuration constants
const ROUTING_CONFIG = {
  DIRECTIONS_OPTIONS: {
    profile: "walking",
    alternatives: false,
    congestion: false,
    geometries: "geojson",
    overview: "full",
    steps: true,
  },
  OSRM_URL: "https://routing.openstreetmap.de/routed-foot/route/v1/walking",
  ORS_URL: "https://api.openrouteservice.org/v2/directions/foot-walking",
  TIMEOUT: 8000, // 8 seconds timeout
  WALKING_SPEED: 1.4, // m/s for fallback calculations
};

// Initialize MapLibre Directions
let directions = null;

// Route recalculation state
let lastRecalculationTime = 0;
let lastRecalculationPosition = null;

// Persistent deviation tracking
let deviationStartTime = null;
let lastUserDirection = null;
let _consecutiveDeviations = 0;

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
  
  // Initialize native MapLibre sources for better performance
  initMapLibreRouteSources(map);
  
  return directions;
}

// Initialize MapLibre sources and layers for route management with feature states
export function initMapLibreRouteSources(map) {
  if (!map) return;

  // Main route source with unique feature IDs for state management
  if (!map.getSource('route-main')) {
    map.addSource('route-main', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      // Optimisation : réduire le buffer et la tolérance pour de meilleures performances
      buffer: 0,
      tolerance: 0.375,
      maxzoom: 22
    });
  }

  // Traveled route source
  if (!map.getSource('route-traveled')) {
    map.addSource('route-traveled', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      buffer: 0,
      tolerance: 0.375,
      maxzoom: 22
    });
  }

  // Remaining route source
  if (!map.getSource('route-remaining')) {
    map.addSource('route-remaining', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      buffer: 0,
      tolerance: 0.375,
      maxzoom: 22
    });
  }

  // Add layers with feature state expressions for dynamic styling
  if (!map.getLayer('route-traveled-layer')) {
    map.addLayer({
      id: 'route-traveled-layer',
      type: 'line',
      source: 'route-traveled',
      paint: {
        // Utiliser les feature states pour des styles dynamiques
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'highlighted'], false], '#fbbf24',
          ['boolean', ['feature-state', 'active'], false], '#f59e0b',
          '#94a3b8'
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'highlighted'], false], 6,
          ['boolean', ['feature-state', 'active'], false], 5,
          4
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'highlighted'], false], 0.9,
          ['boolean', ['feature-state', 'active'], false], 0.8,
          0.6
        ],
        // 'line-dasharray': ['literal', [3, 3]] // Commenté pour éviter les erreurs de data expression
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    });
  }

  if (!map.getLayer('route-remaining-layer')) {
    map.addLayer({
      id: 'route-remaining-layer',
      type: 'line',
      source: 'route-remaining',
      paint: {
        // Styles dynamiques basés sur les états
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'highlighted'], false], '#60a5fa',
          ['boolean', ['feature-state', 'active'], false], '#3b82f6',
          '#2563eb'
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'highlighted'], false], 6,
          ['boolean', ['feature-state', 'active'], false], 5,
          4
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'highlighted'], false], 1.0,
          ['boolean', ['feature-state', 'active'], false], 0.9,
          0.8
        ]
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    });
  }

  // Ajouter une couche unique pour les segments avec feature states (approche moderne)
  if (!map.getLayer('route-segments-layer')) {
    map.addLayer({
      id: 'route-segments-layer',
      type: 'line',
      source: 'route-main',
      paint: {
        // Style conditionnel basé sur les feature states
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'traveled'], false], '#f59e0b',
          ['boolean', ['feature-state', 'remaining'], false], '#3b82f6',
          ['boolean', ['feature-state', 'active'], false], '#10b981',
          '#6b7280'
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'active'], false], 6,
          ['boolean', ['feature-state', 'traveled'], false], 4,
          ['boolean', ['feature-state', 'remaining'], false], 4,
          3
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'active'], false], 1.0,
          ['boolean', ['feature-state', 'traveled'], false], 0.8,
          ['boolean', ['feature-state', 'remaining'], false], 0.8,
          0.6
        ],
        'line-dasharray': ['literal', [1, 0]] // Simplifié - pas de data expression
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    });
  }
}

// calculateDistance is now imported from geoUtils

// Calculate the shortest distance from a point to a line segment using Turf.js
function _pointToLineDistance(pointLat, pointLon, line1Lat, line1Lon, line2Lat, line2Lon) {
  const point = turf.point([pointLon, pointLat]);
  const line = turf.lineString([[line1Lon, line1Lat], [line2Lon, line2Lat]]);
  return turf.pointToLineDistance(point, line, { units: 'meters' });
}

// Check if user has deviated from the route using optimized MapLibre queryRenderedFeatures
export function isUserOffRoute(userLat, userLon, routeGeometry, threshold = ROUTE_DEVIATION_THRESHOLD, map = null) {
  if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 2) {
    return false; // Can't determine if off-route without valid route
  }

  // Optimisation : utiliser queryRenderedFeatures avec une approche multi-niveaux
  if (map && typeof map.queryRenderedFeatures === 'function') {
    try {
      const userPoint = map.project([userLon, userLat]);
      
      // Calculer la taille du buffer en pixels basée sur le seuil et le zoom
      const zoom = map.getZoom();
      const metersPerPixel = 1.5 * Math.pow(2, 15 - zoom);
      const pixelThreshold = Math.min(Math.max(threshold / metersPerPixel, 10), 100); // Limiter entre 10 et 100 pixels
      
      // Requête multi-échelle : commencer avec un petit buffer, augmenter si nécessaire
      const bufferSizes = [pixelThreshold * 0.5, pixelThreshold, pixelThreshold * 2];
      
      for (const bufferSize of bufferSizes) {
        const nearbyFeatures = map.queryRenderedFeatures(
          [
            [userPoint.x - bufferSize, userPoint.y - bufferSize],
            [userPoint.x + bufferSize, userPoint.y + bufferSize]
          ],
          { 
            layers: ['route-remaining-layer', 'route-main', 'route-segments-layer'],
            // Filtrer pour n'inclure que les features de route
            filter: ['==', '$type', 'LineString']
          }
        );
        
        // Si on trouve des features de route à n'importe quel niveau, l'utilisateur est sur la route
        if (nearbyFeatures.length > 0) {
          // Vérification supplémentaire : s'assurer que la feature est suffisamment proche
          const closestFeatureDistance = Math.min(
            ...nearbyFeatures.map(feature => {
              // Calculer la distance approximative au centre du bbox de la feature
              if (feature.geometry && feature.geometry.coordinates) {
                const coords = feature.geometry.coordinates;
                const centerCoord = Array.isArray(coords[0]) ? 
                  coords[Math.floor(coords.length / 2)] : coords;
                
                if (centerCoord && centerCoord.length >= 2) {
                  const featurePoint = map.project([centerCoord[0], centerCoord[1]]);
                  return Math.sqrt(
                    Math.pow(userPoint.x - featurePoint.x, 2) + 
                    Math.pow(userPoint.y - featurePoint.y, 2)
                  ) * metersPerPixel; // Convertir en mètres
                }
              }
              return Infinity;
            })
          );
          
          if (closestFeatureDistance <= threshold) {
            return false; // Sur la route
          }
        }
      }
      
      // Aucune feature de route trouvée dans les buffers, probablement hors route
      console.log(`🛣️ No route features found within ${threshold}m (pixel threshold: ${pixelThreshold}px)`);
      return true;
      
    } catch (error) {
      console.warn('queryRenderedFeatures failed, falling back to Turf.js:', error);
    }
  }

  // Fallback optimisé à Turf.js avec nos fonctions améliorées
  const userPoint = turf.point([userLon, userLat]);
  const routeLine = turf.lineString(routeGeometry.coordinates);
  
  // Use Turf's nearest point on line function
  const nearest = turf.nearestPointOnLine(routeLine, userPoint, { units: 'meters' });
  const minDistance = nearest.properties.dist;

  const isOffRoute = minDistance > threshold;
  if (isOffRoute) {
    console.log(`🛣️ User is off-route: ${minDistance.toFixed(1)}m from route (threshold: ${threshold}m)`);
  }
  return isOffRoute;
}

// Detect if user is approaching an intersection or decision point using Turf.js and MapLibre projections
export function isApproachingDecisionPoint(userLat, userLon, routeGeometry, lookAheadDistance = 50, map = null) {
  if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 3) {
    return false;
  }

  const userPoint = turf.point([userLon, userLat]);
  const routeLine = turf.lineString(routeGeometry.coordinates);
  
  // Find the closest point on the route
  const nearest = turf.nearestPointOnLine(routeLine, userPoint);
  const segmentIndex = nearest.properties.index;
  
  // Use MapLibre projection for more accurate distance calculations if map is available
  if (map) {
    try {
      const userPixel = map.project([userLon, userLat]);
      let totalPixelDistance = 0;
      
      for (let i = segmentIndex; i < routeGeometry.coordinates.length - 2 && totalPixelDistance < lookAheadDistance * 2; i++) {
        const [lon1, lat1] = routeGeometry.coordinates[i];
        const [lon2, lat2] = routeGeometry.coordinates[i + 1];
        const [lon3, lat3] = routeGeometry.coordinates[i + 2];
        
        const pixel1 = map.project([lon1, lat1]);
        const pixel2 = map.project([lon2, lat2]);
        const _pixel3 = map.project([lon3, lat3]);
        
        // Calculate pixel distance from user to segment for more accurate proximity detection
        const segmentPixelDistance = Math.sqrt(
          Math.pow(pixel2.x - pixel1.x, 2) + Math.pow(pixel2.y - pixel1.y, 2)
        );
        
        // Calculate distance from user pixel to segment midpoint
        const segmentMidpoint = {
          x: (pixel1.x + pixel2.x) / 2,
          y: (pixel1.y + pixel2.y) / 2
        };
        const userToSegmentDistance = Math.sqrt(
          Math.pow(userPixel.x - segmentMidpoint.x, 2) + Math.pow(userPixel.y - segmentMidpoint.y, 2)
        );
        
        totalPixelDistance += segmentPixelDistance;
        
        // Convert back to geographic distance for bearing calculation
        const geoDistance = turf.distance([lon1, lat1], [lon2, lat2], { units: 'meters' });
        
        // Calculate the angle between consecutive segments using Turf
        const bearing1 = turf.bearing(turf.point([lon1, lat1]), turf.point([lon2, lat2]));
        const bearing2 = turf.bearing(turf.point([lon2, lat2]), turf.point([lon3, lat3]));
        const angleDiff = Math.abs(bearing2 - bearing1);
        const normalizedAngle = Math.min(angleDiff, 360 - angleDiff);
        
        // If there's a significant turn ahead (>30°) and user is close to segment, consider it a decision point
        if (normalizedAngle > 30 && geoDistance < lookAheadDistance && userToSegmentDistance < 100) {
          console.log(`🛣️ Decision point detected ahead: ${normalizedAngle.toFixed(1)}° turn in ${geoDistance.toFixed(1)}m (pixel distance: ${userToSegmentDistance.toFixed(0)}px)`);
          return true;
        }
      }
    } catch (error) {
      console.warn('Map projection failed, falling back to geographic calculation:', error);
    }
  }
  
  // Fallback to geographic calculation
  let totalDistance = 0;
  for (let i = segmentIndex; i < routeGeometry.coordinates.length - 2 && totalDistance < lookAheadDistance; i++) {
    const [lon1, lat1] = routeGeometry.coordinates[i];
    const [lon2, lat2] = routeGeometry.coordinates[i + 1];
    const [lon3, lat3] = routeGeometry.coordinates[i + 2];
    
    totalDistance += turf.distance([lon1, lat1], [lon2, lat2], { units: 'meters' });
    
    // Calculate the angle between consecutive segments using Turf
    const bearing1 = turf.bearing(turf.point([lon1, lat1]), turf.point([lon2, lat2]));
    const bearing2 = turf.bearing(turf.point([lon2, lat2]), turf.point([lon3, lat3]));
    const angleDiff = Math.abs(bearing2 - bearing1);
    const normalizedAngle = Math.min(angleDiff, 360 - angleDiff);
    
    // If there's a significant turn ahead (>30°), consider it a decision point
    if (normalizedAngle > 30) {
      console.log(`🛣️ Decision point detected ahead: ${normalizedAngle.toFixed(1)}° turn in ${totalDistance.toFixed(1)}m`);
      return true;
    }
  }
  
  return false;
}

// Detect if user has intentionally changed route direction
export function detectIntentionalRouteChange(
  userLat,
  userLon,
  currentRoute,
  previousLat = null,
  previousLon = null
) {
  if (!currentRoute || !currentRoute.features || !currentRoute.features[0]) {
    return false;
  }

  const now = Date.now();
  const routeGeometry = currentRoute.features[0].geometry;
  const isOffRoute = isUserOffRoute(userLat, userLon, routeGeometry, SIGNIFICANT_DEVIATION_THRESHOLD);
  const isNearDecisionPoint = isApproachingDecisionPoint(userLat, userLon, routeGeometry);

  // Calculate user's current direction if we have previous position
  let currentUserDirection = null;
  if (previousLat && previousLon) {
    currentUserDirection = turf.bearing(turf.point([previousLon, previousLat]), turf.point([userLon, userLat]));
  }

  // Check for significant deviation
  if (isOffRoute) {
    _consecutiveDeviations++;
    
    // Start tracking deviation time
    if (!deviationStartTime) {
      deviationStartTime = now;
      console.log("🚨 Started tracking route deviation");
    }

    // Reduce required time if near a decision point (intersection/turn)
    const requiredTime = isNearDecisionPoint ? PERSISTENT_DEVIATION_TIME / 2 : PERSISTENT_DEVIATION_TIME;
    
    // Check if deviation has persisted long enough to be considered intentional
    const deviationDuration = now - deviationStartTime;
    if (deviationDuration >= requiredTime) {
      console.log(`🛣️ Intentional route change detected after ${(deviationDuration / 1000).toFixed(1)}s ${isNearDecisionPoint ? '(near intersection)' : ''}`);
      
      // Reset tracking
      deviationStartTime = null;
      _consecutiveDeviations = 0;
      return true;
    }

    // Check for significant direction change (more sensitive near decision points)
    if (lastUserDirection && currentUserDirection) {
      const directionChange = Math.abs(currentUserDirection - lastUserDirection);
      const normalizedChange = Math.min(directionChange, 360 - directionChange);
      const threshold = isNearDecisionPoint ? DIRECTION_CHANGE_THRESHOLD * 0.7 : DIRECTION_CHANGE_THRESHOLD;
      
      if (normalizedChange >= threshold) {
        console.log(`🔄 Significant direction change detected: ${normalizedChange.toFixed(1)}° ${isNearDecisionPoint ? '(near intersection)' : ''}`);
        deviationStartTime = null;
        _consecutiveDeviations = 0;
        return true;
      }
    }

    // Quick detection for major deviations (>75m from route)
    const currentDistance = isUserOffRoute(userLat, userLon, routeGeometry, 1000); // Get actual distance
    if (currentDistance && deviationDuration >= 3000) { // 3 seconds for major deviations
      console.log(`🚨 Major route deviation detected: user is far from original route`);
      deviationStartTime = null;
      _consecutiveDeviations = 0;
      return true;
    }
  } else {
    // User is back on route, reset deviation tracking
    if (deviationStartTime) {
      console.log("✅ User back on route, resetting deviation tracking");
      deviationStartTime = null;
      _consecutiveDeviations = 0;
    }
  }

  // Update last direction
  if (currentUserDirection !== null) {
    lastUserDirection = currentUserDirection;
  }

  return false;
}

// Check if route should be recalculated based on various conditions
export function shouldRecalculateRoute(
  userLat,
  userLon,
  currentRoute,
  forceRecalculation = false,
  previousLat = null,
  previousLon = null,
  map = null
) {
  const now = Date.now();

  // Force recalculation if requested (for manual triggers)
  if (forceRecalculation) {
    console.log("🔄 Manual recalculation requested");
    return true;
  }

  // Don't recalculate too frequently
  if (now - lastRecalculationTime < MIN_RECALCULATION_INTERVAL) {
    console.log(
      `⏱️ Recalculation cooldown active (${(
        (now - lastRecalculationTime) /
        1000
      ).toFixed(1)}s ago)`
    );
    return false;
  }

  // Check if user has moved significantly since last recalculation
  if (lastRecalculationPosition) {
    const movementDistance = turf.distance(
      [userLon, userLat],
      [lastRecalculationPosition.lon, lastRecalculationPosition.lat],
      { units: 'meters' }
    );

    if (movementDistance < MIN_MOVEMENT_THRESHOLD) {
      console.log(
        `📍 Insufficient movement for recalculation (${movementDistance.toFixed(
          1
        )}m)`
      );
      return false;
    }
  }

  // Check for intentional route changes first
  const intentionalChange = detectIntentionalRouteChange(userLat, userLon, currentRoute, previousLat, previousLon);

  if (intentionalChange) {
    console.log("🛣️ Intentional route change detected, triggering recalculation");
    return true;
  }

  // Check if user is off the current route (standard deviation)
  if (currentRoute && currentRoute.features && currentRoute.features[0]) {
    const routeGeometry = currentRoute.features[0].geometry;
    const isOffRoute = isUserOffRoute(userLat, userLon, routeGeometry, ROUTE_DEVIATION_THRESHOLD, map);

    if (isOffRoute) {
      console.log("🚨 User is off-route, automatic recalculation triggered");
      return true;
    }
  }

  return false;
}

// Update recalculation state
export function updateRecalculationState(userLat, userLon) {
  lastRecalculationTime = Date.now();
  lastRecalculationPosition = { lat: userLat, lon: userLon };
  console.log("📊 Recalculation state updated");
}

// Reset recalculation state (useful when starting new navigation)
export function resetRecalculationState() {
  lastRecalculationTime = 0;
  lastRecalculationPosition = null;
  deviationStartTime = null;
  lastUserDirection = null;
  _consecutiveDeviations = 0;
  console.log("🔄 Recalculation state reset");
}

// calculateBearing is now imported from geoUtils

// bearingToDirection and formatDistance are now imported from geoUtils

// Check if user has arrived at destination using Turf.js
export function hasArrived(userLat, userLon, destLat, destLon) {
  return turf.distance([userLon, userLat], [destLat, destLon], { units: 'meters' }) <= 10;
}

// Fallback: Creates a simple straight-line route using Turf.js
function createDirectRoute(startLat, startLon, endLat, endLon) {
  const start = turf.point([startLon, startLat]);
  const end = turf.point([endLon, endLat]);
  const distance = turf.distance(start, end, { units: 'meters' });
  
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [startLon, startLat],
        [endLon, endLat],
      ],
    },
    properties: {
      distance,
      duration: Math.round(distance / ROUTING_CONFIG.WALKING_SPEED),
      source: "direct",
    },
  };
}

// Try OSRM routing service
async function tryOSRM(startLat, startLon, endLat, endLon) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    ROUTING_CONFIG.TIMEOUT
  );

  const url = `${ROUTING_CONFIG.OSRM_URL}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: "application/json" },
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`OSRM HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.routes?.[0]) {
    throw new Error("OSRM returned no routes");
  }

  return {
    type: "Feature",
    geometry: data.routes[0].geometry,
    properties: {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      steps: data.routes[0].legs[0]?.steps || [],
      source: "osrm",
    },
  };
}

// Try MapLibre Directions
async function tryMapLibreDirections(startLat, startLon, endLat, endLon, map) {
  if (!directions || !map) {
    throw new Error("MapLibre Directions not initialized or no map instance");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    10000 // 10 seconds timeout for MapLibre
  );

  try {
    // Set origin and destination
    await directions.setOrigin([startLon, startLat]);
    await directions.setDestination([endLon, endLat]);
    
    // Get the route
    const routes = directions.getRoutes();
    
    clearTimeout(timeoutId);
    
    if (!routes || routes.length === 0) {
      throw new Error("MapLibre Directions returned no routes");
    }

    const route = routes[0];
    
    return {
      type: "Feature",
      geometry: route.geometry,
      properties: {
        distance: route.distance || turf.distance([startLon, startLat], [endLon, endLat], { units: 'meters' }),
        duration: route.duration || Math.round((route.distance || turf.distance([startLon, startLat], [endLon, endLat], { units: 'meters' })) / ROUTING_CONFIG.WALKING_SPEED),
        steps: route.legs?.[0]?.steps || [],
        source: "maplibre-directions",
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Try OpenRouteService as fallback
async function tryORS(startLat, startLon, endLat, endLon) {
  const apiKey = import.meta.env.VITE_OPENROUTE_API_KEY;
  if (!apiKey) throw new Error("Missing ORS API key");

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    ROUTING_CONFIG.TIMEOUT
  );

  const response = await fetch(ROUTING_CONFIG.ORS_URL, {
    signal: controller.signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      coordinates: [
        [startLon, startLat],
        [endLon, endLat],
      ],
      format: "geojson",
    }),
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`ORS HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.features?.[0]) {
    throw new Error("ORS returned no routes");
  }

  return {
    ...data.features[0],
    properties: {
      ...data.features[0].properties,
      source: "ors",
    },
  };
}

// Main route creation function with fallback logic and MapLibre source management
export async function createRoute(startLat, startLon, endLat, endLon, map = null) {
  console.log("🚀 Creating route with cascading fallback");

  const services = [
    {
      name: "OSRM (OpenStreetMap.de)",
      fn: () => tryOSRM(startLat, startLon, endLat, endLon),
    },
    {
      name: "MapLibre Directions",
      fn: () => map ? tryMapLibreDirections(startLat, startLon, endLat, endLon, map) : Promise.reject(new Error("No map instance"))
    },
    {
      name: "OpenRouteService",
      fn: () => tryORS(startLat, startLon, endLat, endLon),
    },
    {
      name: "Direct Route",
      fn: () => Promise.resolve(createDirectRoute(startLat, startLon, endLat, endLon)),
    },
  ];

  for (const [index, service] of services.entries()) {
    try {
      console.log(`📍 Tentative ${index + 1}/${services.length}: ${service.name}`);
      const result = await service.fn();
      console.log(`✅ Success with ${service.name}:`, result.properties?.source);
      
      // Update MapLibre sources if map is provided
      if (map) {
        await updateMapLibreRouteSources(map, result);
      }
      
      return result;
    } catch (error) {
      console.warn(`❌ ${service.name} failed:`, error.message);

      // Si c'est le dernier service, on force le succès
      if (index === services.length - 1) {
        console.log("🔄 Forcing direct route as last resort");
        const directRoute = createDirectRoute(startLat, startLon, endLat, endLon);
        
        // Update MapLibre sources if map is provided
        if (map) {
          await updateMapLibreRouteSources(map, directRoute);
        }
        
        return directRoute;
      }
    }
  }

  // Ne devrait jamais arriver, mais sécurité
  const directRoute = createDirectRoute(startLat, startLon, endLat, endLon);
  
  // Update MapLibre sources if map is provided
  if (map) {
    await updateMapLibreRouteSources(map, directRoute);
  }
  
  return directRoute;
}

// Update MapLibre sources with new route data and feature states
async function updateMapLibreRouteSources(map, routeData) {
  if (!map || !routeData) return;

  try {
    // Ensure sources exist
    initMapLibreRouteSources(map);

    // Update main route source
    if (map.getSource('route-main')) {
      map.getSource('route-main').setData({
        type: 'FeatureCollection',
        features: [routeData]
      });
    }

    // Initialize traveled and remaining routes with empty data
    if (map.getSource('route-traveled')) {
      map.getSource('route-traveled').setData({
        type: 'FeatureCollection',
        features: []
      });
    }

    if (map.getSource('route-remaining')) {
      map.getSource('route-remaining').setData({
        type: 'FeatureCollection',
        features: [routeData]
      });
    }

    // Set initial feature states for route segments
    if (routeData.geometry && routeData.geometry.coordinates) {
      setRouteSegmentStates(map, routeData, 'initial');
    }

    console.log('✅ MapLibre route sources updated');
  } catch (error) {
    console.warn('❌ Error updating MapLibre sources:', error);
  }
}

// Set feature states for route segments with unique IDs
function setRouteSegmentStates(map, routeData, state) {
  if (!map || !routeData || !routeData.geometry) return;

  try {
    const coordinates = routeData.geometry.coordinates;
    
    // Créer des features avec des IDs uniques pour chaque segment
    const segmentFeatures = [];
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const feature = {
        type: 'Feature',
        id: `route-segment-${i}`, // ID unique pour le feature state
        geometry: {
          type: 'LineString',
          coordinates: [coordinates[i], coordinates[i + 1]]
        },
        properties: {
          segmentIndex: i,
          originalIndex: i
        }
      };
      segmentFeatures.push(feature);
    }
    
    // Mettre à jour la source avec les segments
    if (map.getSource('route-main')) {
      map.getSource('route-main').setData({
        type: 'FeatureCollection',
        features: segmentFeatures
      });
    }
    
    // Appliquer les états aux segments
    segmentFeatures.forEach((feature) => {
      let segmentState = {};
      
      switch (state) {
        case 'traveled':
          segmentState = { traveled: true, remaining: false, active: false };
          break;
        case 'remaining':
          segmentState = { traveled: false, remaining: true, active: false };
          break;
        case 'active':
          segmentState = { traveled: false, remaining: false, active: true };
          break;
        default:
          segmentState = { traveled: false, remaining: false, active: false };
      }
      
      map.setFeatureState(
        {
          source: 'route-main',
          id: feature.id
        },
        segmentState
      );
    });
    
    console.log(`✅ Route segment states set to: ${state} (${segmentFeatures.length} segments)`);
  } catch (error) {
    console.warn('❌ Error setting feature states:', error);
  }
}

// Update feature state for user's current position on route with MapLibre projections
export function updateUserPositionOnRoute(map, userLat, userLon, routeData) {
  if (!map || !routeData || !routeData.geometry) return;

  try {
    // Use MapLibre projection for more accurate positioning
    const userPoint = turf.point([userLon, userLat]);
    const userPixel = map.project([userLon, userLat]);
    
    const routeLine = turf.lineString(routeData.geometry.coordinates);
    const nearest = turf.nearestPointOnLine(routeLine, userPoint);
    
    const segmentIndex = nearest.properties.index;
    const totalSegments = routeData.geometry.coordinates.length - 1;
    
    // Optimisation : ne mettre à jour que les segments qui ont changé d'état
    const currentStates = new Map();
    
    // Obtenir l'état actuel des segments (si disponible)
    for (let i = 0; i < totalSegments; i++) {
      try {
        const state = map.getFeatureState({ source: 'route-main', id: `route-segment-${i}` });
        currentStates.set(i, state);
      } catch {
        currentStates.set(i, {});
      }
    }
    
    // Mark segments as traveled up to current position
    for (let i = 0; i <= segmentIndex; i++) {
      const currentState = currentStates.get(i) || {};
      const newState = { 
        traveled: true, 
        remaining: false, 
        active: i === segmentIndex,
        userPixel: userPixel // Store pixel coordinates for visualization
      };
      
      // Ne mettre à jour que si l'état a changé
      if (shouldUpdateFeatureState(currentState, newState)) {
        map.setFeatureState(
          { source: 'route-main', id: `route-segment-${i}` },
          newState
        );
      }
    }
    
    // Mark remaining segments
    for (let i = segmentIndex + 1; i < totalSegments; i++) {
      const currentState = currentStates.get(i) || {};
      const newState = { 
        traveled: false, 
        remaining: true, 
        active: false 
      };
      
      // Ne mettre à jour que si l'état a changé
      if (shouldUpdateFeatureState(currentState, newState)) {
        map.setFeatureState(
          { source: 'route-main', id: `route-segment-${i}` },
          newState
        );
      }
    }
    
    console.log(`📍 User position updated on route segment ${segmentIndex}/${totalSegments - 1} at pixel (${userPixel.x.toFixed(0)}, ${userPixel.y.toFixed(0)})`);
  } catch (error) {
    console.warn('❌ Error updating user position state:', error);
  }
}

// Helper function to check if feature state needs updating
function shouldUpdateFeatureState(currentState, newState) {
  return (
    currentState.traveled !== newState.traveled ||
    currentState.remaining !== newState.remaining ||
    currentState.active !== newState.active
  );
}

// Utility functions for coordinate conversion using MapLibre
export function convertToPixelCoordinates(map, lat, lon) {
  if (!map) return null;
  try {
    return map.project([lon, lat]);
  } catch (error) {
    console.warn('❌ Error converting to pixel coordinates:', error);
    return null;
  }
}

export function convertToGeographicCoordinates(map, x, y) {
  if (!map) return null;
  try {
    const lngLat = map.unproject([x, y]);
    return { lat: lngLat.lat, lon: lngLat.lng };
  } catch (error) {
    console.warn('❌ Error converting to geographic coordinates:', error);
    return null;
  }
}

// Calculate screen distance between two geographic points
export function calculateScreenDistance(map, lat1, lon1, lat2, lon2) {
  if (!map) return null;
  try {
    const pixel1 = map.project([lon1, lat1]);
    const pixel2 = map.project([lon2, lat2]);
    
    return Math.sqrt(
      Math.pow(pixel2.x - pixel1.x, 2) + Math.pow(pixel2.y - pixel1.y, 2)
    );
  } catch (error) {
    console.warn('❌ Error calculating screen distance:', error);
    return null;
  }
}

// Calculate navigation instructions using Turf.js
export function getNavigationInstructions(userLat, userLon, destLat, destLon, deviceBearing = 0) {
  const userPoint = turf.point([userLon, userLat]);
  const destPoint = turf.point([destLon, destLat]);
  const distance = turf.distance(userPoint, destPoint, { units: 'meters' });
  const bearing = turf.bearing(userPoint, destPoint);
  const relativeBearing = (bearing - deviceBearing + 360) % 360;
  const direction = bearingToDirection(bearing);

  let instruction = "";
  if (distance <= 10) {
    instruction = "You have arrived!";
  } else {
    // Determine instruction based on relative bearing
    const bearingRanges = [
      { max: 15, text: "Continue straight ahead" },
      { max: 75, text: "Turn slightly right" },
      { max: 105, text: "Turn right" },
      { max: 165, text: "Turn sharply right" },
      { max: 195, text: "Turn around" },
      { max: 255, text: "Turn sharply left" },
      { max: 285, text: "Turn left" },
      { max: 345, text: "Turn slightly left" },
      { max: 360, text: "Continue straight ahead" },
    ];

    instruction = bearingRanges.find(
      (range) => relativeBearing <= range.max
    ).text;

    if (distance < 50) {
      instruction += ` (${formatDistance(distance)})`;
    }
  }

  return {
    instruction,
    distance: formatDistance(distance),
    bearing,
    direction,
    relativeBearing,
    rawDistance: distance,
  };
}

// Cleanup directions instance (internal use only)
// function cleanupDirections() {
//   if (directions) {
//     // directions.remove();
//     directions = null;
//   }
// }

// Create a route with only the remaining portion using Turf.js and MapLibre sources
export function createRemainingRoute(userLat, userLon, originalRoute, map = null) {
  if (!originalRoute || !originalRoute.features || !originalRoute.features[0]) {
    return originalRoute;
  }

  const routeFeature = originalRoute.features[0];
  const routeGeometry = routeFeature.geometry;

  if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 2) {
    return originalRoute;
  }

  // Use Turf.js to find the closest point on the route
  const userPoint = turf.point([userLon, userLat]);
  const routeLine = turf.lineString(routeGeometry.coordinates);
  const nearest = turf.nearestPointOnLine(routeLine, userPoint);
  
  const segmentIndex = nearest.properties.index;
  const closestPoint = nearest.geometry.coordinates;

  // Create new coordinates array starting from the closest point
  const remainingCoordinates = [closestPoint];

  // Add all remaining segments
  for (let i = segmentIndex + 1; i < routeGeometry.coordinates.length; i++) {
    remainingCoordinates.push(routeGeometry.coordinates[i]);
  }

  // If the remaining route is too short, keep the original
  if (remainingCoordinates.length < 2) {
    return originalRoute;
  }

  // Calculate remaining distance using Turf.js
  const remainingLine = turf.lineString(remainingCoordinates);
  const remainingDistance = turf.length(remainingLine, { units: 'meters' });

  // Create new route feature with remaining coordinates
  const remainingRoute = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: remainingCoordinates,
        },
        properties: {
          ...routeFeature.properties,
          distance: remainingDistance,
          isRemainingRoute: true,
          originalDistance: routeFeature.properties?.distance || remainingDistance,
        },
      },
    ],
  };

  console.log(`🛣️ Route updated: ${formatDistance(remainingDistance)} remaining (was ${formatDistance(routeFeature.properties?.distance || 0)})`);

  // Update MapLibre source and feature states if map is provided
  if (map) {
    if (map.getSource('route-remaining')) {
      map.getSource('route-remaining').setData(remainingRoute);
    }
    
    // Update feature states to reflect the new remaining portion
    updateUserPositionOnRoute(map, userLat, userLon, originalRoute);
  }

  return remainingRoute;
}

// Check if the route should be updated using Turf.js
export function shouldUpdateRemainingRoute(userLat, userLon, currentRoute, lastUpdatePosition, threshold = 20) {
  if (!lastUpdatePosition) {
    return true; // First update
  }

  const movementDistance = turf.distance(
    [userLon, userLat],
    [lastUpdatePosition.lon, lastUpdatePosition.lat],
    { units: 'meters' }
  );

  // Update if user has moved significantly forward
  if (movementDistance >= threshold) {
    console.log(`📍 User moved ${formatDistance(movementDistance)}, updating remaining route`);
    return true;
  }

  return false;
}

// Create a route showing the traveled portion using Turf.js and MapLibre sources
export function createTraveledRoute(userLat, userLon, originalRoute, map = null) {
  if (!originalRoute || !originalRoute.features || !originalRoute.features[0]) {
    return null;
  }

  const routeFeature = originalRoute.features[0];
  const routeGeometry = routeFeature.geometry;

  if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 2) {
    return null;
  }

  // Use Turf.js to find the closest point on the route
  const userPoint = turf.point([userLon, userLat]);
  const routeLine = turf.lineString(routeGeometry.coordinates);
  const nearest = turf.nearestPointOnLine(routeLine, userPoint);
  
  const segmentIndex = nearest.properties.index;
  const closestPoint = nearest.geometry.coordinates;
  const coordinates = routeGeometry.coordinates;

  // Create coordinates array from start to the closest point
  const traveledCoordinates = [];

  // Add all segments up to the current segment
  for (let i = 0; i <= segmentIndex; i++) {
    traveledCoordinates.push(coordinates[i]);
  }

  // Add the closest point as the end point (if not already at segment start)
  if (nearest.properties.location > 0) {
    traveledCoordinates.push(closestPoint);
  }

  // Need at least 2 points for a line
  if (traveledCoordinates.length < 2) {
    return null;
  }

  // Calculate traveled distance using Turf.js
  const traveledLine = turf.lineString(traveledCoordinates);
  const traveledDistance = turf.length(traveledLine, { units: 'meters' });

  // Create traveled route feature
  const traveledRoute = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: traveledCoordinates,
        },
        properties: {
          distance: traveledDistance,
          isTraveledRoute: true,
        },
      },
    ],
  };

  // Update MapLibre source and feature states if map is provided
  if (map) {
    if (map.getSource('route-traveled')) {
      map.getSource('route-traveled').setData(traveledRoute);
    }
    
    // Update feature states to reflect the new traveled portion
    updateUserPositionOnRoute(map, userLat, userLon, originalRoute);
  }

  return traveledRoute;
}
