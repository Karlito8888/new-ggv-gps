import { useEffect, useCallback, useRef, useState } from "react";

/**
 * Hook for managing map transitions - VERSION ULTRA SIMPLIFIÉE
 * Utilise directement les API natives de MapLibre GL JS
 *
 * Note: L'orientation est demandée de façon "lazy" au premier toggle
 * pour réduire la friction utilisateur (pas de modal au démarrage)
 */
export function useMapTransitions({
  mapRef,
  isMapReady,
  adaptivePitch,
  pitchMode,
  compass,
  isActive,
  orientationEnabled,
  navigationState,
  getCurrentOrientation,
  setOrientationEnabled,
  requestOrientationPermission, // Nouvelle prop pour demander la permission
}) {
  // État pour savoir si on a déjà demandé la permission
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  // Protection simple contre les animations multiples
  const isTransitioning = useRef(false);

  // Dynamic pitch update - optimized with flyTo()
  useEffect(() => {
    if (!mapRef.current?.getMap() || !isMapReady || isTransitioning.current) return;

    isTransitioning.current = true;
    const map = mapRef.current.getMap();

    // Utiliser flyTo() pour une transition plus fluide du pitch
    map.flyTo({
      pitch: adaptivePitch,
      duration: pitchMode === "cinematic" ? 1200 : 600,
      speed: 0.8,
      curve: 1,
      essential: true,
    });

    setTimeout(
      () => {
        isTransitioning.current = false;
      },
      pitchMode === "cinematic" ? 1200 : 600,
    );
  }, [adaptivePitch, pitchMode, mapRef, isMapReady]);

  // Device orientation effect - optimized with flyTo()
  useEffect(() => {
    if (
      !mapRef.current?.getMap() ||
      !isMapReady ||
      !orientationEnabled ||
      !isActive ||
      navigationState !== "navigating" ||
      isTransitioning.current
    )
      return;

    isTransitioning.current = true;
    const map = mapRef.current.getMap();

    // Utiliser flyTo() pour une transition plus fluide du bearing
    map.flyTo({
      bearing: compass,
      duration: 300,
      speed: 1.2,
      curve: 1,
      essential: true,
    });

    setTimeout(() => {
      isTransitioning.current = false;
    }, 300);
  }, [compass, isActive, orientationEnabled, navigationState, mapRef, isMapReady]);

  // Handle orientation toggle - avec permission lazy
  const handleOrientationToggle = useCallback(
    async (enabled) => {
      // Si on active l'orientation et qu'on n'a pas encore demandé la permission
      if (enabled && !hasRequestedPermission && requestOrientationPermission) {
        setIsRequestingPermission(true);

        try {
          console.log("🧭 Requesting orientation permission (lazy)...");
          const result = await requestOrientationPermission();
          setHasRequestedPermission(true);

          if (!result.granted) {
            console.log("🧭 Orientation permission denied - continuing without compass");
            setIsRequestingPermission(false);
            return; // Ne pas activer l'orientation si refusée
          }

          console.log("🧭 Orientation permission granted");
        } catch (error) {
          console.warn("🧭 Orientation permission error:", error);
          setHasRequestedPermission(true);
          setIsRequestingPermission(false);
          return;
        }

        setIsRequestingPermission(false);
      }

      setOrientationEnabled(enabled);

      if (!mapRef.current?.getMap() || !isMapReady) return;

      try {
        const targetBearing = enabled ? await getCurrentOrientation() : 0;
        const map = mapRef.current.getMap();

        // Utiliser flyTo() pour une transition plus fluide
        map.flyTo({
          bearing: targetBearing,
          duration: 600,
          speed: 1,
          curve: 1.2,
          essential: true,
        });
      } catch (error) {
        console.error("Orientation toggle error:", error);
      }
    },
    [
      mapRef,
      isMapReady,
      getCurrentOrientation,
      setOrientationEnabled,
      hasRequestedPermission,
      requestOrientationPermission,
    ],
  );

  return {
    handleOrientationToggle,
    isRequestingPermission, // Exposer pour feedback UI si nécessaire
  };
}
