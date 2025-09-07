import { useState, useEffect, useMemo } from 'react';

/**
 * Hook pour gérer le pitch adaptatif de la carte selon le contexte
 * @param {number} speed - Vitesse actuelle en m/s
 * @param {number} speedKmh - Vitesse actuelle en km/h
 * @param {string} navigationState - État de navigation
 * @param {boolean} isNavigating - Si l'utilisateur est en navigation
 * @param {Object} userLocation - Position de l'utilisateur
 * @returns {Object} Configuration du pitch adaptatif
 */
const useAdaptivePitch = (navigationState = 'welcome', isNavigating = false) => {
  const [pitchMode, setPitchMode] = useState('auto'); // auto, manual, cinematic
  const [manualPitch, setManualPitch] = useState(45);
  const [lastSpeedCheck, setLastSpeedCheck] = useState(Date.now());

  // Calculer le pitch optimal selon le contexte
  const adaptivePitch = useMemo(() => {
    // Mode manuel : utiliser la valeur définie par l'utilisateur
    if (pitchMode === 'manual') {
      return manualPitch;
    }

    // Mode cinématique : pitch élevé pour effet immersif
    if (pitchMode === 'cinematic') {
      return isNavigating ? 75 : 60;
    }

    // Mode automatique : adaptation selon contexte
    if (pitchMode === 'auto') {
      // Pitch fixe selon l'état de navigation
      switch (navigationState) {
        case 'navigating':
          return isNavigating ? 45 : 30; // Vue 3D modérée en navigation
        case 'welcome':
        case 'permission':
          return 25; // Vue plate pour l'exploration
        default:
          return 30; // Vue intermédiaire par défaut
      }
    }

    return 45; // Fallback
  }, [pitchMode, manualPitch, navigationState, isNavigating]);

  // Détecter les changements de vitesse significatifs pour ajustement dynamique
  useEffect(() => {
    const now = Date.now();
    if (now - lastSpeedCheck > 3000) { // Vérifier toutes les 3 secondes
      setLastSpeedCheck(now);
      
      // Log pour debug
      if (pitchMode === 'auto') {
        console.log(`🎥 Adaptive Pitch: ${adaptivePitch}° (mode: ${navigationState})`);
      }
    }
  }, [adaptivePitch, pitchMode, navigationState, lastSpeedCheck]);

  // Obtenir les options de transition pour le pitch
  const getPitchTransitionOptions = () => {
    const baseOptions = {
      pitch: adaptivePitch,
      duration: 1000, // 1 seconde par défaut
    };

    switch (pitchMode) {
      case 'cinematic': {
        return {
          ...baseOptions,
          duration: 1500, // Transitions plus lentes pour effet cinématique
        };
      }
      
      case 'manual': {
        return {
          ...baseOptions,
          duration: 800, // Transitions rapides pour contrôle manuel
        };
      }
      
      default: { // auto
        // Durée fixe
        return {
          ...baseOptions,
          duration: 1000, // 1 seconde fixe
        };
      }
    }
  };

  // Obtenir les recommandations de pitch selon le contexte
  const getPitchRecommendations = () => {
    const recommendations = [];

    // Speed-based recommendations removed

    if (navigationState === 'welcome' && pitchMode === 'auto' && adaptivePitch > 50) {
      recommendations.push({
        type: 'exploration',
        message: 'Vue plus plate recommandée pour l\'exploration',
        action: () => setManualPitch(35)
      });
    }

    return recommendations;
  };

  // Statistiques pour le debug
  const getStats = () => {
    return {
      pitchMode,
      adaptivePitch,
      manualPitch,
      navigationState,
      recommendations: getPitchRecommendations().length
    };
  };

  return {
    // Valeurs principales
    pitch: adaptivePitch,
    pitchMode,
    
    // Contrôles
    setPitchMode,
    setManualPitch,
    
    // Options et utilitaires
    transitionOptions: getPitchTransitionOptions(),
    recommendations: getPitchRecommendations(),
    stats: getStats(),
    
    // Modes disponibles
    availableModes: [
      { id: 'auto', name: 'Automatique', description: 'Adaptation selon vitesse et contexte' },
      { id: 'manual', name: 'Manuel', description: 'Contrôle utilisateur' },
      { id: 'cinematic', name: 'Cinématique', description: 'Vue immersive pour navigation' }
    ]
  };
};

export default useAdaptivePitch;
