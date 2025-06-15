// Custom hook for GPS location tracking and management
// Handles watchPosition, location updates, and error handling

import { useState, useEffect, useRef, useCallback } from 'react';
import { GEOLOCATION_OPTIONS } from '../lib/mapDefaults.js';

/**
 * Custom hook for location tracking with GPS
 * @returns {Object} Location data and control functions
 */
export function useLocationTracking() {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchId = useRef(null);

  /**
   * Start GPS location tracking
   */
  /**
   * Stop GPS location tracking
   */
  const stopLocationTracking = useCallback(() => {
    if (watchId.current) {
      console.log('🛑 Stopping location tracking');
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setIsTracking(false);
    }
  }, []);

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      const error = 'Geolocation is not supported by this browser';
      console.error('❌ Geolocation not supported');
      setLocationError(error);
      return;
    }

    if (watchId.current) {
      console.log('📍 Location tracking already active');
      return;
    }

    console.log('🎯 Starting location tracking...');
    setIsTracking(true);
    setLocationError(null);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        console.log('📍 Location updated:', {
          lat: newLocation.latitude.toFixed(6),
          lng: newLocation.longitude.toFixed(6),
          accuracy: `±${Math.round(newLocation.accuracy)}m`,
        });

        setUserLocation(newLocation);
        setLocationError(null);
      },
      (error) => {
        console.error('❌ GPS tracking error:', error.message);
        setLocationError(error.message);
        
        // Don't stop tracking on temporary errors
        if (error.code === error.TIMEOUT) {
          console.log('⏱️ GPS timeout, continuing to track...');
          return;
        }
        
        // Stop tracking on permission denied or position unavailable
        if (error.code === error.PERMISSION_DENIED ||
            error.code === error.POSITION_UNAVAILABLE) {
          stopLocationTracking();
        }
      },
      GEOLOCATION_OPTIONS
    );
  }, [stopLocationTracking]);


  /**
   * Get current position once (not continuous tracking)
   */
  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        GEOLOCATION_OPTIONS
      );
    });
  }, []);

  /**
   * Request location permission and get initial position
   */
  const requestLocationPermission = useCallback(async () => {
    try {
      console.log('🔐 Requesting location permission...');
      const position = await getCurrentPosition();
      console.log('✅ Location permission granted');
      setUserLocation(position);
      return position;
    } catch (error) {
      console.error('❌ Location permission denied:', error.message);
      setLocationError(error.message);
      throw error;
    }
  }, [getCurrentPosition]);

  /**
   * Check if location has changed significantly
   * @param {Object} newLocation - New location object
   * @param {number} threshold - Distance threshold in meters
   * @returns {boolean} True if location changed significantly
   */
  const hasLocationChanged = useCallback((newLocation, threshold = 5) => {
    if (!userLocation || !newLocation) return true;
    
    // Simple distance calculation (approximate)
    const latDiff = Math.abs(userLocation.latitude - newLocation.latitude);
    const lngDiff = Math.abs(userLocation.longitude - newLocation.longitude);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // Convert to meters
    
    return distance > threshold;
  }, [userLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        setIsTracking(false);
      }
    };
  }, []);

  // Location accuracy helpers
  const getLocationAccuracy = useCallback(() => {
    if (!userLocation?.accuracy) return null;
    return Math.round(userLocation.accuracy);
  }, [userLocation]);

  const isLocationAccurate = useCallback((threshold = 20) => {
    const accuracy = getLocationAccuracy();
    return accuracy !== null && accuracy <= threshold;
  }, [getLocationAccuracy]);

  return {
    // Location data
    userLocation,
    locationError,
    isTracking,
    
    // Control functions
    startLocationTracking,
    stopLocationTracking,
    getCurrentPosition,
    requestLocationPermission,
    
    // Utility functions
    hasLocationChanged,
    getLocationAccuracy,
    isLocationAccurate,
    
    // Status checks
    hasLocation: !!userLocation,
    hasError: !!locationError,
  };
}

export default useLocationTracking;