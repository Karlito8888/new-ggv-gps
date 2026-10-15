import { describe, expect, test } from "vite-plus/test";
import { isBelowVersion } from "../version";

describe("isBelowVersion", () => {
  test("a version equal to the floor passes", () => {
    expect(isBelowVersion("1.0.0", "1.0.0")).toBe(false);
  });

  test("a lower patch, minor or major is below", () => {
    expect(isBelowVersion("1.0.0", "1.0.1")).toBe(true);
    expect(isBelowVersion("1.9.9", "1.10.0")).toBe(true);
    expect(isBelowVersion("1.9.9", "2.0.0")).toBe(true);
  });

  test("segments compare as numbers, not text", () => {
    expect(isBelowVersion("1.10.0", "1.9.0")).toBe(false);
  });

  test("a missing segment counts as 0", () => {
    expect(isBelowVersion("1.0", "1.0.0")).toBe(false);
    expect(isBelowVersion("1.0", "1.0.1")).toBe(true);
  });

  test("a malformed value never blocks", () => {
    expect(isBelowVersion("1.0.0", "2.x")).toBe(false);
    expect(isBelowVersion("", "2.0.0")).toBe(false);
  });
});
