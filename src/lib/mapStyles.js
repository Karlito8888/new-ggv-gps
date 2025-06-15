// MapLibre GL JS style configurations
// Centralized map styles for OSM and Satellite layers

/**
 * OpenStreetMap raster style configuration
 */
export const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "base-layer",
      type: "raster",
      source: "osm",
    },
  ],
};

/**
 * Satellite imagery style configuration
 */
export const SATELLITE_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "© Esri",
    },
  },
  layers: [
    {
      id: "base-layer",
      type: "raster",
      source: "satellite",
    },
  ],
};

/**
 * Get map style based on type
 * @param {string} mapType - 'osm' or 'satellite'
 * @returns {Object} MapLibre style object
 */
export function getMapStyle(mapType) {
  switch (mapType) {
    case 'satellite':
      return SATELLITE_STYLE;
    case 'osm':
    default:
      return OSM_STYLE;
  }
}

/**
 * Route styling configurations for MapLibre layers
 */
export const ROUTE_STYLES = {
  // Main route (blue)
  route: {
    "line-color": "#3b82f6",
    "line-width": 4,
    "line-opacity": 0.8,
  },
  // Traveled route (yellow dashed)
  traveled: {
    "line-color": "#f3c549",
    "line-width": 3,
    "line-opacity": 1,
    "line-dasharray": [2, 2],
  },
};

/**
 * Block styling configurations for vector layers
 */
export const BLOCK_STYLES = {
  fill: {
    "fill-color": ["get", "color"],
    "fill-opacity": 0.8,
    "fill-outline-color": "#999",
  },
  border: {
    "line-color": "#999",
    "line-width": 1,
  },
};