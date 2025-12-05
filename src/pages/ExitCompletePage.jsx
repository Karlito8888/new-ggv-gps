import { motion } from "framer-motion";
import styles from "../components/ui/modal-base.module.css";
import { overlayVariants, modalVariants, bounceInVariants } from "../lib/animations";

/**
 * Exit Complete Page - Village exit confirmation
 * Displayed when user has exited Garden Grove Village
 */
export default function ExitCompletePage() {
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </motion.div>
          <motion.h1
            className={styles.modalTitle}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            You've successfully exited
            <br />
            Garden Grove Village !
          </motion.h1>

          <motion.div
            className={styles.exitMessage}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <p className={styles.exitFilipinoMessage}>
              Salamat po
              <br />
              🙏 Ingat sa paguwi 🙏
            </p>
          </motion.div>

          <motion.p
            className={styles.modalFooter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Thank you for using MyGGV|GPS! 💚
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}
