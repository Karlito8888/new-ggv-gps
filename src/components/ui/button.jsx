import React from 'react';
import { Button as RadixButton } from '@radix-ui/themes';

/**
 * Enhanced Button wrapper for GGV GPS application
 * Combines Radix UI Button with app-specific presets and intelligent defaults
 */
const Button = React.forwardRef(({ 
  preset,
  variant = "solid",
  size = "3",
  color,
  highContrast,
  radius,
  loading,
  disabled,
  children,
  ...props 
}, ref) => {
  // App-specific button presets
  const presets = {
    primary: {
      variant: "solid",
      color: "green",
      size: "3"
    },
    secondary: {
      variant: "outline", 
      color: "gray",
      size: "3"
    },
    success: {
      variant: "solid",
      color: "green",
      size: "3",
      highContrast: true
    },
    surface: {
      variant: "surface",
      color: "green", 
      size: "3"
    },
    ghost: {
      variant: "ghost",
      size: "2"
    },
    soft: {
      variant: "soft",
      size: "2"
    }
  };

  // Apply preset if provided, allow individual props to override
  const presetProps = preset ? presets[preset] : {};
  
  const finalProps = {
    variant,
    size,
    color,
    highContrast,
    radius,
    loading,
    disabled,
    ...presetProps, // Apply preset defaults
    ...props, // Allow explicit props to override everything
  };

  // Clean up undefined props
  Object.keys(finalProps).forEach(key => {
    if (finalProps[key] === undefined) {
      delete finalProps[key];
    }
  });

  return (
    <RadixButton ref={ref} {...finalProps}>
      {children}
    </RadixButton>
  );
});

Button.displayName = 'Button';

export default Button;