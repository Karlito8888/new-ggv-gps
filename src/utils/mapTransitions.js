/**
 * Utilitaires pour les transitions fluides de la carte MapLibre
 */

/**
 * Calcule la différence d'angle la plus courte entre deux bearings
 * @param {number} from - Bearing de départ (0-360)
 * @param {number} to - Bearing d'arrivée (0-360)
 * @returns {number} Différence d'angle (-180 à 180)
 */
export function calculateBearingDifference(from, to) {
  let diff = to - from;
  
  // Normaliser la différence pour prendre le chemin le plus court
  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }
  
  return diff;
}

/**
 * Calcule la durée optimale pour une transition de bearing
 * @param {number} bearingDiff - Différence d'angle en degrés
 * @param {number} speed - Vitesse actuelle en km/h
 * @param {string} source - Source de la rotation ('device-orientation', 'gps-heading', 'manual')
 * @returns {number} Durée en millisecondes
 */
export function calculateBearingTransitionDuration(bearingDiff, speed = 0, source = 'manual') {
  const absDiff = Math.abs(bearingDiff);
  
  // Durée de base selon la source
  let baseDuration = 500;
  switch (source) {
    case 'device-orientation':
      baseDuration = 400; // Rapide pour device orientation
      break;
    case 'gps-heading':
      baseDuration = 800; // Plus lent pour GPS heading
      break;
    case 'manual':
      baseDuration = 600; // Moyen pour contrôle manuel
      break;
  }
  
  // Ajustement selon l'ampleur du changement
  let durationMultiplier = 1;
  if (absDiff < 5) {
    durationMultiplier = 0.5; // Très rapide pour petits changements
  } else if (absDiff < 30) {
    durationMultiplier = 0.8; // Rapide pour changements moyens
  } else if (absDiff > 90) {
    durationMultiplier = 1.5; // Plus lent pour grands changements
  } else if (absDiff > 150) {
    durationMultiplier = 2; // Très lent pour demi-tours
  }
  
  // Ajustement selon la vitesse
  let speedMultiplier = 1;
  if (speed > 20) {
    speedMultiplier = 1.2; // Plus lent à haute vitesse pour éviter le mal des transports
  } else if (speed < 2) {
    speedMultiplier = 0.8; // Plus rapide à faible vitesse
  }
  
  return Math.round(baseDuration * durationMultiplier * speedMultiplier);
}

/**
 * Calcule la durée optimale pour une transition de pitch
 * @param {number} pitchDiff - Différence de pitch en degrés
 * @param {number} speed - Vitesse actuelle en km/h
 * @param {string} context - Contexte ('navigation', 'exploration', 'cinematic')
 * @returns {number} Durée en millisecondes
 */
export function calculatePitchTransitionDuration(pitchDiff, speed = 0, context = 'navigation') {
  const absDiff = Math.abs(pitchDiff);
  
  // Durée de base selon le contexte
  let baseDuration = 1000;
  switch (context) {
    case 'navigation':
      baseDuration = 800; // Rapide pour navigation
      break;
    case 'exploration':
      baseDuration = 1200; // Plus lent pour exploration
      break;
    case 'cinematic':
      baseDuration = 1500; // Très lent pour effet cinématique
      break;
  }
  
  // Ajustement selon l'ampleur du changement
  let durationMultiplier = 1;
  if (absDiff < 5) {
    durationMultiplier = 0.4; // Très rapide pour petits changements
  } else if (absDiff < 15) {
    durationMultiplier = 0.7; // Rapide pour changements moyens
  } else if (absDiff > 30) {
    durationMultiplier = 1.3; // Plus lent pour grands changements
  }
  
  // Ajustement selon la vitesse
  let speedMultiplier = 1;
  if (speed > 15) {
    speedMultiplier = 1.3; // Plus lent à haute vitesse
  } else if (speed < 1) {
    speedMultiplier = 0.8; // Plus rapide quand stationnaire
  }
  
  return Math.round(baseDuration * durationMultiplier * speedMultiplier);
}

