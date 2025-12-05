import { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { blocks } from "../data/blocks";

/**
 * useMapSetup Hook
 *
 * Initializes MapLibre GL JS map with GPS tracking following official documentation:
 * - https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/
 * - https://maplibre.org/maplibre-gl-js/docs/API/classes/GeolocateControl/
 *
 * @param {React.RefObject} containerRef - Ref to DOM element for map container
 * @param {Object} options - Map initialization options
 * @param {[number, number]} options.center - Initial center [lng, lat]
 * @param {number} options.zoom - Initial zoom level
 * @param {number} options.pitch - Initial pitch (tilt) in degrees
 * @param {number} options.bearing - Initial bearing (rotation) in degrees
 *
 * @returns {Object} Hook return values
 * @returns {maplibregl.Map|null} map - MapLibre map instance
 * @returns {Object|null} userLocation - GPS location {latitude, longitude, accuracy, heading}
 * @returns {boolean} isMapReady - Whether map is loaded and ready
 * @returns {Function} setMapStyle - Function to change map style ('osm' | 'satellite')
 */
export function useMapSetup(containerRef, options = {}) {
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState("osm");
  const geolocateRef = useRef(null);

  // Map style URLs
  const getMapStyleUrl = (style) => {
    switch (style) {
      case "satellite":
        return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      case "osm":
      default:
        return "https://tiles.openfreemap.org/styles/liberty";
    }
  };

  // Initialize map on mount (per official MapLibre docs)
  useEffect(() => {
    if (!containerRef.current) return;

    // Create map instance with official constructor parameters
    // https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#constructor
    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleUrl("osm"),
      center: options.center || [120.95134859887523, 14.347872973134175], // Village center
      zoom: options.zoom || 15,
      pitch: options.pitch || 0,
      bearing: options.bearing || 0,
    });

    // Wait for map to load before adding sources/layers
    // https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#load
    mapInstance.on("load", () => {
      // Convert blocks array to GeoJSON FeatureCollection
      const blocksGeoJSON = {
        type: "FeatureCollection",
        features: blocks.map((block) => ({
          type: "Feature",
          properties: {
            name: block.name,
            color: block.color || "#627BC1",
          },
          geometry: {
            type: "Polygon",
            coordinates: [block.coords],
          },
        })),
      };

      // Add blocks source
      // https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#addsource
      mapInstance.addSource("blocks", {
        type: "geojson",
        data: blocksGeoJSON,
      });

      // Add blocks fill layer
      // https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#addlayer
      mapInstance.addLayer({
        id: "blocks-fill",
        type: "fill",
        source: "blocks",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.2,
        },
      });

      // Add blocks outline layer
      mapInstance.addLayer({
        id: "blocks-outline",
        type: "line",
        source: "blocks",
        paint: {
          "line-color": "#627BC1",
          "line-width": 2,
        },
      });

      // Add GeolocateControl for GPS tracking
      // https://maplibre.org/maplibre-gl-js/docs/API/classes/GeolocateControl/
      const geolocate = new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true, // Request high accuracy GPS
        },
        trackUserLocation: true, // Continuously track location
        showUserHeading: true, // Show heading indicator
      });

      // Add control to map
      mapInstance.addControl(geolocate);
      geolocateRef.current = geolocate;

      // Listen for successful geolocation updates
      // https://maplibre.org/maplibre-gl-js/docs/API/classes/GeolocateControl/#geolocate
      geolocate.on("geolocate", (position) => {
        // Position object follows browser Geolocation API standard
        // https://developer.mozilla.org/en-US/docs/Web/API/Position
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || null,
        });
      });

      // Listen for geolocation errors
      geolocate.on("error", (error) => {
        console.error("Geolocation error:", error);
      });

      setIsMapReady(true);
    });

    setMap(mapInstance);

    // Cleanup function - CRITICAL per official docs
    // https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#remove
    return () => {
      mapInstance.remove();
    };
  }, [containerRef, options]);

  // Handle map style changes
  useEffect(() => {
    if (!map || !isMapReady) return;

    // Use setStyle method per official docs
    // https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#setstyle
    map.setStyle(getMapStyleUrl(mapStyle));

    // Re-add sources and layers after style changes
    map.once("styledata", () => {
      // Check if blocks source already exists
      if (!map.getSource("blocks")) {
        const blocksGeoJSON = {
          type: "FeatureCollection",
          features: blocks.map((block) => ({
            type: "Feature",
            properties: {
              name: block.name,
              color: block.color || "#627BC1",
            },
            geometry: {
              type: "Polygon",
              coordinates: [block.coords],
            },
          })),
        };

        map.addSource("blocks", {
          type: "geojson",
          data: blocksGeoJSON,
        });

        map.addLayer({
          id: "blocks-fill",
          type: "fill",
          source: "blocks",
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.2,
          },
        });

        map.addLayer({
          id: "blocks-outline",
          type: "line",
          source: "blocks",
          paint: {
            "line-color": "#627BC1",
            "line-width": 2,
          },
        });
      }
    });
  }, [mapStyle, map, isMapReady]);

  return {
    map,
    userLocation,
    isMapReady,
    setMapStyle,
  };
}
