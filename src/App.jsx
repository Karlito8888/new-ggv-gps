import { useEffect, useRef, useState, useMemo } from "react";
import { Map, NavigationControl, GeolocateControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

function App() {
  "use memo"; // Utiliser React 19 compiler pour optimiser ce composant
  const mapRef = useRef(null);
  const geolocateControlRef = useRef();
  const [userLocation, setUserLocation] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [error, setError] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Coordonnées par défaut (Garden Grove Village)
  const DEFAULT_COORDS = {
    latitude: 14.347872973134175,
    longitude: 120.95134859887523,
  };

  // Memoize les paramètres initiaux de la carte
  const initialViewState = useMemo(() => ({
    latitude: userLocation?.latitude || DEFAULT_COORDS.latitude,
    longitude: userLocation?.longitude || DEFAULT_COORDS.longitude,
    zoom: 16.5,
    bearing: bearing,
    pitch: 45,
  }), [userLocation, bearing]);

  // Memoize le style de la carte
  const mapStyle = useMemo(() => ({
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
  }), []);


  // Gestion de l'orientation du device
  useEffect(() => {
    const handleOrientation = (event) => {
      if (event.alpha !== null) {
        const newBearing = 360 - event.alpha;
        setBearing(newBearing);

        if (mapRef.current && isMapReady) {
          mapRef.current.setBearing(newBearing);
        }
      }
    };

    const requestOrientationPermission = async () => {
      try {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
          const permissionState = await DeviceOrientationEvent.requestPermission();
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          } else {
            setError("Permission pour l'orientation refusée");
          }
        } else {
          // Pour les navigateurs qui ne nécessitent pas de permission
          window.addEventListener("deviceorientation", handleOrientation);
        }
      } catch (err) {
        setError(`Erreur d'orientation: ${err.message}`);
        console.error("Erreur d'orientation:", err);
      }
    };

    if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
      requestOrientationPermission();
    } else {
      setError("L'orientation du device n'est pas supportée");
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [isMapReady]);

  // Effet pour déclencher la géolocalisation automatiquement
  useEffect(() => {
    if (geolocateControlRef.current) {
      geolocateControlRef.current.trigger();
    }
  }, []);

  return (
    <>
      <header></header>
      <main style={{ width: "100%", height: "100%", position: "relative" }}>
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle={mapStyle}
          onLoad={() => setIsMapReady(true)}
          onError={(e) => setError(`Erreur de carte: ${e.error.message || "Erreur inconnue"}`)}
        >
          <NavigationControl showCompass showZoom position="top-right" />
          <GeolocateControl
            ref={geolocateControlRef}
            position="top-right"
            positionOptions={{ enableHighAccuracy: true, timeout: 6000 }}
            trackUserLocation={true}
            showUserLocation={true}
            onGeolocate={(e) => {
              setUserLocation({
                latitude: e.coords.latitude,
                longitude: e.coords.longitude,
                accuracy: e.coords.accuracy
              });
              setError(null); // Réinitialiser les erreurs précédentes
            }}
            onError={(err) => setError(`Erreur GPS: ${err.message}`)}
          />
          {error && (
            <div className="gps-info gps-info-error">
              <p>{error}</p>
              <button onClick={() => setError(null)}>Fermer</button>
            </div>
          )}
        </Map>
      </main>
      <footer></footer>
    </>
  );
}

export default App;
