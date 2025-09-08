import { useEffect } from 'react';

/**
 * Hook spécialisé pour la gestion des permissions d'orientation
 * Gère l'auto-trigger iOS et les transitions d'états
 */
const useOrientationPermission = ({
  navigationState,
  requestOrientationPermission,
  handleOrientationToggle,
  handleOrientationPermissionComplete
}) => {
  // Auto-trigger orientation when entering orientation-permission state
  useEffect(() => {
    if (navigationState !== "orientation-permission") return;
    
    console.log("🧭 Orientation Permission state entered - starting auto-request");
    
    const requestOrientation = async () => {
      if (requestOrientationPermission && typeof requestOrientationPermission === 'function') {
        try {
          console.log("🧭 Auto-requesting orientation permission via hook");
          const granted = await requestOrientationPermission();
          console.log("🧭 Orientation permission result:", granted);
          
          // Enable orientation if granted
          if (granted && handleOrientationToggle) {
            console.log("✅ Enabling orientation - permission granted");
            handleOrientationToggle(true);
          } else {
            console.log("❌ Orientation permission denied or not available");
          }
          
          // Complete orientation step regardless of result
          handleOrientationPermissionComplete(granted);
        } catch (error) {
          console.warn("⚠️ Orientation permission request failed:", error);
          handleOrientationPermissionComplete(false);
        }
      } else {
        // Android/Desktop - no permission needed
        console.log("🧭 Auto-enabling orientation (no permission required - Android/Desktop)");
        if (handleOrientationToggle) {
          handleOrientationToggle(true);
        }
        handleOrientationPermissionComplete(true);
      }
    };

    // Small delay to ensure user interaction context is preserved for iOS
    const timer = setTimeout(requestOrientation, 100);
    return () => clearTimeout(timer);
  }, [
    navigationState,
    requestOrientationPermission,
    handleOrientationToggle,
    handleOrientationPermissionComplete
  ]);
  
  return {
    // Hook doesn't expose handlers - everything is automatic
  };
};

export default useOrientationPermission;