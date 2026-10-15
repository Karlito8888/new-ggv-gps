import { describe, expect, test } from "vite-plus/test";
import { nextBearing } from "../course";

describe("nextBearing", () => {
  test("keeps previous bearing when heading is null (stationary)", () => {
    expect(nextBearing(120, null, 2)).toBe(120);
  });

  test("keeps previous bearing when speed is null or below threshold", () => {
    expect(nextBearing(120, 300, null)).toBe(120);
    expect(nextBearing(120, 300, 0.2)).toBe(120); // < 0.5 m/s
  });

  test("treats heading 0 (due north) as a valid course, not 'missing'", () => {
    // prev=10, heading=0 -> arc -10, x0.2 -> 8
    expect(nextBearing(10, 0, 2)).toBeCloseTo(8);
  });

  test("moves toward the GPS heading by the smoothing factor", () => {
    // prev=0, heading=100 -> arc +100, x0.2 -> 20
    expect(nextBearing(0, 100, 2)).toBeCloseTo(20);
  });

  test("crosses the 359->0 boundary via the shortest arc", () => {
    // prev=350, heading=10 -> shortest arc +20 (not -340), x0.2 -> 354
    expect(nextBearing(350, 10, 2)).toBeCloseTo(354);
    // prev=10, heading=350 -> shortest arc -20 (not +340), x0.2 -> 6
    expect(nextBearing(10, 350, 2)).toBeCloseTo(6);
  });

  test("trusts the heading from 0.5 m/s", () => {
    expect(nextBearing(120, 300, 0.4)).toBe(120); // below threshold -> keep
    expect(nextBearing(120, 300, 0.6)).toBeCloseTo(84); // arc -180, x0.2 -> -36
  });

  test("ignores NaN (web, stationary) and -1 (Expo, unavailable) headings even when moving", () => {
    expect(nextBearing(120, NaN, 2)).toBe(120);
    expect(nextBearing(120, -1, 2)).toBe(120);
  });
});
