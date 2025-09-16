import { useState, useEffect, useCallback } from 'react';
import { 
  detectGeolocationCapabilities, 
  checkGeolocationPermission,
  getOptimalGeolocationOptions,
  getGeolocationErrorMessage 
} from '../utils/geolocationUtils';

/**
 * Hook personnalisé pour la géolocalisation cross-platform
 * Optimisé pour mobile ET desktop
 */
export function useGeolocation(options = {}) {
  const { 
    enableWatch = false, 
    onLocationUpdate = null,
    onError = null 
  } = options;

  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState('unknown');
  const [capabilities, setCapabilities] = useState(null);

  // Détecter les capacités au montage
  useEffect(() => {
    const caps = detectGeolocationCapabilities();
    setCapabilities(caps);
    
    // Vérifier les permissions si l'API est disponible
    if (caps.hasPermissionsAPI) {
      checkGeolocationPermission().then(setPermission);
    }
  }, []);

  // Gestionnaire de succès
  const handleSuccess = useCallback((position) => {
    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    };
    
    setLocation(locationData);
    setError(null);
    setIsLoading(false);
    
    if (onLocationUpdate) {
      onLocationUpdate(locationData);
    }
    
    console.log('📍 Location updated:', locationData);
  }, [onLocationUpdate]);

  // Gestionnaire d'erreur
  const handleError = useCallback((err) => {
    const errorInfo = getGeolocationErrorMessage(
      err.code, 
      capabilities?.isDesktop
    );
    
    setError({
      code: err.code,
      message: err.message,
      ...errorInfo,
    });
    setIsLoading(false);
    
    if (onError) {
      onError(err);
    }
    
    console.error('📍 Geolocation error:', err);
  }, [onError, capabilities]);

  // Obtenir la position une fois
  const getCurrentPosition = useCallback(() => {
    if (!capabilities?.hasGeolocation) {
      setError({ message: 'Géolocalisation non supportée' });
      return;
    }

    setIsLoading(true);
    setError(null);

    const geoOptions = getOptimalGeolocationOptions(capabilities.isDesktop);
    
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      geoOptions
    );
  }, [capabilities, handleSuccess, handleError]);

  // Surveiller la position en continu
  const watchPosition = useCallback(() => {
    if (!capabilities?.hasGeolocation) {
      setError({ message: 'Géolocalisation non supportée' });
      return null;
    }

    setIsLoading(true);
    setError(null);

    const geoOptions = getOptimalGeolocationOptions(capabilities.isDesktop);
    
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geoOptions
    );

    return watchId;
  }, [capabilities, handleSuccess, handleError]);

  // Arrêter la surveillance
  const clearWatch = useCallback((watchId) => {
    if (watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Auto-watch si activé
  useEffect(() => {
    let watchId = null;
    
    if (enableWatch && capabilities?.hasGeolocation) {
      watchId = watchPosition();
    }
    
    return () => {
      if (watchId) {
        clearWatch(watchId);
      }
    };
  }, [enableWatch, capabilities, watchPosition, clearWatch]);

  return {
    // État
    location,
    error,
    isLoading,
    permission,
    capabilities,
    
    // Actions
    getCurrentPosition,
    watchPosition,
    clearWatch,
    
    // Utilitaires
    isSupported: capabilities?.hasGeolocation || false,
    isDesktop: capabilities?.isDesktop || false,
    isSecure: capabilities?.isSecureContext || false,
  };
}