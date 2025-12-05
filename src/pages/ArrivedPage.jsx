import { useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import Button from "../components/ui/button";
import { useNavigation } from "../hooks/useNavigation";
import { useLocation as useLocationData } from "../hooks/useLocations";
import { useRouteManager } from "../hooks/useRouteManager";
import styles from "../components/ui/modal-base.module.css";
import {
  overlayVariants,
  modalVariants,
  bounceInVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "../lib/animations";

/**
 * Arrived Page - Destination reached confirmation
 * Offers options for new destination or exit village
 */
export default function ArrivedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mapRef, userLocation, destination, setDestination, clearDestination } =
    useOutletContext();
  const { setRoute, setTraveledRoute } = useNavigation();

  // Get block/lot from URL params
  const blockParam = searchParams.get("block");
  const lotParam = searchParams.get("lot");

  // Fetch location data if we have params but no destination
  const { data: locationData } = useLocationData(
    blockParam && !destination ? blockParam : null,
    lotParam && !destination ? lotParam : null,
  );

  // Route manager for exit village
  const { handleExitVillage: routeExitVillage } = useRouteManager(
    mapRef,
    userLocation,
    destination,
    "arrived",
    (newState) => {
      if (newState === "navigating") navigate("/navigate?exit=true");
      if (newState === "exit-complete") navigate("/exit-complete");
    },
    setDestination,
  );

  // Restore destination from URL if needed
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
        setDestination(restoredDestination);
      }
    }
  }, [destination, locationData, blockParam, lotParam, setDestination]);

  // Handle new destination
  const handleNewDestination = useCallback(() => {
    clearDestination();
    setRoute(null);
    setTraveledRoute(null);
    navigate("/welcome");
  }, [clearDestination, setRoute, setTraveledRoute, navigate]);

  // Handle exit village
  const handleExitVillage = useCallback(async () => {
    try {
      await routeExitVillage();
      navigate("/navigate?exit=true");
    } catch (error) {
      console.error("Exit village error:", error);
    }
  }, [routeExitVillage, navigate]);

  // Use destination from context or build from URL params
  const displayDestination =
    destination ||
    (blockParam && lotParam
      ? {
          blockNumber: parseInt(blockParam),
          lotNumber: parseInt(lotParam),
          address: `Block ${blockParam}, Lot ${lotParam}`,
        }
      : null);

  if (!displayDestination) {
    return null;
  }

  return (
    <motion.div
      className={styles.pageOverlay}
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className={styles.pageContent}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className={styles.dialogHeader}>
          <motion.div
            className={styles.modalIcon}
            variants={bounceInVariants}
            initial="hidden"
            animate="visible"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
              />
            </svg>
          </motion.div>
          <motion.h1
            className={styles.modalTitle}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Destination reached !
          </motion.h1>

          {displayDestination.blockNumber && displayDestination.lotNumber ? (
            <>
              <motion.div
                className={styles.arrivalDestinationInfo}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className={styles.arrivalDestinationTitle}>
                  Block {displayDestination.blockNumber}, Lot {displayDestination.lotNumber}
                </p>
              </motion.div>

              <motion.div
                className={styles.modalActions}
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={staggerItemVariants} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleNewDestination}
                    preset="primary"
                    className={styles.gpsCustomButton}
                    style={{ width: "100%" }}
                  >
                    <span className={styles.permissionEmoji}>🎯 </span>
                    New destination ?
                  </Button>
                </motion.div>

                <motion.div variants={staggerItemVariants} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleExitVillage}
                    preset="secondary"
                    className={styles.gpsCustomButton}
                    style={{ width: "100%" }}
                  >
                    <span className={styles.permissionEmoji}>🚪 </span>
                    Exit the village !
                  </Button>
                </motion.div>
              </motion.div>
            </>
          ) : displayDestination.address ? (
            <motion.div
              className={styles.arrivalExitInfo}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className={styles.arrivalExitTitle}>{displayDestination.address}</p>
            </motion.div>
          ) : null}

          <motion.p
            className={styles.modalFooter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Thank you for using MyGGV|GPS !
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}
