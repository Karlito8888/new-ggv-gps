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
const useAdaptivePitch = (speedKmh = 0, navigationState = 'welcome', isNavigating = false) => {
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

    // Mode automatique : adaptation selon vitesse et contexte
    if (pitchMode === 'auto') {
      // Pitch de base selon l'état de navigation
      let basePitch = 0;
      
      switch (navigationState) {
        case 'navigating':
          basePitch = 60; // Vue 3D immersive en navigation
          break;
        case 'welcome':
        case 'permission':
          basePitch = 30; // Vue plus plate pour l'exploration
          break;
        default:
          basePitch = 45; // Vue intermédiaire par défaut
      }

      // Ajustement selon la vitesse
      if (isNavigating && speedKmh > 0) {
        if (speedKmh < 2) {
          // Très lent (marche lente) : pitch réduit pour meilleure vue d'ensemble
          basePitch = Math.max(35, basePitch - 15);
        } else if (speedKmh >= 2 && speedKmh < 8) {
          // Marche normale : pitch standard (pas de changement)
          // basePitch reste inchangé
        } else if (speedKmh >= 8 && speedKmh < 20) {
          // Marche rapide/jogging : pitch légèrement augmenté
          basePitch = Math.min(70, basePitch + 5);
        } else if (speedKmh >= 20) {
          // Véhicule : pitch élevé pour effet de vitesse
          basePitch = Math.min(75, basePitch + 10);
        }
      }

      // Ajustement selon l'heure (mode nuit/jour)
      const hour = new Date().getHours();
      if (hour >= 20 || hour <= 6) {
        // Mode nuit : pitch légèrement réduit pour moins de fatigue visuelle
        basePitch = Math.max(25, basePitch - 5);
      }

      return Math.round(basePitch);
    }

    return 45; // Fallback
  }, [pitchMode, manualPitch, navigationState, isNavigating, speedKmh]);

  // Détecter les changements de vitesse significatifs pour ajustement dynamique
  useEffect(() => {
    const now = Date.now();
    if (now - lastSpeedCheck > 3000) { // Vérifier toutes les 3 secondes
      setLastSpeedCheck(now);
      
      // Log pour debug
      if (pitchMode === 'auto') {
        console.log(`🎥 Adaptive Pitch: ${adaptivePitch}° (speed: ${speedKmh.toFixed(1)} km/h, mode: ${navigationState})`);
      }
    }
  }, [speedKmh, adaptivePitch, pitchMode, navigationState, lastSpeedCheck]);

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
        // Durée selon l'ampleur du changement
        const speedFactor = Math.min(speedKmh / 10, 2); // Factor 0-2
        return {
          ...baseOptions,
          duration: 1000 + (speedFactor * 500), // 1-2 secondes selon vitesse
        };
      }
    }
  };

  // Obtenir les recommandations de pitch selon le contexte
  const getPitchRecommendations = () => {
    const recommendations = [];

    if (speedKmh > 15 && pitchMode !== 'cinematic') {
      recommendations.push({
        type: 'speed',
        message: 'Mode cinématique recommandé pour les déplacements rapides',
        action: () => setPitchMode('cinematic')
      });
    }

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
      speedKmh,
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
