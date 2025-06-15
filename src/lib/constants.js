// Navigation constants and configuration
export const VILLAGE_EXIT_COORDS = [120.951863, 14.35098];

// Distance thresholds (in meters)
export const ARRIVAL_THRESHOLD = 10;
export const ROUTE_DEVIATION_THRESHOLD = 30;
export const MIN_MOVEMENT_THRESHOLD = 10;

// Time thresholds (in milliseconds)
export const MIN_RECALCULATION_INTERVAL = 15000; // 15 seconds

// Routing configuration
export const ROUTING_CONFIG = {
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