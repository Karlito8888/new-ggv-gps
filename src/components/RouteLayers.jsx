import { Source, Layer } from "react-map-gl/maplibre";

/**
 * Composant pour afficher les couches d'itinéraire (route principale et trajet parcouru)
 */
export function RouteLayers({ route, traveledRoute, navigationState }) {
  return (
    <>
      {/* Display remaining route with advanced styles */}
      {route && (
        <>
          {console.log("🗺️ Route display:", route)}
          <Source id="route" type="geojson" data={route}>
            {/* Shadow layer for depth effect */}
            <Layer
              id="route-line-shadow"
              type="line"
              paint={{
                "line-color": "#000000",
                "line-width": [
                  "interpolate",
                  ["exponential", 1.5],
                  ["zoom"],
                  10,
                  8, // Zoom 10: 8px (ombre)
                  15,
                  10, // Zoom 15: 10px
                  20,
                  16, // Zoom 20: 16px
                ],
                "line-opacity": 0.2,
                "line-blur": 2,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
            {/* Background layer (outline) for better contrast */}
            <Layer
              id="route-line-casing"
              type="line"
              paint={{
                "line-color": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  "#1e40af", // Dark blue at small zooms
                  15,
                  "#1d4ed8", // More intense blue
                  20,
                  "#1e3a8a", // Very dark blue at high zooms
                ],
                "line-width": [
                  "interpolate",
                  ["exponential", 1.5],
                  ["zoom"],
                  10,
                  6, // Zoom 10: 6px (outline)
                  15,
                  8, // Zoom 15: 8px
                  20,
                  14, // Zoom 20: 14px
                ],
                "line-opacity": 0.8,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
            {/* Main route layer with smooth transitions */}
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  navigationState === "navigating" ? "#3b82f6" : "#60a5fa", // Plus vif en navigation
                  15,
                  navigationState === "navigating" ? "#2563eb" : "#3b82f6",
                  20,
                  navigationState === "navigating" ? "#1d4ed8" : "#2563eb",
                ],
                "line-width": [
                  "interpolate",
                  ["exponential", 1.5],
                  ["zoom"],
                  10,
                  navigationState === "navigating" ? 4 : 3, // Thicker during navigation
                  15,
                  navigationState === "navigating" ? 6 : 5,
                  20,
                  navigationState === "navigating" ? 12 : 10,
                ],
                "line-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  navigationState === "navigating" ? 0.9 : 0.8,
                  15,
                  navigationState === "navigating" ? 0.95 : 0.9,
                  20,
                  1.0,
                ],
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
            {/* Directional arrows for route - TEMPORARILY DISABLED */}
          </Source>
        </>
      )}

      {/* Display traveled portion with advanced styles */}
      {traveledRoute && (
        <Source id="traveled-route" type="geojson" data={traveledRoute}>
          {/* Shadow layer for traveled route */}
          <Layer
            id="traveled-route-line-shadow"
            type="line"
            paint={{
              "line-color": "#000000",
              "line-width": [
                "interpolate",
                ["exponential", 1.5],
                ["zoom"],
                10,
                7, // Zoom 10: 7px (ombre)
                15,
                9, // Zoom 15: 9px
                20,
                14, // Zoom 20: 14px
              ],
              "line-opacity": 0.15,
              "line-blur": 1.5,
              "line-dasharray": [3, 3],
            }}
            layout={{
              "line-cap": "round",
              "line-join": "round",
            }}
          />
          {/* Background layer for traveled route */}
          <Layer
            id="traveled-route-line-casing"
            type="line"
            paint={{
              "line-color": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                "#d97706", // Dark orange
                15,
                "#c2410c", // More intense orange
                20,
                "#9a3412", // Very dark orange
              ],
              "line-width": [
                "interpolate",
                ["exponential", 1.5],
                ["zoom"],
                10,
                5, // Zoom 10: 5px (outline)
                15,
                7, // Zoom 15: 7px
                20,
                12, // Zoom 20: 12px
              ],
              "line-opacity": 0.8,
              "line-dasharray": [3, 3],
            }}
            layout={{
              "line-cap": "round",
              "line-join": "round",
            }}
          />
          {/* Main traveled route layer with transitions */}
          <Layer
            id="traveled-route-line"
            type="line"
            paint={{
              "line-color": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                "#f59e0b", // Standard orange
                15,
                "#f97316", // More vivid orange
                20,
                "#ea580c", // Deep orange
              ],
              "line-width": [
                "interpolate",
                ["exponential", 1.5],
                ["zoom"],
                10,
                2.5, // Zoom 10: 2.5px
                15,
                4, // Zoom 15: 4px
                20,
                8, // Zoom 20: 8px
              ],
              "line-opacity": 1,
              "line-dasharray": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                ["literal", [2, 2]], // Short dashes at small zooms
                15,
                ["literal", [3, 2]], // Medium dashes
                20,
                ["literal", [4, 3]], // Long dashes at high zooms
              ],
            }}
            layout={{
              "line-cap": "round",
              "line-join": "round",
            }}
          />
          {/* Directional arrows for traveled route - TEMPORARILY DISABLED */}
        </Source>
      )}
    </>
  );
}