import { forwardRef } from "react";
import { motion } from "framer-motion";
import Button from "./button";

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.95 },
};

/**
 * AnimatedButton - Button wrapper with Framer Motion animations
 * Provides tactile feedback on press (scale down) and hover (scale up)
 */
const AnimatedButton = forwardRef(({ children, disabled, animate = true, ...props }, ref) => {
  // If animation is disabled or button is disabled, render without motion
  if (!animate || disabled) {
    return (
      <Button ref={ref} disabled={disabled} {...props}>
        {children}
      </Button>
    );
  }

  return (
    <motion.div
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      style={{ display: "inline-block" }}
    >
      <Button ref={ref} disabled={disabled} {...props}>
        {children}
      </Button>
    </motion.div>
  );
});

AnimatedButton.displayName = "AnimatedButton";

export default AnimatedButton;
