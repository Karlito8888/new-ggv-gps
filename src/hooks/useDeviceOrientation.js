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

  // [Old requestPermission function removed - now using requestPermissionDetailed]

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

  // Unified permission request with detailed result
  const requestPermissionDetailed = useCallback(async () => {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS - requires explicit permission
        const result = await DeviceOrientationEvent.requestPermission();
        setPermission(result);
        return { 
          granted: result === 'granted', 
          platform: 'ios',
          permission: result 
        };
      } else {
        // Android/Desktop - no permission required
        setPermission('granted');
        return { 
          granted: true, 
          platform: 'android',
          permission: 'granted' 
        };
      }
    } catch (error) {
      setPermission('denied');
      return { 
        granted: false, 
        platform: 'ios',
        permission: 'denied',
        error 
      };
    }
  }, []);

  // Démarrer l'orientation
  const start = useCallback(async () => {
    if (!enabled || !isSupported) return false;

    const result = await requestPermissionDetailed();
    if (!result.granted) return false;

    // Android : priorité à deviceorientationabsolute (valeurs absolues)
    // iOS : deviceorientation standard avec webkitCompassHeading
    if ('DeviceOrientationAbsoluteEvent' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    
    setIsActive(true);
    return true;
  }, [enabled, isSupported, requestPermissionDetailed, handleOrientation]);

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

  // Get current orientation value (for map transitions)
  const getCurrentOrientation = useCallback(() => {
    return compass;
  }, [compass]);

  return {
    // Valeurs
    compass,
    isSupported,
    permission,
    isActive,
    
    // Contrôles
    start,
    stop,
    requestPermission: requestPermissionDetailed, // Use the detailed version
    getCurrentOrientation,
  };
};

export default useDeviceOrientation;