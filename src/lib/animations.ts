// Shared Framer Motion animation variants for overlay components
import type { Variants } from "framer-motion";

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { delay: 0.15 } },
};

export const modalVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", damping: 25 },
  },
  exit: { scale: 0.8, opacity: 0 },
};

export const slideFromTopVariants: Variants = {
  hidden: { y: "-100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", damping: 25, stiffness: 200 },
  },
  exit: {
    y: "-100%",
    opacity: 0,
    transition: { type: "spring", damping: 25, stiffness: 200 },
  },
};

export const slideFromBottomVariants: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", damping: 25, stiffness: 200 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { type: "spring", damping: 25, stiffness: 200 },
  },
};
