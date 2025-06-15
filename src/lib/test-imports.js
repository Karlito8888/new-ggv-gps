// Test script to validate the refactored navigation modules
// This file can be removed after validation

console.log('🧪 Testing refactored navigation modules...');

// Test individual module imports
try {
  console.log('📦 Testing individual module imports...');
  
  // Test constants
  const { ARRIVAL_THRESHOLD, ROUTING_CONFIG } = await import('./constants.js');
  console.log('✅ Constants:', { ARRIVAL_THRESHOLD, ROUTING_CONFIG: !!ROUTING_CONFIG });
  
  // Test geometry
  const { calculateDistance, formatDistance } = await import('./geometry.js');
  const testDistance = calculateDistance(0, 0, 1, 1);
  console.log('✅ Geometry:', { 
    calculateDistance: typeof calculateDistance,
    testDistance: formatDistance(testDistance)
  });
  
  // Test route analysis
  const { isUserOffRoute, shouldRecalculateRoute } = await import('./routeAnalysis.js');
  console.log('✅ Route Analysis:', { 
    isUserOffRoute: typeof isUserOffRoute,
    shouldRecalculateRoute: typeof shouldRecalculateRoute
  });
  
  // Test route services
  const { createDirectRoute, createRoute } = await import('./routeServices.js');
  console.log('✅ Route Services:', { 
    createDirectRoute: typeof createDirectRoute,
    createRoute: typeof createRoute
  });
  
  // Test route management
  const { createRemainingRoute, shouldUpdateRemainingRoute } = await import('./routeManagement.js');
  console.log('✅ Route Management:', { 
    createRemainingRoute: typeof createRemainingRoute,
    shouldUpdateRemainingRoute: typeof shouldUpdateRemainingRoute
  });
  
  // Test navigation instructions
  const { hasArrived, getNavigationInstructions } = await import('./navigationInstructions.js');
  console.log('✅ Navigation Instructions:', { 
    hasArrived: typeof hasArrived,
    getNavigationInstructions: typeof getNavigationInstructions
  });
  
  // Test MapLibre integration
  const { initMapLibreDirections, cleanupDirections } = await import('./mapLibreIntegration.js');
  console.log('✅ MapLibre Integration:', { 
    initMapLibreDirections: typeof initMapLibreDirections,
    cleanupDirections: typeof cleanupDirections
  });
  
} catch (error) {
  console.error('❌ Individual module import failed:', error);
}

// Test main navigation module
try {
  console.log('📦 Testing main navigation module...');
  
  // Test named exports
  const { 
    calculateDistance, 
    createRoute, 
    hasArrived,
    ARRIVAL_THRESHOLD 
  } = await import('./navigation.js');
  
  console.log('✅ Named exports:', { 
    calculateDistance: typeof calculateDistance,
    createRoute: typeof createRoute,
    hasArrived: typeof hasArrived,
    ARRIVAL_THRESHOLD
  });
  
  // Test default export
  const navigation = await import('./navigation.js');
  const defaultExport = navigation.default;
  
  console.log('✅ Default export:', { 
    hasCalculateDistance: typeof defaultExport.calculateDistance,
    hasCreateRoute: typeof defaultExport.createRoute,
    hasArrivalThreshold: typeof defaultExport.ARRIVAL_THRESHOLD,
    totalExports: Object.keys(defaultExport).length
  });
  
} catch (error) {
  console.error('❌ Main navigation module import failed:', error);
}

// Test functional compatibility
try {
  console.log('🔧 Testing functional compatibility...');
  
  const { calculateDistance, formatDistance, hasArrived } = await import('./navigation.js');
  
  // Test distance calculation
  const distance = calculateDistance(14.35098, 120.951863, 14.35108, 120.951963);
  console.log('✅ Distance calculation:', formatDistance(distance));
  
  // Test arrival detection
  const arrived = hasArrived(14.35098, 120.951863, 14.35098, 120.951863);
  console.log('✅ Arrival detection (same point):', arrived);
  
  const notArrived = hasArrived(14.35098, 120.951863, 14.36098, 120.961863);
  console.log('✅ Arrival detection (far point):', notArrived);
  
} catch (error) {
  console.error('❌ Functional compatibility test failed:', error);
}

console.log('🎉 Refactoring validation complete!');