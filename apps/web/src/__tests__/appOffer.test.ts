import { describe, expect, test } from "vite-plus/test";
import { STORE_URL } from "@ggv/shared";
import { storeUrlFor } from "../lib/appOffer";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
// Also what iPadOS Safari sends.
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

describe("storeUrlFor", () => {
  test("an iPhone gets the App Store", () => {
    expect(storeUrlFor(IPHONE, 5)).toBe(STORE_URL.ios);
  });

  test("an iPad reporting a Mac user agent gets the App Store", () => {
    expect(storeUrlFor(MAC, 5)).toBe(STORE_URL.ios);
  });

  test("an Android phone gets Google Play", () => {
    expect(storeUrlFor(ANDROID, 5)).toBe(STORE_URL.android);
  });

  test("a desktop gets no offer", () => {
    expect(storeUrlFor(MAC, 0)).toBeNull();
    expect(storeUrlFor(WINDOWS, 0)).toBeNull();
  });
});
