import { describe, expect, test } from "vitest";
import { getDistance, projectPointOnLine, flattenCoordinates } from "../lib/geo";

// Known coordinate: Garden Grove Village center
const GGV_CENTER: [number, number] = [120.9513, 14.3479]; // [lng, lat]

describe("getDistance", () => {
  test("returns 0 for identical coordinates", () => {
    expect(getDistance(14.3479, 120.9513, 14.3479, 120.9513)).toBe(0);
  });

  test("calculates short distance accurately (~100m)", () => {
    // ~111m per 0.001° latitude at equator
    const dist = getDistance(14.3479, 120.9513, 14.3489, 120.9513);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(115);
  });

  test("calculates longitude distance correctly (shorter near equator)", () => {
    // At ~14.35°N, 1° longitude ≈ 107.5 km
    const dist = getDistance(14.3479, 120.9513, 14.3479, 120.9523);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(115);
  });

  test("calculates diagonal distance", () => {
    const dist = getDistance(14.3479, 120.9513, 14.3489, 120.9523);
    expect(dist).toBeGreaterThan(130);
    expect(dist).toBeLessThan(165);
  });

  test("is symmetric (A→B === B→A)", () => {
    const ab = getDistance(14.3479, 120.9513, 14.3489, 120.9523);
    const ba = getDistance(14.3489, 120.9523, 14.3479, 120.9513);
    expect(ab).toBeCloseTo(ba, 10);
  });

  test("known distance: Paris → London ≈ 343 km", () => {
    // Paris: 48.8566°N, 2.3522°E  London: 51.5074°N, -0.1278°W
    const dist = getDistance(48.8566, 2.3522, 51.5074, -0.1278);
    expect(dist).toBeGreaterThan(340_000);
    expect(dist).toBeLessThan(350_000);
  });
});

describe("projectPointOnLine", () => {
  test("returns point itself for degenerate line (< 2 coords)", () => {
    const result = projectPointOnLine(120.9513, 14.3479, [[120.95, 14.35]]);
    expect(result.deviationDistance).toBe(0);
    expect(result.segmentIndex).toBe(0);
  });

  test("projects onto a horizontal line correctly", () => {
    // Horizontal line at lat 14.35
    const line: [number, number][] = [
      [120.95, 14.35],
      [120.96, 14.35],
    ];
    // Point directly on the line
    const result = projectPointOnLine(120.955, 14.35, line);
    expect(result.deviationDistance).toBeLessThan(1); // < 1m
    expect(result.progressOnSegment).toBeCloseTo(0.5, 2);
  });

  test("projects perpendicular offset correctly", () => {
    // Horizontal line at lat 14.35
    const line: [number, number][] = [
      [120.95, 14.35],
      [120.96, 14.35],
    ];
    // Point 0.001° north of the line (~111m)
    const result = projectPointOnLine(120.955, 14.351, line);
    expect(result.deviationDistance).toBeGreaterThan(100);
    expect(result.deviationDistance).toBeLessThan(115);
    expect(result.progressOnSegment).toBeCloseTo(0.5, 2);
  });

  test("clamps to start of segment when point is behind", () => {
    const line: [number, number][] = [
      [120.95, 14.35],
      [120.96, 14.35],
    ];
    const result = projectPointOnLine(120.94, 14.35, line);
    expect(result.progressOnSegment).toBe(0);
  });

  test("clamps to end of segment when point is beyond", () => {
    const line: [number, number][] = [
      [120.95, 14.35],
      [120.96, 14.35],
    ];
    const result = projectPointOnLine(120.97, 14.35, line);
    expect(result.progressOnSegment).toBe(1);
  });

  test("finds closest segment on multi-segment line", () => {
    // L-shaped path: right then up
    const line: [number, number][] = [
      [120.95, 14.35],
      [120.96, 14.35],
      [120.96, 14.36],
    ];
    // Point near the corner — closer to vertical segment (index 1)
    const result = projectPointOnLine(120.9605, 14.351, line);
    expect(result.segmentIndex).toBe(1);
  });
});

describe("flattenCoordinates", () => {
  test("flattens LineString coordinates", () => {
    const coords: [number, number][] = [
      [120.95, 14.35],
      [120.96, 14.36],
    ];
    const result = flattenCoordinates({
      type: "LineString",
      coordinates: coords,
    });
    expect(result).toEqual(coords);
  });

  test("flattens MultiLineString coordinates", () => {
    const multiCoords: [number, number][][] = [
      [
        [120.95, 14.35],
        [120.96, 14.36],
      ],
      [
        [120.97, 14.37],
        [120.98, 14.38],
      ],
    ];
    const result = flattenCoordinates({
      type: "MultiLineString",
      coordinates: multiCoords,
    });
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual([120.95, 14.35]);
    expect(result[3]).toEqual([120.98, 14.38]);
  });

  test("handles single-segment MultiLineString", () => {
    const result = flattenCoordinates({
      type: "MultiLineString",
      coordinates: [
        [
          [120.95, 14.35],
          [120.96, 14.36],
        ],
      ],
    });
    expect(result).toHaveLength(2);
  });
});
