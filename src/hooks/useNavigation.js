import { useState, useEffect } from "react";

/**
 * useNavigation Hook
 *
 * Provides turn-by-turn navigation logic and arrival detection.
 * Uses MapLibre camera controls for smooth map following.
 * https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#flyto
 *
 * @param {maplibregl.Map|null} map - MapLibre map instance
 * @param {Object|null} userLocation - GPS location {latitude, longitude, heading}
 * @param {Object|null} routeGeoJSON - Route geometry (GeoJSON LineString)
 * @param {Object|null} destination - Destination {coordinates: [lng, lat], name}
 *
 * @returns {Object} Hook return values
 * @returns {number} bearing - Compass bearing to destination (0-360 degrees)
 * @returns {Object|null} nextTurn - Next turn instruction {instruction, distance}
 * @returns {number} distanceRemaining - Meters to destination
 * @returns {boolean} hasArrived - Arrival flag (< 20m from destination)
 */
export function useNavigation(map, userLocation, routeGeoJSON, destination) {
  const [bearing, setBearing] = useState(0);
  const [nextTurn, setNextTurn] = useState(null);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);

  // Extract stable values to avoid complex expressions in deps
  const userLat = userLocation?.latitude;
  const userLng = userLocation?.longitude;
  const destLng = destination?.coordinates?.[0];
  const destLat = destination?.coordinates?.[1];

  // Update navigation data when user location changes
  useEffect(() => {
    if (!map || !userLocation || !destination) {
      return;
    }

    const userLngLat = [userLocation.longitude, userLocation.latitude];
    const destLngLat = destination.coordinates;

    // Calculate bearing to destination (Haversine formula)
    // https://www.movable-type.co.uk/scripts/latlong.html
    const calculatedBearing = calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      destLngLat[1],
      destLngLat[0],
    );
    setBearing(calculatedBearing);

    // Calculate distance to destination
    const distance = calculateHaversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      destLngLat[1],
      destLngLat[0],
    );
    setDistanceRemaining(distance);

    // Check arrival (< 20m threshold)
    if (distance < 20) {
      setHasArrived(true);
      return; // Don't update camera when arrived
    }

    // Find next turn from route (if route exists)
    if (routeGeoJSON && routeGeoJSON.coordinates) {
      const turn = findNextTurn(routeGeoJSON, userLngLat, distance);
      setNextTurn(turn);
    }

    // Update map camera to follow user
    // https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#flyto
    map.flyTo({
      center: userLngLat,
      bearing: calculatedBearing, // Rotate map to face destination
      pitch: 60, // Tilt for 3D perspective
      zoom: 18, // Close zoom for navigation
      duration: 1000, // 1 second smooth transition
      essential: true, // Ensure animation completes even if interrupted
    });
  }, [map, userLat, userLng, destLng, destLat, routeGeoJSON, userLocation, destination]);

  return {
    bearing,
    nextTurn,
    distanceRemaining,
    hasArrived,
  };
}

/**
 * Calculate bearing from origin to destination
 * Returns bearing in degrees (0-360, where 0 = North, 90 = East, etc.)
 *
 * Formula: https://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param {number} lat1 - Origin latitude
 * @param {number} lon1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lon2 - Destination longitude
 * @returns {number} Bearing in degrees (0-360)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let θ = Math.atan2(y, x);
  θ = (θ * 180) / Math.PI; // Convert to degrees
  θ = (θ + 360) % 360; // Normalize to 0-360

  return θ;
}

/**
 * Calculate Haversine distance between two points
 * Returns distance in meters
 *
 * Formula: https://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param {number} lat1 - Origin latitude
 * @param {number} lon1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lon2 - Destination longitude
 * @returns {number} Distance in meters
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Find next significant turn on route
 * Analyzes route coordinates to detect turns > 15 degrees
 *
 * @param {Object} routeGeoJSON - GeoJSON LineString
 * @param {[number, number]} userPosition - User [lng, lat]
 * @param {number} remainingDistance - Distance to destination in meters
 * @returns {Object|null} Turn instruction {instruction, distance} or null
 */
function findNextTurn(routeGeoJSON, userPosition, remainingDistance) {
  const coords = routeGeoJSON.coordinates;

  if (!coords || coords.length < 3) {
    // Not enough points to determine turns
    return {
      instruction: "Continue straight",
      distance: Math.round(remainingDistance),
    };
  }

  // Find closest upcoming point on route (ahead of user)
  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < coords.length; i++) {
    const dist = calculateHaversineDistance(
      userPosition[1],
      userPosition[0],
      coords[i][1],
      coords[i][0],
    );

    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  // Look ahead for significant turns
  for (let i = closestIndex + 1; i < coords.length - 1; i++) {
    const bearing1 = calculateBearing(
      coords[i - 1][1],
      coords[i - 1][0],
      coords[i][1],
      coords[i][0],
    );

    const bearing2 = calculateBearing(
      coords[i][1],
      coords[i][0],
      coords[i + 1][1],
      coords[i + 1][0],
    );

    // Calculate angle difference
    let angleDiff = Math.abs(bearing2 - bearing1);
    if (angleDiff > 180) {
      angleDiff = 360 - angleDiff;
    }

    // Significant turn threshold: 15 degrees
    if (angleDiff > 15) {
      const distanceToTurn = calculateHaversineDistance(
        userPosition[1],
        userPosition[0],
        coords[i][1],
        coords[i][0],
      );

      // Determine turn direction
      let turnDirection = "Continue straight";
      if (angleDiff > 30) {
        const clockwise = (bearing2 - bearing1 + 360) % 360 < 180;
        turnDirection = clockwise ? "Turn right" : "Turn left";
      }

      return {
        instruction: turnDirection,
        distance: Math.round(distanceToTurn),
      };
    }
  }

  // No significant turns ahead
  return {
    instruction: "Continue straight",
    distance: Math.round(remainingDistance),
  };
}