/**
 * Crée les options de transition optimales pour MapLibre easeTo
 * @param {Object} params - Paramètres de transition
 * @param {number} params.bearing - Nouveau bearing (optionnel)
 * @param {number} params.pitch - Nouveau pitch (optionnel)
 * @param {number} params.currentBearing - Bearing actuel
 * @param {number} params.currentPitch - Pitch actuel
 * @param {number} params.speed - Vitesse actuelle en km/h
 * @param {string} params.source - Source du changement
 * @param {string} params.context - Contexte d'utilisation
 * @returns {Object} Options pour easeTo
 */
export function createOptimalTransition(params) {
  const {
    bearing,
    pitch,
    currentBearing = 0,
    currentPitch = 0,
    speed = 0,
    source = 'manual',
    context = 'navigation'
  } = params;
  
  const options = {};
  let maxDuration = 0;
  
  // Calculer les transitions pour bearing
  if (bearing !== undefined && bearing !== currentBearing) {
    const bearingDiff = calculateBearingDifference(currentBearing, bearing);
    const bearingDuration = calculateBearingTransitionDuration(bearingDiff, speed, source);
    
    options.bearing = bearing;
    maxDuration = Math.max(maxDuration, bearingDuration);
  }
  
  // Calculer les transitions pour pitch
  if (pitch !== undefined && pitch !== currentPitch) {
    const pitchDiff = pitch - currentPitch;
    const pitchDuration = calculatePitchTransitionDuration(pitchDiff, speed, context);
    
    options.pitch = pitch;
    maxDuration = Math.max(maxDuration, pitchDuration);
  }
  
  // Utiliser la durée la plus longue pour synchroniser les transitions
  options.duration = maxDuration || 500;
  
  // Fonction d'easing selon le contexte
  switch (context) {
    case 'cinematic':
      options.easing = (t) => t * t * (3 - 2 * t); // Smoothstep pour effet cinématique
      break;
    case 'exploration':
      options.easing = (t) => 1 - Math.pow(1 - t, 3); // Ease-out cubic pour exploration
      break;
    default: // navigation
      options.easing = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Ease-in-out quad
  }
  
  return options;
}

/**
 * Vérifie si une transition est nécessaire
 * @param {number} currentValue - Valeur actuelle
 * @param {number} targetValue - Valeur cible
 * @param {number} threshold - Seuil minimum pour déclencher une transition
 * @returns {boolean} True si une transition est nécessaire
 */
export function shouldTransition(currentValue, targetValue, threshold = 2) {
  return Math.abs(currentValue - targetValue) >= threshold;
}

/**
 * Applique une transition optimisée à la carte
 * @param {Object} map - Instance MapLibre map
 * @param {Object} params - Paramètres de transition (voir createOptimalTransition)
 * @returns {Promise} Promise qui se résout quand la transition est terminée
 */
export function applyOptimalTransition(map, params) {
  if (!map) {
    return Promise.reject(new Error('Map instance required'));
  }
  
  const currentBearing = map.getBearing();
  const currentPitch = map.getPitch();
  
  // Vérifier si des transitions sont nécessaires
  const needsBearingTransition = params.bearing !== undefined && 
    shouldTransition(currentBearing, params.bearing, 2);
  const needsPitchTransition = params.pitch !== undefined && 
    shouldTransition(currentPitch, params.pitch, 2);
  
  if (!needsBearingTransition && !needsPitchTransition) {
    return Promise.resolve(); // Aucune transition nécessaire
  }
  
  // Créer les options de transition optimales
  const transitionOptions = createOptimalTransition({
    ...params,
    currentBearing,
    currentPitch
  });
  
  console.log('🎬 Applying optimal transition:', {
    from: { bearing: currentBearing.toFixed(1), pitch: currentPitch.toFixed(1) },
    to: { bearing: params.bearing?.toFixed(1), pitch: params.pitch?.toFixed(1) },
    duration: transitionOptions.duration,
    source: params.source
  });
  
  // Appliquer la transition
  return new Promise((resolve) => {
    map.easeTo({
      ...transitionOptions,
      complete: resolve
    });
  });
}
