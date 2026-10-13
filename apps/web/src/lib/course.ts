/**
 * Pure course-up bearing logic for GPS navigation — device-agnostic, unit-testable.
 *
 * The map bearing is derived from the GPS *course over ground*
 * (`GeolocationCoordinates.heading`), NOT from a device-orientation sensor.
 * This is robust across Android/Samsung/iOS because it needs no magnetometer.
 *
 * Two real-world GPS constraints are handled here (not over-engineering — the
 * sensor genuinely behaves this way):
 * - `heading` is `null` when stationary and noisy at low walking speed, so a
 *   fix below `minSpeed` (or with no heading) keeps the previous bearing
 *   instead of spinning the map in place.
 * - valid headings are smoothed with a circular EMA (shortest-arc) to avoid
 *   jitter and to cross the 359°→0° boundary cleanly.
 */

export interface BearingOptions {
  /** Minimum speed (m/s) to trust the GPS heading. Below it, keep last bearing. */
  minSpeed?: number;
  /** Circular EMA factor in [0,1]: higher = snappier, lower = smoother. */
  smoothing?: number;
}

/**
 * Next map bearing from a GPS fix. Returns `prevBearing` unchanged when the fix
 * carries no usable course (heading null / speed null / below `minSpeed`).
 * `heading === 0` (due north) is a valid course and updates the bearing.
 */
export function nextBearing(
  prevBearing: number,
  heading: number | null,
  speed: number | null,
  { minSpeed = 0.5, smoothing = 0.2 }: BearingOptions = {}
): number {
  if (heading === null || speed === null || speed < minSpeed) return prevBearing;
  // Shortest signed arc prevBearing -> heading, in (-180, 180].
  const arc = ((heading - prevBearing + 540) % 360) - 180;
  return (prevBearing + arc * smoothing + 360) % 360;
}
