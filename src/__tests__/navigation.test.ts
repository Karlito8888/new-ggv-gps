import { describe, expect, test } from "vitest";
import { useNavigation } from "../hooks/useNavigation";

/**
 * useNavigation is a pure computation hook (no effects, no state).
 * It can be called directly without renderHook since it's a pure function.
 */
describe("useNavigation", () => {
  test("returns defaults when userLocation is null", () => {
    const result = useNavigation(null, {
      name: "Test",
      coordinates: [120.9513, 14.3479],
    });
    expect(result.distanceRemaining).toBe(0);
    expect(result.hasArrived).toBe(false);
    expect(result.arrivedAt).toBeNull();
  });

  test("returns defaults when destination is null", () => {
    const result = useNavigation({ latitude: 14.3479, longitude: 120.9513 }, null);
    expect(result.distanceRemaining).toBe(0);
    expect(result.hasArrived).toBe(false);
    expect(result.arrivedAt).toBeNull();
  });

  test("returns defaults when both are null", () => {
    const result = useNavigation(null, null);
    expect(result).toEqual({
      distanceRemaining: 0,
      hasArrived: false,
      arrivedAt: null,
    });
  });

  test("calculates distance to destination", () => {
    // User ~100m north of destination
    const result = useNavigation(
      { latitude: 14.3489, longitude: 120.9513 },
      { name: "Dest", coordinates: [120.9513, 14.3479] }
    );
    expect(result.distanceRemaining).toBeGreaterThan(100);
    expect(result.distanceRemaining).toBeLessThan(120);
  });

  test("detects arrival when within 15m threshold", () => {
    // Destination at exact user location
    const result = useNavigation(
      { latitude: 14.3479, longitude: 120.9513 },
      { name: "Dest", coordinates: [120.9513, 14.3479] }
    );
    expect(result.hasArrived).toBe(true);
    expect(result.arrivedAt).toBe("120.9513,14.3479");
  });

  test("detects arrival when within threshold (~10m)", () => {
    // ~10m north of destination (0.0001° ≈ 11m)
    const result = useNavigation(
      { latitude: 14.348, longitude: 120.9513 },
      { name: "Dest", coordinates: [120.9513, 14.3479] }
    );
    expect(result.distanceRemaining).toBeGreaterThan(0);
    expect(result.distanceRemaining).toBeLessThan(15);
    expect(result.hasArrived).toBe(true);
  });

  test("does not arrive when beyond 15m threshold", () => {
    // ~22m north of destination (0.0002° ≈ 22m)
    const result = useNavigation(
      { latitude: 14.3481, longitude: 120.9513 },
      { name: "Dest", coordinates: [120.9513, 14.3479] }
    );
    expect(result.hasArrived).toBe(false);
    expect(result.arrivedAt).toBeNull();
  });

  test("arrivedAt contains destination coordinates as string", () => {
    const result = useNavigation(
      { latitude: 14.3479, longitude: 120.9513 },
      { name: "Dest", coordinates: [120.95, 14.35] }
    );
    // Not arrived (too far), so arrivedAt should be null
    expect(result.arrivedAt).toBeNull();

    // Now arrive at destination
    const arrived = useNavigation(
      { latitude: 14.35, longitude: 120.95 },
      { name: "Dest", coordinates: [120.95, 14.35] }
    );
    expect(arrived.arrivedAt).toBe("120.95,14.35");
  });
});
