import { useOutlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

/**
 * AnimatedOutlet - Wrapper for react-router Outlet with AnimatePresence
 * Enables exit animations when routes change
 *
 * Note: Child route components must use motion.div with exit variants
 * for animations to work correctly.
 */
export default function AnimatedOutlet({ context }) {
  const location = useLocation();
  const outlet = useOutlet(context);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {outlet && (
        <div key={location.pathname}>
          {outlet}
        </div>
      )}
    </AnimatePresence>
  );
}
