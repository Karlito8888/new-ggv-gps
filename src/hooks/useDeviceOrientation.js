import { useState, useEffect, useCallback } from 'react';

/**
 * Hook simple pour l'orientation du device
 * User autorise → Map s'oriente selon device → TERMINÉ !
 */
const useDeviceOrientation = (options = {}) => {
  const { enabled = true } = options;

  // États essentiels uniquement
  const [compass, setCompass] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('unknown');
  const [isActive, setIsActive] = useState(false);

  // Vérification support (simple)
  useEffect(() => {
    const supported = 'DeviceOrientationEvent' in window;
    setIsSupported(supported);
  }, []);

  // Demande permission (iOS uniquement)
  const requestPermission = useCallback(async () => {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS
        const result = await DeviceOrientationEvent.requestPermission();
        setPermission(result);
        return result === 'granted';
      } else {
        // Android - pas de permission nécessaire
        setPermission('granted');
        return true;
      }
    } catch {
      setPermission('denied');
      return false;
    }
  }, []);

  // Gestionnaire d'événement simple
  const handleOrientation = useCallback((event) => {
    const { alpha, webkitCompassHeading } = event;
    
    // iOS : webkitCompassHeading direct
    // Android : conversion alpha
    let heading;
    if (webkitCompassHeading !== undefined && webkitCompassHeading !== null) {
      heading = webkitCompassHeading;
    } else if (alpha !== null && alpha !== undefined) {
      heading = (360 - alpha) % 360;
    } else {
      return; // Pas de données valides
    }
    
    setCompass(heading);
  }, []);

  // Démarrer l'orientation
  const start = useCallback(async () => {
    if (!enabled || !isSupported) return false;

    const hasPermission = await requestPermission();
    if (!hasPermission) return false;

    // Android : priorité à deviceorientationabsolute (valeurs absolues)
    // iOS : deviceorientation standard avec webkitCompassHeading
    if ('DeviceOrientationAbsoluteEvent' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    
    setIsActive(true);
    return true;
  }, [enabled, isSupported, requestPermission, handleOrientation]);

  // Arrêter l'orientation
  const stop = useCallback(() => {
    // Supprimer les deux types d'événements
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('deviceorientationabsolute', handleOrientation);
    setIsActive(false);
    setCompass(0);
  }, [handleOrientation]);

  // Auto-start si enabled
  useEffect(() => {
    if (enabled && isSupported) {
      start();
    }
    
    return () => stop();
  }, [enabled, isSupported, start, stop]);

  return {
    // Valeurs
    compass,
    isSupported,
    permission,
    isActive,
    
    // Contrôles
    start,
    stop,
    requestPermission,
  };
};

export default useDeviceOrientation;