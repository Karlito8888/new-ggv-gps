/**
 * Type definitions for the OSRM Route API response.
 * Only the subset the app actually reads is described here.
 *
 * OSRM docs: http://project-osrm.org/docs/v5.24.0/api/#route-service
 */

// =====================================================================
// OSRM Route API response
// =====================================================================

export interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

export interface OSRMRoute {
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  distance: number;
  legs: OSRMLeg[];
}

export interface OSRMLeg {
  steps: OSRMStep[];
}

export interface OSRMStep {
  maneuver: OSRMManeuver;
  distance: number;
}

export interface OSRMManeuver {
  type: string;
  modifier?: string;
  location: [number, number];
}
