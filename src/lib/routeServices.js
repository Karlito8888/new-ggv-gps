// Route creation services and API integrations

import { ROUTING_CONFIG } from './constants.js';

/**
 * Creates a simple straight-line route as fallback
 * @param {number} startLat - Start latitude
 * @param {number} startLon - Start longitude
 * @param {number} endLat - End latitude
 * @param {number} endLon - End longitude
 * @returns {Object} Direct route feature
 */
export function createDirectRoute(startLat, startLon, endLat, endLon) {
  const distance = calculateDistance(startLat, startLon, endLat, endLon);
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

/**
 * Try OSRM routing service
 * @param {number} startLat - Start latitude
 * @param {number} startLon - Start longitude
 * @param {number} endLat - End latitude
 * @param {number} endLon - End longitude
 * @returns {Promise<Object>} Route feature from OSRM
 */
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

/**
 * Try OpenRouteService as fallback
 * @param {number} startLat - Start latitude
 * @param {number} startLon - Start longitude
 * @param {number} endLat - End latitude
 * @param {number} endLon - End longitude
 * @returns {Promise<Object>} Route feature from ORS
 */
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

/**
 * Main route creation function with fallback logic
 * @param {number} startLat - Start latitude
 * @param {number} startLon - Start longitude
 * @param {number} endLat - End latitude
 * @param {number} endLon - End longitude
 * @returns {Promise<Object>} Route feature
 */
export async function createRoute(startLat, startLon, endLat, endLon) {
  console.log("🚀 Création de route avec fallback en cascade");

  const services = [
    {
      name: "OSRM (OpenStreetMap.de)",
      fn: () => tryOSRM(startLat, startLon, endLat, endLon),
    },
    // Désactivé temporairement car timeout trop fréquent
    // {
    //   name: "MapLibre Directions",
    //   fn: () => map ? tryMapLibreDirections(startLat, startLon, endLat, endLon, map) : Promise.reject(new Error("No map instance"))
    // },
    {
      name: "OpenRouteService",
      fn: () => tryORS(startLat, startLon, endLat, endLon),
    },
    {
      name: "Direct Route",
      fn: () =>
        Promise.resolve(createDirectRoute(startLat, startLon, endLat, endLon)),
    },
  ];

  for (const [index, service] of services.entries()) {
    try {
      console.log(`📍 Tentative ${index + 1}/4: ${service.name}`);
      const result = await service.fn();
      console.log(`✅ Succès avec ${service.name}:`, result.properties?.source);
      return result;
    } catch (error) {
      console.warn(`❌ ${service.name} échoué:`, error.message);

      // Si c'est le dernier service, on force le succès
      if (index === services.length - 1) {
        console.log("🔄 Forçage de la route directe en dernier recours");
        return createDirectRoute(startLat, startLon, endLat, endLon);
      }
    }
  }

  // Ne devrait jamais arriver, mais sécurité
  return createDirectRoute(startLat, startLon, endLat, endLon);
}

// Import calculateDistance function (we need to add this import)
import { calculateDistance } from './geometry.js';