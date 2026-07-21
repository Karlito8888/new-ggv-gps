import { describe, expect, test } from "vitest";
import { computeCompassHeading, angularDelta } from "../lib/compass";

describe("computeCompassHeading", () => {
  test("iOS: passes through webkitCompassHeading (true heading)", () => {
    expect(computeCompassHeading({ webkitCompassHeading: 90 })).toBe(90);
    expect(computeCompassHeading({ webkitCompassHeading: 0 })).toBe(0);
  });

  test("iOS: normalizes out-of-range compass heading into [0,360)", () => {
    expect(computeCompassHeading({ webkitCompassHeading: 370 })).toBe(10);
    expect(computeCompassHeading({ webkitCompassHeading: -10 })).toBe(350);
  });

  test("Android absolute: inverts world-based alpha (counter-clockwise → compass)", () => {
    // MDN: alpha 0=N, 90=W, 180=S, 270=E → compass = (360 - alpha) % 360
    expect(computeCompassHeading({ absolute: true, alpha: 0 })).toBe(0); // North
    expect(computeCompassHeading({ absolute: true, alpha: 90 })).toBe(270); // pointing West
    expect(computeCompassHeading({ absolute: true, alpha: 180 })).toBe(180); // South
    expect(computeCompassHeading({ absolute: true, alpha: 270 })).toBe(90); // pointing East
  });

  test("webkitCompassHeading takes priority over alpha when both present", () => {
    expect(computeCompassHeading({ webkitCompassHeading: 45, absolute: true, alpha: 100 })).toBe(
      45
    );
  });

  test("falls back to alpha when webkitCompassHeading is null/NaN", () => {
    expect(computeCompassHeading({ webkitCompassHeading: null, absolute: true, alpha: 90 })).toBe(
      270
    );
    expect(computeCompassHeading({ webkitCompassHeading: NaN, absolute: true, alpha: 0 })).toBe(0);
  });

  test("returns null for relative (non-absolute) or unusable readings", () => {
    expect(computeCompassHeading({ absolute: false, alpha: 100 })).toBeNull();
    expect(computeCompassHeading({ alpha: 100 })).toBeNull(); // absolute undefined
    expect(computeCompassHeading({})).toBeNull();
    expect(computeCompassHeading({ absolute: true, alpha: null })).toBeNull();
  });
});

describe("angularDelta", () => {
  test("returns 0 for identical headings", () => {
    expect(angularDelta(90, 90)).toBe(0);
  });

  test("handles wraparound as the shortest arc", () => {
    expect(angularDelta(359, 1)).toBe(2);
    expect(angularDelta(1, 359)).toBe(2);
    expect(angularDelta(10, 350)).toBe(20);
  });

  test("caps at 180 (opposite direction)", () => {
    expect(angularDelta(0, 180)).toBe(180);
  });
});
