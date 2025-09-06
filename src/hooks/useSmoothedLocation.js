import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook pour lisser les positions GPS et réduire les sauts erratiques
 * Utilise un filtre simple basé sur la distance et la vitesse
 */
const useSmoothedLocation = (rawLocation, options = {}) => {
  const {
    maxJumpDistance = 50,      // Distance max en mètres pour considérer un saut valide
    smoothingFactor = 0.3,     // Facteur de lissage (0 = pas de lissage, 1 = lissage max)
    minAccuracy = 100,         // Précision minimale acceptée en mètres
    maxSpeed = 50,             // Vitesse max réaliste en m/s (180 km/h)
  } = options;

  const [smoothedLocation, setSmoothedLocation] = useState(null);
  const [speed, setSpeed] = useState(0);
  const previousLocation = useRef(null);
  const lastUpdateTime = useRef(null);

  // Calcul de distance entre deux points GPS
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Rayon de la Terre en mètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calcul de vitesse
  const calculateSpeed = (distance, timeDelta) => {
    if (timeDelta <= 0) return 0;
    return distance / (timeDelta / 1000); // m/s
  };

  // Validation de la position
  const isValidPosition = useCallback((location, previousLoc) => {
    // Vérifier la précision
    console.log("🔍 Vérification précision:", location.accuracy, "vs seuil", minAccuracy);
    if (location.accuracy > minAccuracy) {
      console.log("❌ Position rejetée: précision trop faible", location.accuracy, ">", minAccuracy);
      return false;
    }

    // Si c'est la première position, l'accepter
    if (!previousLoc) {
      console.log("✅ Première position acceptée");
      return true;
    }

    const now = Date.now();
    const timeDelta = now - lastUpdateTime.current;
    
    // Éviter les mises à jour trop fréquentes (< 500ms)
    if (timeDelta < 500) {
      return false;
    }

    const distance = calculateDistance(
      previousLoc.latitude, previousLoc.longitude,
      location.latitude, location.longitude
    );

    const calculatedSpeed = calculateSpeed(distance, timeDelta);

    // Rejeter si la vitesse est irréaliste
    if (calculatedSpeed > maxSpeed) {
      console.log(`GPS: Vitesse irréaliste rejetée: ${calculatedSpeed.toFixed(1)} m/s`);
      return false;
    }

    // Rejeter si le saut est trop important sans mouvement logique
    if (distance > maxJumpDistance && calculatedSpeed < 1) {
      console.log(`GPS: Saut suspect rejeté: ${distance.toFixed(1)}m à ${calculatedSpeed.toFixed(1)} m/s`);
      return false;
    }

    return true;
  }, [minAccuracy, maxSpeed, maxJumpDistance]);

  // Lissage de position
  const smoothPosition = useCallback((newLocation, prevLocation) => {
    if (!prevLocation) {
      return newLocation;
    }

    // Lissage simple avec facteur de pondération
    const smoothedLat = prevLocation.latitude + 
      (newLocation.latitude - prevLocation.latitude) * smoothingFactor;
    const smoothedLon = prevLocation.longitude + 
      (newLocation.longitude - prevLocation.longitude) * smoothingFactor;

    return {
      ...newLocation,
      latitude: smoothedLat,
      longitude: smoothedLon,
    };
  }, [smoothingFactor]);

  useEffect(() => {
    console.log("🔍 useSmoothedLocation reçoit:", rawLocation);
    if (!rawLocation) {
      setSmoothedLocation(null);
      setSpeed(0);
      previousLocation.current = null;
      lastUpdateTime.current = null;
      return;
    }

    // Valider la nouvelle position
    if (!isValidPosition(rawLocation, previousLocation.current)) {
      return; // Ignorer cette position
    }

    const now = Date.now();
    let newSmoothedLocation;

    // Calculer la vitesse si on a une position précédente
    if (previousLocation.current && lastUpdateTime.current) {
      const distance = calculateDistance(
        previousLocation.current.latitude, previousLocation.current.longitude,
        rawLocation.latitude, rawLocation.longitude
      );
      const timeDelta = now - lastUpdateTime.current;
      const calculatedSpeed = calculateSpeed(distance, timeDelta);
      setSpeed(calculatedSpeed);
    }

    // Appliquer le lissage
    newSmoothedLocation = smoothPosition(rawLocation, smoothedLocation);

    // Mettre à jour les états
    setSmoothedLocation(newSmoothedLocation);
    previousLocation.current = rawLocation;
    lastUpdateTime.current = now;

  }, [rawLocation, smoothedLocation, smoothingFactor, maxJumpDistance, minAccuracy, maxSpeed, isValidPosition, smoothPosition]);

  return {
    location: smoothedLocation,
    speed: speed, // en m/s
    speedKmh: speed * 3.6, // en km/h
    isFiltered: smoothedLocation !== rawLocation
  };
};

export default useSmoothedLocation;
