// Custom hook for MapLibre GL JS setup and vector layer management
// Handles directions initialization, block layers, and native controls

import { useEffect, useCallback, useRef } from 'react';
import { initMapLibreDirections, cleanupDirections } from '../lib/mapLibreIntegration.js';
import { BLOCK_STYLES } from '../lib/mapStyles.js';
import { 
  safeRemoveLayer, 
  safeRemoveSource, 
  layerExists, 
  sourceExists 
} from '../lib/mapUtils.js';

/**
 * Custom hook for MapLibre setup and layer management
 * @param {Object} mapConfig - Map configuration hook data
 * @returns {Object} MapLibre setup functions and state
 */
export function useMapLibreSetup(mapConfig) {
  const directionsInitialized = useRef(false);
  const layersAdded = useRef(false);

  const { isMapReady, blocksGeoJSON } = mapConfig || {};

  /**
   * Initialize MapLibre Directions with native controls
   * @param {Object} map - MapLibre map instance
   */
  const initializeDirections = useCallback((map) => {
    if (!map || directionsInitialized.current) return;

    try {
      console.log('🧭 Initializing MapLibre Directions...');
      initMapLibreDirections(map);
      directionsInitialized.current = true;
      console.log('✅ MapLibre Directions initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing MapLibre Directions:', error);
    }
  }, []);

  /**
   * Add block vector layers to the map
   * @param {Object} map - MapLibre map instance
   */
  const addBlockLayers = useCallback((map) => {
    if (!map || !blocksGeoJSON || layersAdded.current) return;

    try {
      console.log('🏘️ Adding block vector layers...');

      // Add blocks source
      if (!sourceExists(map, 'blocks')) {
        map.addSource('blocks', {
          type: 'geojson',
          data: blocksGeoJSON,
        });
      }

      // Add fill layer
      if (!layerExists(map, 'blocks-fill')) {
        map.addLayer({
          id: 'blocks-fill',
          type: 'fill',
          source: 'blocks',
          paint: BLOCK_STYLES.fill,
        });
      }

      // Add border layer
      if (!layerExists(map, 'blocks-border')) {
        map.addLayer({
          id: 'blocks-border',
          type: 'line',
          source: 'blocks',
          paint: BLOCK_STYLES.border,
        });
      }

      layersAdded.current = true;
      console.log('✅ Block layers added successfully');
    } catch (error) {
      console.error('❌ Error adding block layers:', error);
    }
  }, [blocksGeoJSON]);

  /**
   * Remove block layers from the map
   * @param {Object} map - MapLibre map instance
   */
  const removeBlockLayers = useCallback((map) => {
    if (!map) return;

    try {
      console.log('🧹 Removing block layers...');
      
      // Remove layers
      safeRemoveLayer(map, 'blocks-fill');
      safeRemoveLayer(map, 'blocks-border');
      
      // Remove source
      safeRemoveSource(map, 'blocks');
      
      layersAdded.current = false;
      console.log('✅ Block layers removed successfully');
    } catch (error) {
      console.error('❌ Error removing block layers:', error);
    }
  }, []);

  /**
   * Update block data source
   * @param {Object} map - MapLibre map instance
   * @param {Object} newBlocksData - New blocks GeoJSON data
   */
  const updateBlocksData = useCallback((map, newBlocksData) => {
    if (!map || !newBlocksData) return;

    try {
      const source = map.getSource('blocks');
      if (source) {
        source.setData(newBlocksData);
        console.log('✅ Blocks data updated');
      }
    } catch (error) {
      console.error('❌ Error updating blocks data:', error);
    }
  }, []);

  /**
   * Setup complete MapLibre configuration
   * @param {Object} map - MapLibre map instance
   */
  const setupMapLibre = useCallback((map) => {
    if (!map) return;

    console.log('⚙️ Setting up MapLibre...');
    
    // Initialize directions first
    initializeDirections(map);
    
    // Add block layers
    addBlockLayers(map);
    
    console.log('✅ MapLibre setup complete');
  }, [initializeDirections, addBlockLayers]);

  /**
   * Cleanup MapLibre resources
   * @param {Object} map - MapLibre map instance
   */
  const cleanupMapLibre = useCallback((map) => {
    console.log('🧹 Cleaning up MapLibre resources...');
    
    // Remove block layers
    if (map) {
      removeBlockLayers(map);
    }
    
    // Cleanup directions
    cleanupDirections();
    
    // Reset flags
    directionsInitialized.current = false;
    layersAdded.current = false;
    
    console.log('✅ MapLibre cleanup complete');
  }, [removeBlockLayers]);

  // Auto-setup when map is ready
  useEffect(() => {
    // This effect will be triggered by the parent component
    // when the map reference is available
  }, [isMapReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMapLibre();
    };
  }, [cleanupMapLibre]);

  return {
    // Setup functions
    setupMapLibre,
    cleanupMapLibre,
    
    // Individual setup functions
    initializeDirections,
    addBlockLayers,
    removeBlockLayers,
    updateBlocksData,
    
    // Status
    isDirectionsInitialized: directionsInitialized.current,
    areLayersAdded: layersAdded.current,
    
    // Utility functions for external use
    safeRemoveLayer,
    safeRemoveSource,
    layerExists,
    sourceExists,
  };
}

export default useMapLibreSetup;