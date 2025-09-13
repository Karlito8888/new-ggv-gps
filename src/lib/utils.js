import { clsx } from "clsx";

/**
 * Combine classes CSS en utilisant clsx uniquement
 * @param {import("clsx").ClassValue[]} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return clsx(inputs);
}