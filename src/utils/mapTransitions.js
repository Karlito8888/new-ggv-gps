/**
 * MapLibre GL JS Transitions - Version Ultra-Simplifiée
 * 
 * Système de transitions sécurisées basé sur la documentation officielle MapLibre GL JS
 * Résout les erreurs : "Cannot read properties of null", "easing is not a function", etc.
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
 * Fonction d'easing sécurisée avec validation
 */
const secureEasing = (easing) => {
  if (typeof easing === 'function') {
    try {
      const test = easing(0.5);
      if (typeof test === 'number' && !isNaN(test)) {
        return easing;
      }
    } catch {
      console.warn('Easing invalide, utilisation de linear');
    }
  }
  return (t) => Math.max(0, Math.min(1, t));
};

/**
 * Transition de caméra ultra-simplifiée et sécurisée
 * Basée sur les meilleures pratiques MapLibre GL JS
 */
export const transitionTo = (map, options = {}) => {
  if (!validateTransitionParams(map, options)) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const transitionOptions = {
        essential: true,
        duration: 1000,
        ...options,
        easing: secureEasing(options.easing),
        complete: resolve
      };

      // Nettoyer les paramètres invalides
      Object.keys(transitionOptions).forEach(key => {
        if (transitionOptions[key] === undefined || transitionOptions[key] === null) {
          delete transitionOptions[key];
        }
      });

      map.easeTo(transitionOptions);
    } catch (error) {
      console.error('Transition échouée:', error);
      resolve(); // Ne pas bloquer l'application
    }
  });
};

/**
 * Transition GPS simplifiée pour le moment de l'acquisition
 */
export const gpsTransition = async (map, location, addPitch = true) => {
  if (!map || !location) return;

  try {
    // Première transition : centrer sur la position
    await transitionTo(map, {
      center: [location.longitude, location.latitude],
      zoom: 15,
      duration: 1000
    });

    // Deuxième transition : ajouter le pitch si demandé
    if (addPitch) {
      await transitionTo(map, {
        pitch: 25,
        duration: 600
      });
    }
  } catch (error) {
    console.error('GPS transition échouée:', error);
    // Fallback ultime
    map.jumpTo({
      center: [location.longitude, location.latitude],
      zoom: 15
    });
  }
};

/**
 * Recentrer la carte de manière sécurisée
 */
export const recenterMap = async (map, location) => {
  if (!map || !location) return;
  
  await transitionTo(map, {
    center: [location.longitude, location.latitude],
    zoom: 18,
    duration: 1000
  });
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