import { STORE_URL } from "@ggv/shared";

/** The store of a phone or tablet that can install the native app; null on a desktop. */
export function storeUrlFor(userAgent: string, maxTouchPoints: number): string | null {
  // iPadOS reports a Mac user agent; only the touch screen tells it apart from a Mac.
  if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) {
    return STORE_URL.ios;
  }
  // shortcut: Chrome on an Android tablet, or in "desktop site" mode, sends a desktop user agent and gets no offer; read navigator.userAgentData.platform if tablets matter.
  if (/Android/.test(userAgent)) return STORE_URL.android;
  return null;
}
