/**
 * Type definitions for routing API responses (OSRM and ORS).
 * These interfaces describe the subset of the API response that we actually use.
 *
 * OSRM docs: http://project-osrm.org/docs/v5.24.0/api/#route-service
 * ORS docs: https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/post
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

// =====================================================================
// OpenRouteService (ORS) Directions API response
// =====================================================================

export interface ORSResponse {
  features: ORSFeature[];
}

export interface ORSFeature {
  type: "Feature";
  geometry: ORSGeometry;
  properties: {
    summary: {
      distance: number;
      duration: number;
    };
  };
}

export type ORSGeometry =
  | {
      type: "LineString";
      coordinates: [number, number][];
    }
  | {
      type: "MultiLineString";
      coordinates: [number, number][][];
    };
