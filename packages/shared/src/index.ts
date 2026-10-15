/**
 * The public surface of @ggv/shared: what a renderer (web or mobile) consumes. Thresholds,
 * OSRM hosts and parsers stay internal; the tests import them from their files. Named on
 * purpose: a renderer reaching for something not listed here fails to compile, which is the
 * point.
 */
export { blockLabelsGeoJSON } from "./blocks";
export { COPY, inline } from "./copy";
export {
  ARRIVAL_ZONE_PAINT,
  BLOCK_LABEL_LAYOUT,
  BLOCK_LABEL_PAINT,
  ROUTE_ARROW_LAYOUT,
  ROUTE_LINE_LAYOUT,
  ROUTE_LINE_PAINT,
  ROUTE_OUTLINE_LAYOUT,
  ROUTE_OUTLINE_PAINT,
} from "./map/layers";
export type { RouteGeometry, RouteSourceType, RouteStep } from "./routing";
export { TILESET_FILE } from "./tileset";
export { startTrace, trace, type TraceEvent } from "./trace";
export { currentTurn, formatDistance, remainingAlongRoute, turnLabel } from "./turnGuidance";
export type { Destination, UserLocation } from "./types";
export { useCourseUpCamera, type CameraDriver } from "./useCourseUpCamera";
export { hasCoords, useDestinationChoice, type LotData } from "./useDestinationChoice";
export { useNavigationFlow } from "./useNavigationFlow";
export { useRouting } from "./useRouting";
export { MAP_INITIAL_ZOOM, VILLAGE_BOUNDS, VILLAGE_CENTER } from "./village";
export { isBelowVersion } from "./version";
