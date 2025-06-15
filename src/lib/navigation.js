// Main navigation module - refactored and organized
// This file serves as the main entry point for all navigation functionality

// Import all modules for re-export
import * as constants from './constants.js';
import * as geometry from './geometry.js';
import * as routeAnalysis from './routeAnalysis.js';
import * as routeServices from './routeServices.js';
import * as routeManagement from './routeManagement.js';
import * as navigationInstructions from './navigationInstructions.js';
import * as mapLibreIntegration from './mapLibreIntegration.js';

// Re-export constants
export {
  VILLAGE_EXIT_COORDS,
  ARRIVAL_THRESHOLD,
  ROUTE_DEVIATION_THRESHOLD,
  MIN_RECALCULATION_INTERVAL,
  MIN_MOVEMENT_THRESHOLD,
  ROUTING_CONFIG,
} from './constants.js';

// Re-export geometry utilities
export {
  calculateDistance,
  pointToLineDistance,
  calculateBearing,
  bearingToDirection,
  formatDistance,
} from './geometry.js';

// Re-export route analysis functions
export {
  isUserOffRoute,
  shouldRecalculateRoute,
  updateRecalculationState,
  resetRecalculationState,
  findClosestPointOnRoute,
} from './routeAnalysis.js';

// Re-export route services
export {
  createDirectRoute,
  createRoute,
} from './routeServices.js';

// Re-export route management
export {
  createRemainingRoute,
  shouldUpdateRemainingRoute,
  createTraveledRoute,
} from './routeManagement.js';

// Re-export navigation instructions
export {
  hasArrived,
  getNavigationInstructions,
} from './navigationInstructions.js';

// Re-export MapLibre integration
export {
  initMapLibreDirections,
  cleanupDirections,
  getDirections,
} from './mapLibreIntegration.js';

// Legacy compatibility - keep the same API for existing components
// This ensures that existing imports continue to work without changes

/**
 * @deprecated Use individual module imports for better tree-shaking
 * This main export is kept for backward compatibility
 */
export default {
  // Constants
  ...constants,
  
  // Geometry
  ...geometry,
  
  // Route Analysis
  ...routeAnalysis,
  
  // Route Services
  ...routeServices,
  
  // Route Management
  ...routeManagement,
  
  // Navigation Instructions
  ...navigationInstructions,
  
  // MapLibre Integration
  ...mapLibreIntegration,
};
