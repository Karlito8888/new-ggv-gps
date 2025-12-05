import { cloneElement } from "react";
import { useOutlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

/**
 * AnimatedOutlet - Wrapper for react-router Outlet with AnimatePresence
 * Enables exit animations when routes change
 *
 * Uses cloneElement to pass the location key directly to child route components,
 * allowing their internal motion.div elements to animate correctly with
 * AnimatePresence detecting mount/unmount cycles.
 */
export default function AnimatedOutlet({ context }) {
  const location = useLocation();
  const outlet = useOutlet(context);

  return (
    <AnimatePresence mode="wait">
      {outlet && cloneElement(outlet, { key: location.pathname })}
    </AnimatePresence>
  );
}
