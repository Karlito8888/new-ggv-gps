import { useEffect, useCallback, useState } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import NavigationDisplay from "../components/NavigationDisplay";
import { useNavigation } from "../hooks/useNavigation";
import { useLocation as useLocationData } from "../hooks/useLocations";
import { useRouteManager } from "../hooks/useRouteManager";
import styles from "../components/ui/modal-base.module.css";

/**
 * Navigate Page - Active turn-by-turn navigation
 * Displays navigation instructions and compass
 */
export default function NavigatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mapRef, userLocation, destination, setDestination, orientationEnabled } =
    useOutletContext();

  const { setRoute, setTraveledRoute } = useNavigation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState("");

  // Get block/lot from URL params
  const blockParam = searchParams.get("block");
  const lotParam = searchParams.get("lot");
  const isExitMode = searchParams.get("exit") === "true";

  // Fetch location data if we have params but no destination
  const {
    data: locationData,
    isLoading: isLocationLoading,
    error: locationError,
  } = useLocationData(
    blockParam && !destination ? blockParam : null,
    lotParam && !destination ? lotParam : null,
  );

  // Route manager for creating and updating routes
  const { route, traveledRoute, autoCreateRoute } = useRouteManager(
    mapRef,
    userLocation,
    destination,
    "navigating",
    (newState) => {
      // Handle state transitions via router
      if (newState === "welcome") navigate("/welcome", { replace: true });
      if (newState === "arrived") {
        navigate(`/arrived?block=${destination?.blockNumber}&lot=${destination?.lotNumber}`, {
          replace: true,
        });
      }
      if (newState === "exit-complete") navigate("/exit-complete", { replace: true });
    },
    setDestination,
  );

  // Sync route state with context
  useEffect(() => {
    setRoute(route);
    setTraveledRoute(traveledRoute);
  }, [route, traveledRoute, setRoute, setTraveledRoute]);

  // Consolidated guard effect - handles all redirects in priority order
  useEffect(() => {
    // Guard 1: Check GPS permission first
    if (!userLocation) {
      setIsRedirecting(true);
      setRedirectMessage("Location required. Redirecting...");
      const timeout = setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);
      return () => clearTimeout(timeout);
    }

    // Guard 2: Check destination params (skip for exit mode which uses context)
    if (!isExitMode && (!blockParam || !lotParam)) {
      setIsRedirecting(true);
      setRedirectMessage("No destination selected. Redirecting...");
      const timeout = setTimeout(() => {
        navigate("/welcome", { replace: true });
      }, 1500);
      return () => clearTimeout(timeout);
    }

    setIsRedirecting(false);
    setRedirectMessage("");
  }, [userLocation, blockParam, lotParam, isExitMode, navigate]);

  // Restore destination from URL params if needed
  useEffect(() => {
    if (!destination && locationData && blockParam && lotParam) {
      let coordinates = null;

      if (
        locationData.coordinates &&
        Array.isArray(locationData.coordinates) &&
        locationData.coordinates.length === 2
      ) {
        coordinates = locationData.coordinates;
      } else if (
        locationData.coordinates?.coordinates &&
        Array.isArray(locationData.coordinates.coordinates) &&
        locationData.coordinates.coordinates.length === 2
      ) {
        coordinates = locationData.coordinates.coordinates;
      }

      if (coordinates) {
        const restoredDestination = {
          blockNumber: parseInt(blockParam),
          lotNumber: parseInt(lotParam),
          address: `Block ${blockParam}, Lot ${lotParam}`,
          coordinates: coordinates,
          markerUrl: locationData.marker_url || "/default-marker.png",
        };
        console.log("Restoring destination from URL:", restoredDestination);
        setDestination(restoredDestination);
      }
    }
  }, [destination, locationData, blockParam, lotParam, setDestination]);

  // Auto-create route when destination and location are available
  useEffect(() => {
    if (userLocation && destination && !route) {
      autoCreateRoute();
    }
  }, [userLocation, destination, route, autoCreateRoute]);

  // Handle arrival
  const handleArrival = useCallback(() => {
    if (destination) {
      navigate(`/arrived?block=${destination.blockNumber}&lot=${destination.lotNumber}`, {
        replace: true,
      });
    }
  }, [destination, navigate]);

  // Handle exit complete
  const handleExitComplete = useCallback(() => {
    navigate("/exit-complete", { replace: true });
  }, [navigate]);

  // Show redirect message
  if (isRedirecting) {
    return (
      <div className={styles.pageOverlay}>
        <div className={styles.pageContent}>
          <p className={styles.modalDescription}>{redirectMessage}</p>
        </div>
      </div>
    );
  }

  // Show loading state while fetching location data
  if (isLocationLoading && !destination) {
    return (
      <div className={styles.pageOverlay}>
        <div className={styles.pageContent}>
          <p className={styles.modalDescription}>Loading destination...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (locationError && !destination) {
    return (
      <div className={styles.pageOverlay}>
        <div className={styles.pageContent}>
          <p className={styles.modalDescription} style={{ color: "#ff6b6b" }}>
            Error loading destination
          </p>
          <p className={styles.modalDescription}>{locationError.message}</p>
          <button
            onClick={() => navigate("/welcome", { replace: true })}
            className={styles.gpsCustomButton}
            style={{ marginTop: "1rem" }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Don't render navigation if missing required data
  if (!userLocation || !destination) {
    return null;
  }

  return (
    <NavigationDisplay
      userLocation={userLocation}
      destination={destination}
      deviceBearing={0}
      onArrival={handleArrival}
      onExitComplete={handleExitComplete}
      isOrientationActive={orientationEnabled}
      isExitMode={isExitMode}
    />
  );
}
