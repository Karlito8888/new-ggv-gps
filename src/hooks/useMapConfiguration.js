// Custom hook for MapLibre configuration and styling
// Handles map style, view state, and GeoJSON data preparation

import { useState, useMemo, useCallback } from 'react';
import { blocks } from '../data/blocks.js';
import { getMapStyle } from '../lib/mapStyles.js';
import { 
  DEFAULT_COORDS, 
  ZOOM_LEVELS, 
  PITCH_ANGLES, 
  MAP_INTERACTIONS 
} from '../lib/mapDefaults.js';
import { 
  blocksToGeoJSON, 
  createInitialViewState 
} from '../lib/mapUtils.js';

/**
 * Custom hook for MapLibre configuration
 * @param {Object} locationTracking - Location tracking hook data
 * @param {Object} navigationState - Navigation state hook data
 * @returns {Object} Map configuration data and functions
 */
export function useMapConfiguration(locationTracking, navigationState) {
  const [mapType, setMapType] = useState('osm'); // 'osm' or 'satellite'
  const [isMapReady, setIsMapReady] = useState(false);

  const { userLocation } = locationTracking;
  const { navigationState: currentState } = navigationState;

  /**
   * Toggle between OSM and satellite map types
   */
  const toggleMapType = useCallback(() => {
    setMapType(prevType => prevType === 'osm' ? 'satellite' : 'osm');
    console.log(`🗺️ Map type switched to: ${mapType === 'osm' ? 'satellite' : 'osm'}`);
  }, [mapType]);

  /**
   * Memoized map style based on current map type
   */
  const mapStyle = useMemo(() => {
    return getMapStyle(mapType);
  }, [mapType]);

  /**
   * Memoized initial view state for the map
   */
  const initialViewState = useMemo(() => {
    return createInitialViewState(
      userLocation,
      DEFAULT_COORDS,
      currentState,
      ZOOM_LEVELS,
      PITCH_ANGLES
    );
  }, [userLocation, currentState]);

  /**
   * Memoized blocks GeoJSON data
   */
  const blocksGeoJSON = useMemo(() => {
    return blocksToGeoJSON(blocks);
  }, []); // Blocks data is static, no dependencies needed

  /**
   * Map interaction settings based on navigation state
   */
  const mapInteractions = useMemo(() => {
    const isNavigating = currentState === 'navigating';
    
    return {
      ...MAP_INTERACTIONS,
      // Disable rotation during navigation for better UX
      dragRotate: !isNavigating,
      // Set interactive layer IDs (empty during navigation to prevent interference)
      interactiveLayerIds: isNavigating ? [] : undefined,
    };
  }, [currentState]);

  /**
   * Map event handlers
   */
  const handleMapLoad = useCallback(() => {
    console.log('🗺️ Map loaded successfully');
    setIsMapReady(true);
  }, []);

  const handleMapError = useCallback((error) => {
    console.error('❌ Map error:', error?.error?.message || 'Unknown map error');
    // Don't show errors to users, just log them
  }, []);

  /**
   * Get map type display info
   */
  const getMapTypeInfo = useCallback(() => {
    return {
      current: mapType,
      next: mapType === 'osm' ? 'satellite' : 'osm',
      title: mapType === 'osm' ? 'Vue satellite' : 'Vue carte',
    };
  }, [mapType]);

  /**
   * Check if map is in navigation mode
   */
  const isNavigationMode = useMemo(() => {
    return currentState === 'navigating';
  }, [currentState]);

  /**
   * Get appropriate zoom level for current state
   */
  const getCurrentZoomLevel = useCallback(() => {
    switch (currentState) {
      case 'navigating':
        return ZOOM_LEVELS.navigating;
      case 'welcome':
        return ZOOM_LEVELS.welcome;
      default:
        return ZOOM_LEVELS.default;
    }
  }, [currentState]);

  /**
   * Get appropriate pitch angle for current state
   */
  const getCurrentPitchAngle = useCallback(() => {
    switch (currentState) {
      case 'navigating':
        return PITCH_ANGLES.navigating;
      case 'welcome':
        return PITCH_ANGLES.welcome;
      default:
        return PITCH_ANGLES.default;
    }
  }, [currentState]);

  return {
    // Map configuration
    mapStyle,
    initialViewState,
    mapInteractions,
    
    // Map state
    mapType,
    isMapReady,
    isNavigationMode,
    
    // GeoJSON data
    blocksGeoJSON,
    
    // Control functions
    toggleMapType,
    setIsMapReady,
    
    // Event handlers
    handleMapLoad,
    handleMapError,
    
    // Utility functions
    getMapTypeInfo,
    getCurrentZoomLevel,
    getCurrentPitchAngle,
    
    // Map settings
    defaultCoords: DEFAULT_COORDS,
    zoomLevels: ZOOM_LEVELS,
    pitchAngles: PITCH_ANGLES,
  };
}

export default useMapConfiguration;