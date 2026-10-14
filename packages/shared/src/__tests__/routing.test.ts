import { describe, expect, test } from "vitest";
import { parseManeuver } from "../routing";

function maneuver(type: string, modifier?: string, location: [number, number] = [0, 0]) {
  return { type, modifier, location };
}

describe("parseManeuver", () => {
  test("returns null for 'depart' (start point, not an instruction)", () => {
    expect(parseManeuver(maneuver("depart", "west"))).toBeNull();
  });

  test("parses 'arrive' as arrival step", () => {
    const result = parseManeuver(maneuver("arrive"));
    expect(result).toEqual({
      type: "arrive",
      icon: "📍",
      modifier: null,
      isSignificant: true,
    });
  });

  test("parses roundabout", () => {
    const result = parseManeuver(maneuver("roundabout"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("roundabout");
    expect(result!.icon).toBe("⟳");
    expect(result!.isSignificant).toBe(true);
  });

  test("parses rotary as roundabout", () => {
    const result = parseManeuver(maneuver("rotary"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("roundabout");
  });

  test("parses left turn with modifier", () => {
    const result = parseManeuver(maneuver("turn", "left"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("left");
    expect(result!.icon).toBe("←");
    expect(result!.isSignificant).toBe(true);
  });

  test("parses right turn", () => {
    const result = parseManeuver(maneuver("turn", "right"));
    expect(result).not.toBeNull();
    expect(result!.icon).toBe("→");
  });

  test("parses slight right", () => {
    const result = parseManeuver(maneuver("turn", "slight right"));
    expect(result).not.toBeNull();
    expect(result!.icon).toBe("↗");
  });

  test("parses sharp left", () => {
    const result = parseManeuver(maneuver("turn", "sharp left"));
    expect(result).not.toBeNull();
    expect(result!.icon).toBe("↰");
  });

  test("parses uturn", () => {
    const result = parseManeuver(maneuver("turn", "uturn"));
    expect(result).not.toBeNull();
    expect(result!.icon).toBe("↩");
  });

  test("straight modifier is not significant", () => {
    const result = parseManeuver(maneuver("continue", "straight"));
    expect(result).not.toBeNull();
    expect(result!.icon).toBe("↑");
    expect(result!.isSignificant).toBe(false);
  });

  test("turn without modifier defaults to straight", () => {
    const result = parseManeuver(maneuver("turn"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("straight");
    expect(result!.icon).toBe("↑");
  });

  test("parses 'end of road' with modifier", () => {
    const result = parseManeuver(maneuver("end of road", "right"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("right");
    expect(result!.icon).toBe("→");
  });

  test("parses 'fork' with modifier", () => {
    const result = parseManeuver(maneuver("fork", "slight left"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("slight left");
  });

  test("parses 'new name' with modifier", () => {
    const result = parseManeuver(maneuver("new name", "slight right"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("slight right");
  });

  test("unknown type defaults to straight", () => {
    const result = parseManeuver(maneuver("notification"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("straight");
    expect(result!.icon).toBe("↑");
    expect(result!.isSignificant).toBe(false);
  });
});
