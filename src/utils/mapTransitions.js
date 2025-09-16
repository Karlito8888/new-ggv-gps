/**
 * MapLibre GL JS Transitions - Version Optimisée avec flyTo() et jumpTo()
 * 
 * Système de transitions natif utilisant les API MapLibre GL JS optimisées
 * Standardisé sur Turf.js pour les calculs de distance
 */

import * as turf from "@turf/turf";

/**
 * Calcule la distance entre deux points pour déterminer le type de transition
 */
const calculateDistanceForTransition = (map, from, to) => {
  if (!from || !to) return 0;
  
  try {
    // Utiliser Turf.js pour un calcul précis
    return turf.distance(from, to, { units: 'meters' });
  } catch {
    return 1000; // Distance par défaut
  }
};

/**
 * Transition GPS optimisée avec flyTo() pour l'acquisition de position
 */
export const gpsTransition = async (map, location, addPitch = true) => {
  if (!map || !location) return;

  try {
    // Transition unique avec flyTo() incluant le pitch
    const flyOptions = {
      center: [location.longitude, location.latitude],
      zoom: 15,
      duration: 1200,
      // Courbe d'animation adaptée pour la navigation GPS
      curve: 1.2,
      speed: 1.0,
      essential: true
    };

    if (addPitch) {
      flyOptions.pitch = 25;
    }

    await new Promise((resolve) => {
      map.flyTo({
        ...flyOptions,
        complete: resolve
      });
    });
    
    console.log('✅ GPS transition completed with flyTo()');
  } catch (error) {
    console.error('GPS transition échouée:', error);
    // Fallback ultime avec jumpTo()
    map.jumpTo({
      center: [location.longitude, location.latitude],
      zoom: 15,
      pitch: addPitch ? 25 : 0
    });
  }
};

/**
 * Recentrer la carte de manière optimisée avec jumpTo() ou flyTo()
 */
export const recenterMap = async (map, location) => {
  if (!map || !location) return;
  
  try {
    const currentCenter = map.getCenter();
    const targetCenter = [location.longitude, location.latitude];
    const distance = calculateDistanceForTransition(map, [currentCenter.lng, currentCenter.lat], targetCenter);
    
    // Pour les recentrages rapides, utiliser jumpTo() si la distance est petite
    if (distance < 300) {
      map.jumpTo({
        center: targetCenter,
        zoom: 18
      });
      console.log('⚡ Fast recenter with jumpTo()');
    } else {
      // Pour les grands déplacements, utiliser flyTo() pour une transition fluide
      await new Promise((resolve) => {
        map.flyTo({
          center: targetCenter,
          zoom: 18,
          duration: 800,
          curve: 1,
          speed: 1.2,
          essential: true,
          complete: resolve
        });
      });
      console.log('🚀 Smooth recenter with flyTo()');
    }
  } catch (error) {
    console.error('Recenter failed:', error);
    // Fallback sécurisé
    map.jumpTo({
      center: [location.longitude, location.latitude],
      zoom: 18
    });
  }
};

/**
 * Nettoyage des ressources
 */
export const cleanupMapResources = (mapRef) => {
  try {
    if (mapRef.current) {
      mapRef.current.stop();
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
  }
};