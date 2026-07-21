import { describe, expect, test } from "vitest";
import { nextBearing } from "../lib/course";

describe("nextBearing", () => {
  test("keeps previous bearing when heading is null (stationary)", () => {
    expect(nextBearing(120, null, 2)).toBe(120);
  });

  test("keeps previous bearing when speed is null or below threshold", () => {
    expect(nextBearing(120, 300, null)).toBe(120);
    expect(nextBearing(120, 300, 0.2)).toBe(120); // < 0.5 m/s default
  });

  test("treats heading 0 (due north) as a valid course, not 'missing'", () => {
    // prev=10, heading=0, snappy smoothing=1 -> exactly 0
    expect(nextBearing(10, 0, 2, { smoothing: 1 })).toBe(0);
  });

  test("moves toward the GPS heading by the smoothing factor", () => {
    // prev=0, heading=100, smoothing=0.2 -> 20
    expect(nextBearing(0, 100, 2, { smoothing: 0.2 })).toBeCloseTo(20);
  });

  test("crosses the 359->0 boundary via the shortest arc", () => {
    // prev=350, heading=10 -> shortest arc +20; smoothing=1 -> 10 (not 180)
    expect(nextBearing(350, 10, 2, { smoothing: 1 })).toBeCloseTo(10);
    // prev=10, heading=350 -> shortest arc -20; smoothing=1 -> 350
    expect(nextBearing(10, 350, 2, { smoothing: 1 })).toBeCloseTo(350);
  });

  test("respects a custom minSpeed threshold", () => {
    expect(nextBearing(120, 300, 1, { minSpeed: 2 })).toBe(120); // 1 < 2 -> keep
    expect(nextBearing(120, 300, 3, { minSpeed: 2, smoothing: 1 })).toBeCloseTo(300);
  });
});
