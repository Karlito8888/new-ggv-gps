import { Source, Layer } from "react-map-gl/maplibre";
import { publicPois } from "../data/public-pois";
import { blocks } from "../data/blocks";

/**
 * Composant pour afficher les marqueurs avec SymbolLayer MapLibre natif
 * Remplace les composants React Marker pour de meilleures performances
 */
export function MapSymbolLayers({ destination, getPolygonCenter }) {
  // Préparer les données GeoJSON pour les POI
  const poiFeatures = publicPois.map((poi, index) => ({
    type: "Feature",
    id: `poi-${index}`,
    geometry: {
      type: "Point",
      coordinates: poi.coords
    },
    properties: {
      name: poi.name,
      icon: poi.icon,
      type: "poi",
      category: poi.category || "amenity"
    }
  }));

  // Préparer les données pour les étiquettes de blocs
  const blockLabelFeatures = blocks
    .filter(block => block.name && block.color !== "#19744B")
    .map((block, index) => {
      const center = getPolygonCenter(block.coords);
      return {
        type: "Feature",
        id: `block-${index}`,
        geometry: {
          type: "Point",
          coordinates: center
        },
        properties: {
          name: block.name,
          type: "block-label",
          color: block.color
        }
      };
    });

  // Préparer la destination
  const destinationFeature = destination?.coordinates?.length === 2 ? {
    type: "Feature",
    id: "destination",
    geometry: {
      type: "Point",
      coordinates: destination.coordinates
    },
    properties: {
      name: destination.address || "Destination",
      type: "destination"
    }
  } : null;

  return (
    <>
      {/* Couche pour les POI */}
      <Source 
        id="poi-source" 
        type="geojson" 
        data={{
          type: "FeatureCollection",
          features: poiFeatures
        }}
      >
        <Layer
          id="poi-symbols"
          type="symbol"
          layout={{
            "icon-image": "marker-15", // Icône par défaut MapLibre
            "icon-size": 1.2,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "visibility": "visible"
          }}
          paint={{
            "icon-opacity": 0.9,
            "icon-color": "#3b82f6", // Couleur bleue pour les POI
            "icon-translate": ["literal", [0, -10]]
          }}
        />
        {/* Labels désactivés temporairement pour éviter les erreurs de glyphs */}
        {/* <Layer
          id="poi-labels"
          type="symbol"
          layout={{
            "text-field": ["get", "name"],
            "text-font": ["literal", ["Open Sans Regular", "Arial Unicode MS Regular"]],
            "text-size": 12,
            "text-anchor": "top",
            "text-offset": ["literal", [0, 1.5]],
            "text-allow-overlap": false,
            "text-ignore-placement": false,
            "visibility": "visible"
          }}
          paint={{
            "text-color": "#374151",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
            "text-opacity": ["step", ["zoom"], 0, 15, 1]
          }}
          minzoom={15}
        /> */}
      </Source>

      {/* Couche pour les étiquettes de blocs */}
      <Source 
        id="block-labels-source" 
        type="geojson" 
        data={{
          type: "FeatureCollection",
          features: blockLabelFeatures
        }}
      >
        {/* Labels de blocs désactivés temporairement */}
        {/* <Layer
          id="block-labels"
          type="symbol"
          layout={{
            "text-field": ["get", "name"],
            "text-font": ["literal", ["Open Sans Bold", "Arial Unicode MS Bold"]],
            "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 16, 14],
            "text-anchor": "center",
            "text-allow-overlap": false,
            "text-ignore-placement": false,
            "visibility": "visible"
          }}
          paint={{
            "text-color": ["get", "color"],
            "text-halo-color": "#ffffff",
            "text-halo-width": 3,
            "text-opacity": 0.9
          }}
        /> */}
      </Source>

      {/* Couche pour la destination */}
      {destinationFeature && (
        <Source 
          id="destination-source" 
          type="geojson" 
          data={{
            type: "FeatureCollection",
            features: [destinationFeature]
          }}
        >
          <Layer
            id="destination-symbol"
            type="symbol"
            layout={{
              "icon-image": "marker-15",
              "icon-size": 2,
              "icon-anchor": "bottom",
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "visibility": "visible"
            }}
            paint={{
              "icon-color": "#ef4444",
              "icon-opacity": 1
            }}
          />
        </Source>
      )}
    </>
  );
}