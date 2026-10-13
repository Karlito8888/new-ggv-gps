/**
 * Map-drawing half of routing for the web renderer (maplibre-gl). The pure half — fetch,
 * parse, constants — lives in @ggv/shared.
 */

import type { Map as MaplibreMap, GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import {
  ROUTE_OUTLINE_LAYOUT,
  ROUTE_OUTLINE_PAINT,
  ROUTE_LINE_LAYOUT,
  ROUTE_LINE_PAINT,
  ROUTE_ARROW_LAYOUT,
  type RouteGeometry,
} from "@ggv/shared";

const ROUTE_SOURCE = "route";

/** Nothing to draw. The source always holds valid GeoJSON, so no layer is ever added twice. */
const EMPTY_ROUTE: FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * Create a canvas-drawn chevron arrow for route direction indicators.
 * White right-pointing triangle — MapLibre auto-rotates it along the line.
 */
function createRouteArrowImage(): ImageData {
  const size = 12;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  // Right-pointing chevron
  ctx.moveTo(2, 1);
  ctx.lineTo(10, 6);
  ctx.lineTo(2, 11);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

/**
 * Create the route source and its three layers once, from the map's `load` handler.
 *
 * They live for the whole session holding an empty FeatureCollection, so showing a route is
 * only ever `setData` — which has no style-readiness check at all. `addSource`/`addLayer` do:
 * both call MapLibre's `_checkLoaded()`, which throws "Style is not done loading.". Creating
 * the layers on demand, from inside a promise or an effect, put that throw on the path that
 * draws the line, and the state was already set — so the pill, the distance and the turn
 * instructions appeared without a blue line.
 *
 * Retrying such a failure on the map's `idle` event cannot work while navigating: `idle`
 * requires "no camera transitions in progress" (maplibre-gl 5.24 typings), and the course-up
 * camera issues a 1 s `easeTo` on every GPS fix. Removing the failure beats retrying it.
 */
export function addRouteLayers(map: MaplibreMap): void {
  if (map.getSource(ROUTE_SOURCE)) return;

  map.addSource(ROUTE_SOURCE, { type: "geojson", data: EMPTY_ROUTE });

  // Shadow/outline layer (below route line)
  map.addLayer({
    id: "route-outline",
    type: "line",
    source: ROUTE_SOURCE,
    layout: { ...ROUTE_OUTLINE_LAYOUT },
    paint: { ...ROUTE_OUTLINE_PAINT },
  });

  // Main route line
  map.addLayer({
    id: "route-line",
    type: "line",
    source: ROUTE_SOURCE,
    layout: { ...ROUTE_LINE_LAYOUT },
    paint: { ...ROUTE_LINE_PAINT },
  });

  // Before the layer that references it: a missing icon fires `styleimagemissing`, whose
  // handler installs a 1×1 transparent placeholder that would then win forever.
  if (!map.hasImage("route-arrow")) {
    map.addImage("route-arrow", createRouteArrowImage(), { sdf: false });
  }

  // Directional chevrons (above route line)
  map.addLayer({
    id: "route-arrows",
    type: "symbol",
    source: ROUTE_SOURCE,
    layout: { ...ROUTE_ARROW_LAYOUT },
  });
}

/** Show a route, or erase it with `null`. No-op before the style has loaded its layers. */
export function setRouteData(map: MaplibreMap, geometry: RouteGeometry | null): void {
  const source = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
  source?.setData(geometry ?? EMPTY_ROUTE);
}
