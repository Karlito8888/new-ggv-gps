import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import ggvLogo from "../assets/img/ggv.png";
import Button from "../components/ui/button";
import styles from "../components/ui/modal-base.module.css";
import { overlayVariants, modalVariants, pulseVariants, shakeVariants } from "../lib/animations";

/**
 * GPS Permission Page - First step in the navigation flow
 * Requests GPS permission from the user
 */
export default function GpsPermissionPage() {
  const { geolocateControlRef, gpsError } = useOutletContext();
  const [isRequesting, setIsRequesting] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  const handleRequestGps = () => {
    if (!geolocateControlRef?.current) return;
    setIsRequesting(true);
    geolocateControlRef.current.trigger();
  };

  // Reset requesting state after timeout (handles dismissed permission dialogs)
  useEffect(() => {
    if (!isRequesting) return;

    const timeout = setTimeout(() => {
      setIsRequesting(false);
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isRequesting]);

  // Reset requesting state and trigger shake if there's an error
  useEffect(() => {
    if (gpsError) {
      setIsRequesting(false);
      setShouldShake(true);
      const timeout = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [gpsError]);

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
          <h1 className="sr-only">Location Permission Required</h1>
        </div>

        <motion.img
          src={ggvLogo}
          alt="Garden Grove Village Logo"
          className={styles.modalLogo}
          variants={pulseVariants}
          animate="animate"
        />

        <p className={styles.modalDescription}>
          We need access to your location
          <br />
          to help you navigate
          <br />
          in Garden Grove Village...
        </p>

        {gpsError && (
          <motion.div
            className={styles.errorMessage}
            variants={shakeVariants}
            animate={shouldShake ? "shake" : ""}
          >
            <p>{gpsError}</p>
            <p style={{ fontSize: "0.75rem", marginTop: "0.5rem", opacity: 0.8 }}>
              Check Settings → Location Permission
            </p>
          </motion.div>
        )}

        <div className={styles.modalForm}>
          <div className={styles.modalActions}>
            <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
              <Button
                onClick={handleRequestGps}
                disabled={isRequesting}
                preset="surface"
                loading={isRequesting}
                className={styles.gpsCustomButton}
                style={{ width: "auto" }}
              >
                {!isRequesting && (
                  <span className={styles.permissionEmoji}>
                    {gpsError ? "🔄 Retry GPS" : "📍 Allow GPS Location"}
                  </span>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
