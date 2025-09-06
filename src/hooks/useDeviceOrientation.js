import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for device orientation management (Android + iOS compatible)
 * Handles permissions, filtering, and cross-platform compatibility
 */
const useDeviceOrientation = (options = {}) => {
  const {
    smoothingFactor = 0.7, // Smoothing factor (0 = no smoothing, 1 = max smoothing)
    throttleMs = 100, // Throttle orientation updates (ms)
    enabled = true, // Enable/disable orientation tracking
  } = options;

  // States
  const [orientation, setOrientation] = useState(null);
  const [permission, setPermission] = useState('unknown'); // 'granted', 'denied', 'unknown', 'unsupported'
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);

  // Refs for optimization
  const lastUpdateTime = useRef(0);
  const smoothedAlpha = useRef(null);
  const eventListenerRef = useRef(null);

  // Check device orientation support
  const checkSupport = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Check if DeviceOrientationEvent is supported
    const hasDeviceOrientation = 'DeviceOrientationEvent' in window;
    const hasPermissionAPI = typeof DeviceOrientationEvent !== 'undefined' && 
                            typeof DeviceOrientationEvent.requestPermission === 'function';
    
    console.log('🧭 Device orientation support:', {
      hasDeviceOrientation,
      hasPermissionAPI,
      userAgent: navigator.userAgent.includes('iPhone') ? 'iOS' : 'Android/Other'
    });
    
    setIsSupported(hasDeviceOrientation);
    return hasDeviceOrientation;
  }, []);

  // Request permission (iOS 13+ requirement)
  const requestPermission = useCallback(async () => {
    try {
      // Check if we're on iOS with permission API
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        
        console.log('🍎 iOS detected - requesting DeviceOrientation permission');
        const permissionResult = await DeviceOrientationEvent.requestPermission();
        
        console.log('🍎 iOS permission result:', permissionResult);
        setPermission(permissionResult);
        
        if (permissionResult !== 'granted') {
          setError('Orientation permission denied. Enable in Settings > Privacy > Motion & Fitness');
          return false;
        }
        
        return true;
      } else {
        // Android or older iOS - assume granted
        console.log('🤖 Android/Legacy iOS - assuming orientation permission granted');
        setPermission('granted');
        return true;
      }
    } catch (err) {
      console.error('❌ Error requesting orientation permission:', err);
      setError(`Permission request failed: ${err.message}`);
      setPermission('denied');
      return false;
    }
  }, []);

  // Smooth orientation data
  const smoothOrientation = useCallback((newAlpha) => {
    if (smoothedAlpha.current === null) {
      smoothedAlpha.current = newAlpha;
      return newAlpha;
    }
    
    // Handle 360° wraparound (e.g., 359° to 1°)
    let diff = newAlpha - smoothedAlpha.current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    smoothedAlpha.current += diff * (1 - smoothingFactor);
    
    // Normalize to 0-360°
    if (smoothedAlpha.current < 0) smoothedAlpha.current += 360;
    if (smoothedAlpha.current >= 360) smoothedAlpha.current -= 360;
    
    return smoothedAlpha.current;
  }, [smoothingFactor]);

  // Get current orientation immediately (single reading)
  const getCurrentOrientation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('Device orientation not supported'));
        return;
      }

      // Set a timeout to avoid hanging
      const timeout = setTimeout(() => {
        window.removeEventListener('deviceorientation', handleSingleOrientation);
        reject(new Error('Orientation timeout'));
      }, 3000);

      const handleSingleOrientation = (event) => {
        clearTimeout(timeout);
        window.removeEventListener('deviceorientation', handleSingleOrientation);
        
        const { alpha } = event;
        if (alpha === null || alpha === undefined) {
          reject(new Error('Invalid orientation data'));
          return;
        }
        
        console.log(`🧭 Current device orientation captured: ${alpha.toFixed(1)}°`);
        resolve(alpha);
      };

      // Listen for a single orientation event
      window.addEventListener('deviceorientation', handleSingleOrientation, { passive: true });
    });
  }, [isSupported]);

  // Handle orientation event
  const handleOrientation = useCallback((event) => {
    const now = Date.now();
    
    // Throttle updates
    if (now - lastUpdateTime.current < throttleMs) {
      return;
    }
    lastUpdateTime.current = now;
    
    const { alpha, beta, gamma } = event;
    
    // Validate orientation data
    if (alpha === null || alpha === undefined) {
      console.warn('⚠️ Invalid orientation data - alpha is null');
      return;
    }
    
    // Smooth the alpha value (compass heading)
    const smoothedAlphaValue = smoothOrientation(alpha);
    
    // Update orientation state
    setOrientation({
      alpha: smoothedAlphaValue, // Compass heading (0-360°)
      beta: beta || 0,           // Front-to-back tilt (-180 to 180°)
      gamma: gamma || 0,         // Left-to-right tilt (-90 to 90°)
      raw: { alpha, beta, gamma }, // Raw values for debugging
      timestamp: now
    });
    
  }, [throttleMs, smoothOrientation]);

  // Start orientation tracking
  const startOrientation = useCallback(async () => {
    if (!enabled || !isSupported) {
      console.log('🚫 Orientation tracking disabled or unsupported');
      return false;
    }
    
    // Request permission if needed
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      console.log('❌ Orientation permission not granted');
      return false;
    }
    
    // Clean up any existing listener
    if (eventListenerRef.current) {
      window.removeEventListener('deviceorientation', eventListenerRef.current);
    }
    
    // Create and store event listener reference
    eventListenerRef.current = handleOrientation;
    
    try {
      // Add orientation event listener
      window.addEventListener('deviceorientation', eventListenerRef.current, { passive: true });
      console.log('✅ Device orientation tracking started');
      return true;
    } catch (err) {
      console.error('❌ Failed to start orientation tracking:', err);
      setError(`Failed to start orientation: ${err.message}`);
      return false;
    }
  }, [enabled, isSupported, requestPermission, handleOrientation]);

  // Stop orientation tracking
  const stopOrientation = useCallback(() => {
    if (eventListenerRef.current) {
      window.removeEventListener('deviceorientation', eventListenerRef.current);
      eventListenerRef.current = null;
      console.log('🛑 Device orientation tracking stopped');
    }
    
    setOrientation(null);
    smoothedAlpha.current = null;
  }, []);

  // Initialize on mount
  useEffect(() => {
    const supported = checkSupport();
    
    if (supported && enabled) {
      startOrientation();
    }
    
    // Cleanup on unmount
    return () => {
      stopOrientation();
    };
  }, [enabled, checkSupport, startOrientation, stopOrientation]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopOrientation();
    };
  }, [stopOrientation]);

  return {
    // Orientation data
    orientation,
    
    // Status
    isSupported,
    permission,
    error,
    isActive: orientation !== null,
    
    // Controls
    start: startOrientation,
    stop: stopOrientation,
    requestPermission,
    getCurrentOrientation, // New function for immediate orientation
    
    // Computed values
    compass: orientation?.alpha || 0, // Compass heading in degrees
    isReady: isSupported && permission === 'granted' && enabled,
  };
};

export default useDeviceOrientation;