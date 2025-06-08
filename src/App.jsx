import { useEffect, useRef, useState } from "react";
import Map from "react-map-gl/maplibre";
import { NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

function App() {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [error, setError] = useState(null);

  // Effet pour la géolocalisation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          setError("Erreur de géolocalisation");
        }
      );
    } else {
      setError("Géolocalisation non supportée");
    }
  }, []);

  // Gestion de l'orientation du device
  useEffect(() => {
    const handleOrientation = (event) => {
      if (event.alpha !== null) {
        const newBearing = 360 - event.alpha;
        setBearing(newBearing);

        if (mapRef.current) {
          mapRef.current.setBearing(newBearing);
        }
      }
    };

    if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission()
          .then((permissionState) => {
            if (permissionState === "granted") {
              window.addEventListener("deviceorientation", handleOrientation);
            } else {
              setError("Permission pour l'orientation refusée");
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener("deviceorientation", handleOrientation);
      }
    } else {
      setError("L'orientation du device n'est pas supportée");
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  return (
    <>
      <header></header>
      <main style={{ width: "100%", height: "100%", position: "relative" }}>
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: userLocation?.latitude || 14.347872973134175,
            longitude: userLocation?.longitude || 120.95134859887523,
            zoom: 16.5,
            bearing: bearing,
            pitch: 45,
          }}
          mapStyle={{
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
          }}
        >
          <NavigationControl showCompass showZoom position="top-right" />
          {error && <div className="gps-info gps-info-error">{error}</div>}
        </Map>
      </main>
      <footer></footer>
    </>
  );
}

export default App;
