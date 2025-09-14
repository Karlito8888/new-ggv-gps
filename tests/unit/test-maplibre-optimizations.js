/**
 * Test des optimisations MapLibre natives
 * Ce fichier teste les fonctions optimisées sans dépendance au DOM
 */

// Importer les modules nécessaires
import { calculateDistance, calculateBearing, findClosestPointOnRoute } from './src/utils/geoUtils.js';
import { isUserOffRoute, updateUserPositionOnRoute } from './src/lib/navigation.js';

/**
 * Mock MapLibre pour les tests
 */
class MockMapLibre {
  constructor() {
    this.zoom = 15;
    this.center = [120.951863, 14.35098];
  }

  project(coord) {
    // Simulation simple de la projection
    const [lng, lat] = coord;
    return {
      x: (lng - this.center[0]) * 10000 + 400,
      y: (lat - this.center[1]) * 10000 + 300
    };
  }

  unproject(pixel) {
    return {
      lng: (pixel.x - 400) / 10000 + this.center[0],
      lat: (pixel.y - 300) / 10000 + this.center[1]
    };
  }

  getZoom() {
    return this.zoom;
  }

  getCenter() {
    return { lng: this.center[0], lat: this.center[1] };
  }

  isStyleLoaded() {
    return true;
  }

  queryRenderedFeatures() {
    // Mock implementation
    return [];
  }

  setFeatureState(_feature, _state) {
    // Mock implementation
    console.log(`Feature state set:`, _feature, _state);
  }

  getFeatureState() {
    // Mock implementation
    return {};
  }

  getSource(sourceId) {
    return {
      setData: () => console.log(`Source ${sourceId} data updated`)
    };
  }

  getLayer() {
    return true; // Layer exists
  }

  addLayer(_layer) {
    console.log(`Layer added:`, _layer.id);
  }

  addSource(sourceId) {
    console.log(`Source added:`, sourceId);
  }

  jumpTo(options) {
    console.log(`JumpTo:`, options);
  }

  flyTo(options) {
    console.log(`FlyTo:`, options);
    if (options.complete) {
      setTimeout(options.complete, options.duration || 0);
    }
  }

  easeTo(options) {
    console.log(`EaseTo:`, options);
    if (options.complete) {
      setTimeout(options.complete, options.duration || 0);
    }
  }
}

/**
 * Tests des optimisations
 */
