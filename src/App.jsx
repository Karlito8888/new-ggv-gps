import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [location, setLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);
  const [zoom] = useState(15);
  const marker = useRef(null);

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

    // Ajoute le contrôle de navigation
    map.current.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        visualizeRoll: true,
        showZoom: true,
        showCompass: true,
      }),
      "top-right"
    );

    return () => map.current?.remove();
  }, []);

  // Gestion de la géolocalisation
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation([longitude, latitude]);
        setAccuracy(accuracy);

        // Centre la carte sur la position
        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude],
            essential: true,
          });

          // Ajoute ou met à jour le marqueur
          if (!marker.current) {
            marker.current = new maplibregl.Marker({
              color: "#FF0000",
              draggable: false,
            })
              .setLngLat([longitude, latitude])
              .addTo(map.current);
          } else {
            marker.current.setLngLat([longitude, latitude]);
          }
        }
      },
      (err) => {
        setError(`Erreur de géolocalisation: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <>
      <header></header>
      <main style={{ width: "100%", height: "100%", position: "relative" }}>
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

        {/* Overlay avec les infos GPS */}
        <div className="gps-info">
          {error ? (
            <p className="gps-info-error">{error}</p>
          ) : location ? (
            <>
              <p>Latitude: {location[1].toFixed(6)}</p>
              <p>Longitude: {location[0].toFixed(6)}</p>
              <p>Précision: {accuracy?.toFixed(1)} mètres</p>
            </>
          ) : (
            <p>Recherche de votre position...</p>
          )}
        </div>
      </main>
      <footer></footer>
    </>
  );
}

export default App;
