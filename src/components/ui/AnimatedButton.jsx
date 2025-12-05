import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import Button from './button';
import { buttonTapVariants } from '../../lib/animations';

/**
 * AnimatedButton - Button wrapper with Framer Motion tap animation
 * Provides tactile feedback on press (scale down to 95%)
 */
const AnimatedButton = forwardRef(({
  children,
  disabled,
  animate = true,
  ...props
}, ref) => {
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
      whileTap={buttonTapVariants.tap}
      whileHover={buttonTapVariants.hover}
      style={{ display: 'inline-block' }}
    >
      <Button ref={ref} disabled={disabled} {...props}>
        {children}
      </Button>
    </motion.div>
  );
});

AnimatedButton.displayName = 'AnimatedButton';

export default AnimatedButton;
