import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [bearing, setBearing] = useState(0);
  const [zoom] = useState(16.5);

  // Initialise la carte
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
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
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [120.95134859887523, 14.347872973134175],
      zoom: zoom,
      pitch: 45, // Vue 3D inclinée
      attributionControl: true,
      rollEnabled: true,
    });

    // Ajoute les contrôles
    map.current.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        visualizeRoll: true,
        showZoom: true,
        showCompass: true,
      }),
      "top-right"
    );

    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserLocation: true,
        showAccuracyCircle: true
      }),
      "top-right"
    );

    return () => map.current?.remove();
  }, []);


  return (
    <>
      <header></header>
      <main style={{ width: "100%", height: "100%", position: "relative" }}>
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      </main>
      <footer></footer>
    </>
  );
}

export default App;
