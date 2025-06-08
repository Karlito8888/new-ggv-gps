import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [bearing, setBearing] = useState(0);
  const [zoom] = useState(16.5);
  const [error, setError] = useState(null);

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

  // Gestion de l'orientation du device
  useEffect(() => {
    const handleOrientation = (event) => {
      if (event.alpha !== null) {
        const newBearing = 360 - event.alpha;
        setBearing(newBearing);
        
        if (map.current) {
          map.current.setBearing(newBearing);
        }
      }
    };

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            } else {
              setError('Permission pour l\'orientation refusée');
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    } else {
      setError('L\'orientation du device n\'est pas supportée');
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);


  return (
    <>
      <header></header>
      <main style={{ width: "100%", height: "100%", position: "relative" }}>
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
        {error && (
          <div className="gps-info gps-info-error">
            {error}
          </div>
        )}
      </main>
      <footer></footer>
    </>
  );
}

export default App;
