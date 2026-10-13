import { describe, expect, test, vi } from "vitest";
import { setRouteData } from "../lib/routeLayers";
import type { Map as MaplibreMap } from "maplibre-gl";

describe("setRouteData", () => {
  const line = { type: "LineString" as const, coordinates: [[0, 0] as [number, number]] };

  function fakeMap(source: unknown) {
    return { getSource: () => source } as unknown as MaplibreMap;
  }

  test("hands the geometry straight to the existing source", () => {
    const setData = vi.fn();
    setRouteData(fakeMap({ setData }), line);
    expect(setData).toHaveBeenCalledWith(line);
  });

  test("clears with an empty FeatureCollection, never by removing the layers", () => {
    const setData = vi.fn();
    setRouteData(fakeMap({ setData }), null);
    expect(setData).toHaveBeenCalledWith({ type: "FeatureCollection", features: [] });
  });

  test("is a no-op before the style created the source", () => {
    expect(() => setRouteData(fakeMap(undefined), line)).not.toThrow();
  });
});
