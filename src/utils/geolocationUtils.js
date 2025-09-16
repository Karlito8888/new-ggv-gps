/**
 * Utilitaires pour la géolocalisation cross-platform
 * Optimisé pour mobile ET desktop
 */

/**
 * Détecte les capacités de géolocalisation du device/navigateur
 * @returns {Object} Informations sur les capacités
 */
export function detectGeolocationCapabilities() {
  const isDesktop = !('ontouchstart' in window) && !navigator.maxTouchPoints;
  const hasGeolocation = 'geolocation' in navigator;
  const hasPermissionsAPI = 'permissions' in navigator;
  
  return {
    isDesktop,
    isMobile: !isDesktop,
    hasGeolocation,
    hasPermissionsAPI,
    isSecureContext: window.isSecureContext, // HTTPS requis pour géolocalisation
  };
}

/**
 * Vérifie le statut des permissions de géolocalisation
 * @returns {Promise<string>} 'granted', 'denied', 'prompt', ou 'unknown'
 */
export async function checkGeolocationPermission() {
  if (!('permissions' in navigator)) {
    return 'unknown'; // API Permissions non supportée
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state; // 'granted', 'denied', ou 'prompt'
  } catch (error) {
    console.warn('Permission query failed:', error);
    return 'unknown';
  }
}

/**
 * Options de géolocalisation adaptées selon la plateforme
 * @param {boolean} isDesktop - Si on est sur desktop
 * @returns {Object} Options optimisées
 */
export function getOptimalGeolocationOptions(isDesktop = false) {
  if (isDesktop) {
    return {
      enableHighAccuracy: false, // Moins précis mais plus rapide sur desktop
      timeout: 60000, // 1 minute - plus tolérant
      maximumAge: 600000, // 10 minutes - cache plus long
    };
  } else {
    return {
      enableHighAccuracy: true, // Précision maximale sur mobile
      timeout: 30000, // 30 secondes
      maximumAge: 60000, // 1 minute
    };
  }
}

/**
 * Messages d'erreur adaptés selon la plateforme
 * @param {number} errorCode - Code d'erreur de géolocalisation
 * @param {boolean} isDesktop - Si on est sur desktop
 * @returns {Object} Message et suggestions
 */
export function getGeolocationErrorMessage(errorCode, isDesktop = false) {
  const baseMessages = {
    1: {
      title: 'Permission refusée',
      message: 'L\'accès à la localisation a été refusé.',
    },
    2: {
      title: 'Position indisponible',
      message: 'Impossible de déterminer votre position.',
    },
    3: {
      title: 'Délai dépassé',
      message: 'La localisation prend trop de temps.',
    },
  };

  const message = baseMessages[errorCode] || {
    title: 'Erreur inconnue',
    message: 'Une erreur inattendue s\'est produite.',
  };

  if (isDesktop) {
    message.suggestion = errorCode === 2 
      ? 'Sur ordinateur, la localisation est basée sur votre connexion internet et peut être moins précise.'
      : 'Vérifiez les paramètres de localisation de votre navigateur.';
  } else {
    message.suggestion = 'Vérifiez que la localisation est activée sur votre appareil.';
  }

  return message;
}

/**
 * Test de géolocalisation avec fallback gracieux
 * @returns {Promise<Object>} Résultat du test
 */
export async function testGeolocation() {
  const capabilities = detectGeolocationCapabilities();
  
  if (!capabilities.hasGeolocation) {
    return {
      success: false,
      error: 'Géolocalisation non supportée par ce navigateur',
      capabilities,
    };
  }

  if (!capabilities.isSecureContext) {
    return {
      success: false,
      error: 'HTTPS requis pour la géolocalisation',
      capabilities,
    };
  }

  try {
    const permission = await checkGeolocationPermission();
    return {
      success: true,
      permission,
      capabilities,
      message: capabilities.isDesktop 
        ? 'Géolocalisation disponible (précision limitée sur desktop)'
        : 'Géolocalisation disponible',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      capabilities,
    };
  }
}