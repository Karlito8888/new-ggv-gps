/**
 * Every icon of the app as 24x24 stroked paths (Feather / Lucide geometry), drawn by both
 * renderers: web as `<svg><path/></svg>`, mobile through react-native-svg. Paths only, so a
 * renderer needs one element type. Stroke: currentColor, width 2, round caps and joins.
 */
export const ICONS = {
  gps: ["M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0", "M12 2v4m0 12v4M2 12h4m12 0h4"],
  pin: ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z", "M15 10a3 3 0 1 1-6 0a3 3 0 1 1 6 0"],
  navigate: ["M3 11 22 2 13 21 11 13z"],
  arrived: ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "M22 4 12 14.01l-3-3"],
  exit: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  car: [
    "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2",
    "M9 17a2 2 0 1 1-4 0a2 2 0 1 1 4 0",
    "M9 17h6",
    "M19 17a2 2 0 1 1-4 0a2 2 0 1 1 4 0",
  ],
  chevron: ["M6 9l6 6 6-6"],
  alert: [
    "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    "M12 9v4",
    "M12 17h.01",
  ],
  check: ["M20 6 9 17l-5-5"],
  close: ["M18 6 6 18", "M6 6l12 12"],
  spinner: ["M21 12a9 9 0 1 1-6.22-8.56"],
  // Turn arrows, one per OSRM modifier (TURN_ICONS), plus the roundabout.
  straight: ["M12 19V5", "M5 12l7-7 7 7"],
  left: ["M19 12H5", "M12 19l-7-7 7-7"],
  right: ["M5 12h14", "M12 5l7 7-7 7"],
  slightLeft: ["M17 17 7 7", "M7 17V7h10"],
  slightRight: ["M7 17 17 7", "M7 7h10v10"],
  sharpLeft: ["M17 7 7 17", "M17 17H7V7"],
  sharpRight: ["M7 7l10 10", "M17 7v10H7"],
  uturn: ["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
  roundabout: ["M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8", "M21 3v5h-5"],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;
