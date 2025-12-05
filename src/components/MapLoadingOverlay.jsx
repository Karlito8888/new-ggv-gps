import { motion, AnimatePresence } from "framer-motion";
import ggvLogo from "../assets/img/ggv.png";
import styles from "./mapLoadingOverlay.module.css";
import { fadeVariants, pulseVariants, spinnerVariants } from "../lib/animations";

/**
 * Overlay de chargement affiché pendant l'initialisation de la carte
 * Améliore l'UX en évitant un écran vide au démarrage
 * Utilise Framer Motion pour des animations fluides
 */
const MapLoadingOverlay = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles.overlay}
          role="status"
          aria-live="polite"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className={styles.content}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <motion.img
              src={ggvLogo}
              alt="Garden Grove Village"
              className={styles.logo}
              variants={pulseVariants}
              animate="animate"
            />
            <motion.div
              className={styles.spinner}
              aria-hidden="true"
              variants={spinnerVariants}
              animate="animate"
              style={{ animation: "none" }} // Override CSS animation
            />
            <motion.p
              className={styles.text}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Loading map...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MapLoadingOverlay;
