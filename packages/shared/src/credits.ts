import { useEffect, useState } from "react";

/** Store listings point here too (`apps/mobile/store/asc/app-info/en-US.json`). */
export const PRIVACY_URL = "https://myggv.com/gps-privacy-policy";
/** The OpenStreetMap credit links here: it names the data licence (ODbL). */
export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";
/** Required by the FOSSGIS routing servers' terms, next to the credit. */
export const OSM_FIX_URL = "https://www.openstreetmap.org/fixthemap";

/**
 * The credits bubble above the navigation strip. It opens by itself when navigation starts and
 * folds into the ⓘ after five seconds: the OpenStreetMap attribution guideline allows an
 * attribution to collapse "automatically after five seconds" as long as an ⓘ brings it back.
 * `"manual"` is the ⓘ tap, which also shows the privacy link and stays until tapped again.
 */
export function useCreditsBubble() {
  const [open, setOpen] = useState<"auto" | "manual" | null>("auto");
  useEffect(() => {
    const timer = setTimeout(() => setOpen((o) => (o === "auto" ? null : o)), 5000);
    return () => clearTimeout(timer);
  }, []);
  const toggle = () => setOpen((o) => (o ? null : "manual"));
  return { open, toggle };
}
