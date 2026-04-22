import { describe, expect, test } from "vitest";
import { parseManeuver } from "../lib/routing";

function maneuver(type: string, modifier?: string, location: [number, number] = [0, 0]) {
  return { type, modifier, location };
}

describe("parseManeuver", () => {
  test("returns null for 'depart' (start point, not an instruction)", () => {
    expect(parseManeuver(maneuver("depart", "west"), 100)).toBeNull();
  });

  test("parses 'arrive' as arrival step", () => {
    const result = parseManeuver(maneuver("arrive"), 0);
    expect(result).toEqual({
      type: "arrive",
      icon: "📍",
      modifier: null,
      distance: 0,
      isSignificant: true,
    });
  });

  test("parses roundabout", () => {
    const result = parseManeuver(maneuver("roundabout"), 50);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("roundabout");
    expect(result!.icon).toBe("⟳");
    expect(result!.isSignificant).toBe(true);
  });

  test("parses rotary as roundabout", () => {
    const result = parseManeuver(maneuver("rotary"), 50);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("roundabout");
  });

  test("parses left turn with modifier", () => {
    const result = parseManeuver(maneuver("turn", "left"), 30);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("left");
    expect(result!.icon).toBe("←");
    expect(result!.isSignificant).toBe(true);
  });

  test("parses right turn", () => {
    const result = parseManeuver(maneuver("turn", "right"), 25);
    expect(result).not.toBeNull();
    expect(result!.icon).toBe("→");
  });

  test("parses slight right", () => {
    const result = parseManeuver(maneuver("turn", "slight right"), 20);
    expect(result).not.toBeNull();
    expect(result!.icon).toBe("↗");
  });

  test("parses sharp left", () => {
    const result = parseManeuver(maneuver("turn", "sharp left"), 15);
    expect(result).not.toBeNull();
    expect(result!.icon).toBe("↰");
  });

  test("parses uturn", () => {
    const result = parseManeuver(maneuver("turn", "uturn"), 10);
    expect(result).not.toBeNull();
    expect(result!.icon).toBe("↩");
  });

  test("straight modifier is not significant", () => {
    const result = parseManeuver(maneuver("continue", "straight"), 100);
    expect(result).not.toBeNull();
    expect(result!.icon).toBe("↑");
    expect(result!.isSignificant).toBe(false);
  });

  test("turn without modifier defaults to straight", () => {
    const result = parseManeuver(maneuver("turn"), 100);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("straight");
    expect(result!.icon).toBe("↑");
  });

  test("parses 'end of road' with modifier", () => {
    const result = parseManeuver(maneuver("end of road", "right"), 30);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("right");
    expect(result!.icon).toBe("→");
  });

  test("parses 'fork' with modifier", () => {
    const result = parseManeuver(maneuver("fork", "slight left"), 40);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("slight left");
  });

  test("parses 'new name' with modifier", () => {
    const result = parseManeuver(maneuver("new name", "slight right"), 50);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("slight right");
  });

  test("unknown type defaults to straight", () => {
    const result = parseManeuver(maneuver("notification"), 100);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("straight");
    expect(result!.icon).toBe("↑");
    expect(result!.isSignificant).toBe(false);
  });

  test("preserves distance value", () => {
    const result = parseManeuver(maneuver("turn", "left"), 42.5);
    expect(result).not.toBeNull();
    expect(result!.distance).toBe(42.5);
  });
});
