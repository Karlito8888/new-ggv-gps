import { useState, useEffect, useRef } from 'react';

/**
 * Hook pour optimiser la consommation batterie du GPS
 * Adapte la fréquence de mise à jour selon l'activité de l'utilisateur
 */
const useAdaptiveGPS = (speed = 0, isNavigating = false) => {
  const [updateInterval, setUpdateInterval] = useState(1000);
  const [powerMode, setPowerMode] = useState('normal');
  const lastSpeedCheck = useRef(Date.now());
  const speedHistory = useRef([]);
  const stationaryTime = useRef(0);

  // Détecter l'état de mouvement
  const detectMovementState = (currentSpeed) => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastSpeedCheck.current;
    
    // Ajouter la vitesse à l'historique
    speedHistory.current.push({
      speed: currentSpeed,
      timestamp: now
    });

    // Garder seulement les 10 dernières mesures (environ 10 secondes)
    if (speedHistory.current.length > 10) {
      speedHistory.current.shift();
    }

    // Calculer la vitesse moyenne sur les dernières mesures
    const avgSpeed = speedHistory.current.reduce((sum, entry) => sum + entry.speed, 0) / speedHistory.current.length;

    // Détecter si l'utilisateur est stationnaire
    const isStationary = avgSpeed < 0.5; // Moins de 0.5 m/s (1.8 km/h)
    const isMovingSlowly = avgSpeed < 2; // Moins de 2 m/s (7.2 km/h)
    const isMovingFast = avgSpeed > 10; // Plus de 10 m/s (36 km/h)

    // Mettre à jour le temps stationnaire
    if (isStationary) {
      stationaryTime.current += timeSinceLastCheck;
    } else {
      stationaryTime.current = 0;
    }

    lastSpeedCheck.current = now;

    return {
      isStationary,
      isMovingSlowly,
      isMovingFast,
      avgSpeed,
      stationaryDuration: stationaryTime.current
    };
  };

  // Adapter les paramètres GPS selon l'état
  useEffect(() => {
    const movement = detectMovementState(speed);
    
    let newInterval = 1000; // Défaut: 1 seconde
    let newPowerMode = 'normal';

    if (!isNavigating) {
      // Mode économie d'énergie quand pas en navigation
      newInterval = 5000; // 5 secondes
      newPowerMode = 'eco';
    } else if (movement.isStationary && movement.stationaryDuration > 30000) {
      // Stationnaire depuis plus de 30 secondes
      newInterval = 3000; // 3 secondes
      newPowerMode = 'eco';
    } else if (movement.isMovingSlowly) {
      // Mouvement lent (marche)
      newInterval = 2000; // 2 secondes
      newPowerMode = 'normal';
    } else if (movement.isMovingFast) {
      // Mouvement rapide (véhicule)
      newInterval = 500; // 0.5 seconde pour plus de précision
      newPowerMode = 'performance';
    } else {
      // Mouvement normal
      newInterval = 1000; // 1 seconde
      newPowerMode = 'normal';
    }

    // Mettre à jour seulement si nécessaire
    if (newInterval !== updateInterval) {
      setUpdateInterval(newInterval);
    }
    if (newPowerMode !== powerMode) {
      setPowerMode(newPowerMode);
    }

  }, [speed, isNavigating, updateInterval, powerMode]);

  // Obtenir les options GPS optimisées
  const getOptimizedGPSOptions = () => {
    const baseOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 500,
    };

    switch (powerMode) {
      case 'eco':
        return {
          ...baseOptions,
          enableHighAccuracy: false, // Moins précis mais économe
          timeout: 15000,
          maximumAge: 2000, // Accepter des données plus anciennes
        };
      
      case 'performance':
        return {
          ...baseOptions,
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 200, // Données très fraîches
        };
      
      default: // normal
        return baseOptions;
    }
  };

  // Obtenir les options de fit bounds optimisées
  const getOptimizedFitBoundsOptions = () => {
    const baseOptions = {
      maxZoom: 19,
      padding: 50,
    };

    switch (powerMode) {
      case 'eco':
        return {
          ...baseOptions,
          maxZoom: 17, // Zoom moins agressif
          padding: 100,
        };
      
      case 'performance':
        return {
          ...baseOptions,
          maxZoom: 20, // Zoom maximum
          padding: 30,
        };
      
      default:
        return baseOptions;
    }
  };

  // Statistiques pour le debug
  const getStats = () => {
    const movement = detectMovementState(speed);
    return {
      updateInterval,
      powerMode,
      avgSpeed: movement.avgSpeed,
      isStationary: movement.isStationary,
      stationaryDuration: movement.stationaryDuration,
      samplesCount: speedHistory.current.length
    };
  };

  return {
    updateInterval,
    powerMode,
    gpsOptions: getOptimizedGPSOptions(),
    fitBoundsOptions: getOptimizedFitBoundsOptions(),
    stats: getStats()
  };
};

export default useAdaptiveGPS;
