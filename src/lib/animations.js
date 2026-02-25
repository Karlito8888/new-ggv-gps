// Shared Framer Motion animation variants for overlay components

export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalVariants = /** @type {const} */ ({
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: /** @type {const} */ ({ type: "spring", damping: 25 }),
  },
  exit: { scale: 0.8, opacity: 0 },
});
