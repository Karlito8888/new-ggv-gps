/**
 * Pure compass/orientation helpers — device-agnostic and unit-testable.
 *
 * Platform differences (verified against MDN + W3C Device Orientation spec):
 * - iOS Safari exposes `webkitCompassHeading`: already a true compass heading
 *   (0-360, 0 = North, increasing clockwise).
 * - Android/Chromium `deviceorientationabsolute` exposes world-based `alpha`
 *   (0 = North, increasing COUNTER-clockwise), so heading = (360 - alpha).
 *   Samsung Internet is Chromium-based and behaves like Chrome here.
 * - Relative `deviceorientation` data (absolute === false, no compass heading)
 *   is unusable as a compass and must be ignored.
 */

export interface OrientationReading {
  webkitCompassHeading?: number | null;
  absolute?: boolean;
  alpha?: number | null;
}

/**
 * Convert a DeviceOrientationEvent-like reading into a compass heading in
 * [0, 360) where 0 = North, increasing clockwise. Returns `null` when the
 * reading carries no usable absolute orientation.
 */
export function computeCompassHeading(e: OrientationReading): number | null {
  let raw: number | null = null;

  // iOS Safari: webkitCompassHeading is already a true compass heading.
  if (typeof e.webkitCompassHeading === "number" && !Number.isNaN(e.webkitCompassHeading)) {
    raw = e.webkitCompassHeading;
  } else if (e.absolute === true && typeof e.alpha === "number" && !Number.isNaN(e.alpha)) {
    // Android/Chromium absolute: world-based alpha, counter-clockwise → invert.
    raw = 360 - e.alpha;
  }

  if (raw === null) return null;
  // Normalize into [0, 360) (the +360 guards against negative inputs).
  return ((raw % 360) + 360) % 360;
}

/** Smallest angular difference between two headings, in [0, 180]. */
export function angularDelta(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}
