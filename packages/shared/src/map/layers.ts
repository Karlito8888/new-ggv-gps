/**
 * Paint and layout of the app's own layers, shared by both renderers (maplibre-gl on web,
 * @maplibre/maplibre-react-native on mobile). Plain objects, no maplibre import.
 */

export const ROUTE_OUTLINE_LAYOUT = { "line-cap": "round", "line-join": "round" } as const;
export const ROUTE_OUTLINE_PAINT = {
  "line-color": "#1a56c4",
  "line-width": 8,
  "line-opacity": 0.5,
} as const;

export const ROUTE_LINE_LAYOUT = { "line-cap": "round", "line-join": "round" } as const;
export const ROUTE_LINE_PAINT = { "line-color": "#4285F4", "line-width": 5 } as const;

export const ROUTE_ARROW_LAYOUT = {
  "symbol-placement": "line",
  "symbol-spacing": 100,
  "icon-image": "route-arrow",
  "icon-size": 0.6,
  "icon-allow-overlap": true,
  "icon-rotation-alignment": "map",
} as const;

export const ARRIVAL_ZONE_PAINT = {
  // 15m radius — convert meters to pixels using zoom-dependent expression
  // At latitude ~14.35°, 1px at zoom 20 ≈ 0.15m, so 15m ≈ 100px at z20
  "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 15, 6, 17, 25, 19, 63, 20, 100],
  "circle-color": "rgba(66, 133, 244, 0.15)",
  "circle-stroke-color": "#4285F4",
  "circle-stroke-width": 1,
  "circle-pitch-alignment": "map",
} as const;

// Not `as const`: maplibre's layout types want mutable expression tuples, and both renderers
// spread this object straight into a symbol layer.
export const BLOCK_LABEL_LAYOUT = {
  "text-field": ["get", "name"] as ["get", string],
  "text-size": 14,
  "text-anchor": "center" as const,
  "text-font": ["Noto Sans Regular"],
};
export const BLOCK_LABEL_PAINT = {
  "text-color": "#333",
  "text-halo-color": "#fff",
  "text-halo-width": 1,
} as const;
