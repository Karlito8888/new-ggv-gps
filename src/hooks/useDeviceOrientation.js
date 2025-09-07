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
    const hasAbsoluteOrientation = 'DeviceOrientationEvent' in window && 
                                  'DeviceOrientationAbsoluteEvent' in window;
    
    // Detect platform more accurately
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    
    console.log('🧭 Device orientation support:', {
      hasDeviceOrientation,
      hasPermissionAPI,
      hasAbsoluteOrientation,
      platform: isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other',
      userAgent: navigator.userAgent
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
        
        console.log('🍎 [requestPermission] iOS detected - requesting DeviceOrientation permission');
        
        // Add retry logic for iOS permission request
        let attempts = 0;
        const maxAttempts = 3;
        let permissionResult = null;
        
        while (attempts < maxAttempts && permissionResult !== 'granted') {
          attempts++;
          console.log(`🍎 [requestPermission] Permission attempt ${attempts}/${maxAttempts}`);
          
          try {
            // Add a small delay between attempts to handle iOS timing issues
            if (attempts > 1) {
              console.log('🍎 [requestPermission] Adding delay before retry...');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            permissionResult = await DeviceOrientationEvent.requestPermission();
            console.log(`🍎 [requestPermission] Attempt ${attempts} result:`, permissionResult);
            
            if (permissionResult === 'granted') {
              console.log('✅ [requestPermission] Permission granted successfully');
              setPermission(permissionResult);
              
              // Add additional delay after permission granted to ensure iOS is ready
              console.log('🍎 [requestPermission] Adding post-permission delay for iOS...');
              await new Promise(resolve => setTimeout(resolve, 300));
              
              return true;
            }
            
          } catch (attemptError) {
            console.warn(`⚠️ [requestPermission] Attempt ${attempts} failed:`, attemptError);
            if (attempts === maxAttempts) {
              throw attemptError;
            }
          }
        }
        
        // All attempts failed or permission was denied
        console.error('❌ [requestPermission] Permission denied after all attempts:', permissionResult);
        setPermission(permissionResult || 'denied');
        setError('Orientation permission denied. Enable in Settings > Privacy > Motion & Fitness');
        return false;
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
      console.log('🧭 [getCurrentOrientation] Starting orientation capture...');
      
      if (!isSupported) {
        console.error('❌ [getCurrentOrientation] Device orientation not supported');
        reject(new Error('Device orientation not supported'));
        return;
      }

      console.log('🧭 [getCurrentOrientation] Device supported, setting up listener...');
      
      let attempts = 0;
      const maxAttempts = 3;
      
      const attemptCapture = () => {
        attempts++;
        console.log(`🧭 [getCurrentOrientation] Attempt ${attempts}/${maxAttempts}`);
        
        // Set a timeout to avoid hanging
        const timeout = setTimeout(() => {
          window.removeEventListener('deviceorientation', handleSingleOrientation);
          console.warn(`⚠️ [getCurrentOrientation] Timeout on attempt ${attempts}`);
          
          if (attempts < maxAttempts) {
            console.log('🔄 [getCurrentOrientation] Retrying...');
            setTimeout(attemptCapture, 500);
          } else {
            console.error('❌ [getCurrentOrientation] All attempts failed - orientation timeout');
            reject(new Error('Orientation timeout after multiple attempts'));
          }
        }, 2000);

        const handleSingleOrientation = (event) => {
          clearTimeout(timeout);
          window.removeEventListener('deviceorientation', handleSingleOrientation);
          
          const { alpha, beta, gamma, webkitCompassHeading } = event;
          console.log('🧭 [getCurrentOrientation] Raw orientation event:', { 
            alpha, 
            beta, 
            gamma, 
            webkitCompassHeading 
          });
          
          // Cross-platform compass heading calculation
          let compassHeading;
          
          if (webkitCompassHeading !== undefined && webkitCompassHeading !== null) {
            // iOS: use webkitCompassHeading
            compassHeading = webkitCompassHeading;
            console.log('🍎 [getCurrentOrientation] Using iOS webkitCompassHeading:', compassHeading.toFixed(1) + '°');
          } else if (alpha !== null && alpha !== undefined) {
            // Android: use alpha, convert to 0-360° heading
            compassHeading = (360 - alpha) % 360;
            if (compassHeading < 0) compassHeading += 360;
            console.log('🤖 [getCurrentOrientation] Using Android alpha (converted):', compassHeading.toFixed(1) + '°');
          } else {
            console.warn(`⚠️ [getCurrentOrientation] Invalid compass data on attempt ${attempts}`);
            
            if (attempts < maxAttempts) {
              console.log('🔄 [getCurrentOrientation] Retrying due to invalid compass data...');
              setTimeout(attemptCapture, 500);
            } else {
              console.error('❌ [getCurrentOrientation] All attempts failed - invalid compass data');
              reject(new Error('Invalid compass data after multiple attempts'));
            }
            return;
          }
          
          // Validate compass heading
          if (compassHeading < 0 || compassHeading > 360 || isNaN(compassHeading)) {
            console.warn(`⚠️ [getCurrentOrientation] Invalid compass heading:`, compassHeading);
            
            if (attempts < maxAttempts) {
              console.log('🔄 [getCurrentOrientation] Retrying due to invalid heading...');
              setTimeout(attemptCapture, 500);
            } else {
              console.error('❌ [getCurrentOrientation] All attempts failed - invalid compass heading');
              reject(new Error('Invalid compass heading after multiple attempts'));
            }
            return;
          }
          
          console.log(`✅ [getCurrentOrientation] Success on attempt ${attempts}: ${compassHeading.toFixed(1)}°`);
          resolve(compassHeading);
        };

        // Listen for a single orientation event
        console.log('👂 [getCurrentOrientation] Adding event listener...');
        window.addEventListener('deviceorientation', handleSingleOrientation, { passive: true });
      };
      
      attemptCapture();
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
    
    const { alpha, beta, gamma, webkitCompassHeading } = event;
    
    // Cross-platform compass heading calculation
    let compassHeading;
    
    if (webkitCompassHeading !== undefined && webkitCompassHeading !== null) {
      // iOS: use webkitCompassHeading (direct magnetic north heading)
      compassHeading = webkitCompassHeading;
      console.log('🍎 Using iOS webkitCompassHeading:', compassHeading.toFixed(1) + '°');
    } else if (alpha !== null && alpha !== undefined) {
      // Android: use alpha, convert to 0-360° heading
      compassHeading = (360 - alpha) % 360;
      if (compassHeading < 0) compassHeading += 360;
      console.log('🤖 Using Android alpha (converted):', compassHeading.toFixed(1) + '°');
    } else {
      console.warn('⚠️ Invalid orientation data - no compass heading available');
      return;
    }
    
    // Validate compass heading
    if (compassHeading < 0 || compassHeading > 360 || isNaN(compassHeading)) {
      console.warn('⚠️ Invalid compass heading:', compassHeading);
      return;
    }
    
    // Smooth the compass heading
    const smoothedHeading = smoothOrientation(compassHeading);
    
    // Update orientation state
    setOrientation({
      alpha: smoothedHeading,      // Compass heading (0-360°)
      beta: beta || 0,             // Front-to-back tilt (-180 to 180°)
      gamma: gamma || 0,           // Left-to-right tilt (-90 to 90°)
      raw: { 
        alpha: compassHeading,     // Raw compass heading
        beta, 
        gamma,
        webkitCompassHeading      // iOS-specific value for debugging
      }, 
      timestamp: now,
      platform: webkitCompassHeading !== undefined ? 'iOS' : 'Android'
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
      // Try to use deviceorientationabsolute first (more accurate for Android)
      if ('DeviceOrientationAbsoluteEvent' in window) {
        window.addEventListener('deviceorientationabsolute', eventListenerRef.current, { passive: true });
        console.log('✅ Device orientation tracking started (absolute event)');
      } else {
        // Fall back to standard deviceorientation
        window.addEventListener('deviceorientation', eventListenerRef.current, { passive: true });
        console.log('✅ Device orientation tracking started (standard event)');
      }
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
      // Remove both types of event listeners
      window.removeEventListener('deviceorientation', eventListenerRef.current);
      window.removeEventListener('deviceorientationabsolute', eventListenerRef.current);
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