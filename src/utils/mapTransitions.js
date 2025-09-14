/**
 * MapLibre GL JS Transitions - Version Optimisée avec flyTo() et jumpTo()
 * 
 * Système de transitions natif utilisant les API MapLibre GL JS optimisées
 * Remplace les transitions personnalisées par flyTo() et jumpTo() natifs
 */

/**
 * Validation de base des paramètres de transition
 */
const validateTransitionParams = (map) => {
  if (!map || typeof map !== 'object') {
    console.warn('Map invalide');
    return false;
  }
  
  if (!map.isStyleLoaded()) {
    console.warn('Style non chargé');
    return false;
  }
  
  return true;
};

/**
 * Calcule la distance entre deux points pour déterminer le type de transition
 */
const calculateDistanceForTransition = (map, from, to) => {
  if (!from || !to || !map) return 0;
  
  try {
    const pixel1 = map.project(from);
    const pixel2 = map.project(to);
    return Math.sqrt(Math.pow(pixel2.x - pixel1.x, 2) + Math.pow(pixel2.y - pixel1.y, 2));
  } catch {
    return 1000; // Distance par défaut
  }
};

/**
 * Transition intelligente utilisant flyTo() ou jumpTo() selon la distance
 */
export const transitionTo = (map, options = {}) => {
  if (!validateTransitionParams(map)) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const { center, zoom, bearing, pitch, duration = 1000, ...otherOptions } = options;
      
      // Déterminer si on utilise flyTo() ou jumpTo() selon la distance
      const currentCenter = map.getCenter();
      const targetCenter = center || [currentCenter.lng, currentCenter.lat];
      const distance = calculateDistanceForTransition(map, [currentCenter.lng, currentCenter.lat], targetCenter);
      
      // Si la distance est petite (< 200px) ou pas de changement de zoom significatif, utiliser jumpTo()
      const currentZoom = map.getZoom();
      const zoomChange = Math.abs((zoom || currentZoom) - currentZoom);
      const useJumpTo = distance < 200 && zoomChange < 2;
      
      const transitionOptions = {
        center: targetCenter,
        zoom: zoom || currentZoom,
        bearing: bearing !== undefined ? bearing : map.getBearing(),
        pitch: pitch !== undefined ? pitch : map.getPitch(),
        ...otherOptions
      };

      if (useJumpTo) {
        // Transition instantanée pour les petits changements
        map.jumpTo(transitionOptions);
        resolve();
      } else {
        // Transition fluide avec flyTo() pour les grands changements
        const flyOptions = {
          ...transitionOptions,
          duration: duration,
          // Courbe d'animation optimisée pour la navigation
          curve: distance > 1000 ? 1.42 : 1,
          speed: distance > 1000 ? 1.2 : 0.8,
          essential: true
        };
        
        map.flyTo({
          ...flyOptions,
          complete: resolve
        });
      }
    } catch (error) {
      console.error('Transition échouée:', error);
      resolve(); // Ne pas bloquer l'application
    }
  });
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