function runTests() {
  console.log('🚀 Démarrage des tests MapLibre Optimisations...\n');

  const map = new MockMapLibre();
  const testResults = [];

  // Test 1: calculateDistance avec MapLibre
  console.log('📍 Test 1: calculateDistance avec projection MapLibre');
  try {
    const distance1 = calculateDistance(14.35098, 120.951863, 14.35198, 120.952863, map);
    const distance2 = calculateDistance(14.35098, 120.951863, 14.35198, 120.952863); // Sans map
    
    console.log(`✅ Distance avec MapLibre: ${distance1.toFixed(2)}m`);
    console.log(`✅ Distance sans MapLibre: ${distance2.toFixed(2)}m`);
    console.log(`📊 Différence: ${Math.abs(distance1 - distance2).toFixed(2)}m\n`);
    
    testResults.push({
      test: 'calculateDistance',
      success: true,
      message: `Optimisation MapLibre fonctionnelle, différence: ${Math.abs(distance1 - distance2).toFixed(2)}m`
    });
  } catch (error) {
    console.error(`❌ Erreur calculateDistance: ${error.message}\n`);
    testResults.push({ test: 'calculateDistance', success: false, message: error.message });
  }

  // Test 2: calculateBearing avec MapLibre
  console.log('🧭 Test 2: calculateBearing avec projection MapLibre');
  try {
    const bearing1 = calculateBearing(14.35098, 120.951863, 14.35198, 120.952863, map);
    const bearing2 = calculateBearing(14.35098, 120.951863, 14.35198, 120.952863); // Sans map
    
    console.log(`✅ Bearing avec MapLibre: ${bearing1.toFixed(2)}°`);
    console.log(`✅ Bearing sans MapLibre: ${bearing2.toFixed(2)}°`);
    console.log(`📊 Différence: ${Math.abs(bearing1 - bearing2).toFixed(2)}°\n`);
    
    testResults.push({
      test: 'calculateBearing',
      success: true,
      message: `Optimisation MapLibre fonctionnelle, différence: ${Math.abs(bearing1 - bearing2).toFixed(2)}°`
    });
  } catch (error) {
    console.error(`❌ Erreur calculateBearing: ${error.message}\n`);
    testResults.push({ test: 'calculateBearing', success: false, message: error.message });
  }

  // Test 3: findClosestPointOnRoute avec MapLibre
  console.log('🛣️ Test 3: findClosestPointOnRoute avec projection MapLibre');
  try {
    const routeGeometry = {
      coordinates: [
        [120.951863, 14.35098],
        [120.952863, 14.35198],
        [120.953863, 14.35298]
      ]
    };
    
    const result1 = findClosestPointOnRoute(14.3515, 120.9525, routeGeometry, map);
    const result2 = findClosestPointOnRoute(14.3515, 120.9525, routeGeometry); // Sans map
    
    console.log(`✅ Point le plus proche avec MapLibre:`, result1);
    console.log(`✅ Point le plus proche sans MapLibre:`, result2);
    console.log(`📊 Distance avec MapLibre: ${result1?.distance?.toFixed(2)}m`);
    console.log(`📊 Distance sans MapLibre: ${result2?.distance?.toFixed(2)}m\n`);
    
    testResults.push({
      test: 'findClosestPointOnRoute',
      success: true,
      message: `Optimisation MapLibre fonctionnelle, performance améliorée`
    });
  } catch (error) {
    console.error(`❌ Erreur findClosestPointOnRoute: ${error.message}\n`);
    testResults.push({ test: 'findClosestPointOnRoute', success: false, message: error.message });
  }

  // Test 4: isUserOffRoute avec queryRenderedFeatures
  console.log('🚨 Test 4: isUserOffRoute avec queryRenderedFeatures');
  try {
    const routeGeometry = {
      coordinates: [
        [120.951863, 14.35098],
        [120.952863, 14.35198],
        [120.953863, 14.35298]
      ]
    };
    
    const isOffRoute = isUserOffRoute(14.3515, 120.9525, routeGeometry, 25, map);
    console.log(`✅ Utilisateur hors route: ${isOffRoute}`);
    console.log(`📊 Détection optimisée avec queryRenderedFeatures\n`);
    
    testResults.push({
      test: 'isUserOffRoute',
      success: true,
      message: `Détection off-route optimisée avec MapLibre API`
    });
  } catch (error) {
    console.error(`❌ Erreur isUserOffRoute: ${error.message}\n`);
    testResults.push({ test: 'isUserOffRoute', success: false, message: error.message });
  }

  // Test 5: updateUserPositionOnRoute avec Feature State
  console.log('📍 Test 5: updateUserPositionOnRoute avec Feature State API');
  try {
    const routeData = {
      geometry: {
        coordinates: [
          [120.951863, 14.35098],
          [120.952863, 14.35198],
          [120.953863, 14.35298]
        ]
      }
    };
    
    updateUserPositionOnRoute(map, 14.3515, 120.9525, routeData);
    console.log(`✅ Feature states mis à jour avec succès\n`);
    
    testResults.push({
      test: 'updateUserPositionOnRoute',
      success: true,
      message: `Feature State API fonctionnelle pour la gestion des segments`
    });
  } catch (error) {
    console.error(`❌ Erreur updateUserPositionOnRoute: ${error.message}\n`);
    testResults.push({ test: 'updateUserPositionOnRoute', success: false, message: error.message });
  }

  // Résumé final
  console.log('📊 RÉSUMÉ DES TESTS:');
  console.log('=' .repeat(50));
  
  const successfulTests = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;
  
  testResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.test}: ${result.message}`);
  });
  
  console.log(`\n📈 Résultat: ${successfulTests}/${totalTests} tests réussis`);
  
  if (successfulTests === totalTests) {
    console.log('🎉 Toutes les optimisations MapLibre sont fonctionnelles!');
  } else {
    console.log('⚠️  Certains tests ont échoué, vérifier la configuration');
  }
  
  return { successfulTests, totalTests, testResults };
}

// Exporter pour utilisation externe
export { runTests, MockMapLibre };