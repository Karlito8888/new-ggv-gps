import { useEffect, useRef, useState, useMemo } from "react";
import { Map, NavigationControl, GeolocateControl, Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { publicPois } from "./data/public-pois";
import { blocks } from "./data/blocks";


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

  // Mémoization des blocs en GeoJSON
  const blocksGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: blocks
      .filter(block => block.coords.length > 0) // Filtre les blocs sans coordonnées
      .map(block => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [block.coords]
        },
        properties: {
          name: block.name || '',
          color: block.color || '#E0DFDF'
        }
      }))
  }), []);

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

  // Gestion des blocs vectoriels
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    const map = mapRef.current.getMap();
    
    try {
      // Source unique pour tous les blocs
      map.addSource('blocks', {
        type: 'geojson', 
        data: blocksGeoJSON
      });

      // Couche de remplissage avec interaction
      map.addLayer({
        id: 'blocks-fill',
        type: 'fill',
        source: 'blocks',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.8,
          'fill-outline-color': '#666'
        }
      });

      // Couche de texte optimisée
      map.addLayer({
        id: 'blocks-text',
        type: 'symbol',
        source: 'blocks',
        minzoom: 15, // N'affiche le texte qu'à partir d'un certain zoom
        filter: ['!=', ['get', 'name'], ''], // Ignore les blocs sans nom
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 14,
          'text-font': ['Arial Unicode MS Bold', 'Arial Bold'],
          'text-justify': 'center',
          'text-anchor': 'center', 
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#444',
          'text-halo-color': '#fff',
          'text-halo-width': 2
        }
      });

      // Interactions
      map.on('click', 'blocks-fill', (e) => {
        if (e.features[0].properties.name) {
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`Bloc <strong>${e.features[0].properties.name}</strong>`)
            .addTo(map);
        }
      });

      // Changement du curseur au survol
      map.on('mouseenter', 'blocks-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'blocks-fill', () => {
        map.getCanvas().style.cursor = '';
      });

    } catch (error) {
      console.error("Erreur lors du chargement des blocs:", error);
      setError("Erreur d'affichage des blocs");
    }

    return () => {
      // Nettoyage robuste
      const map = mapRef.current?.getMap();
      if (map) {
        try {
          if (map.getLayer('blocks-fill')) map.removeLayer('blocks-fill');
          if (map.getLayer('blocks-text')) map.removeLayer('blocks-text');
          if (map.getSource('blocks')) map.removeSource('blocks');
        } catch (cleanupError) {
          console.error("Erreur de nettoyage:", cleanupError);
        }
      }
    };
  }, [isMapReady, blocksGeoJSON]);

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
          
          {/* Affichage des POIs */}
          {publicPois.map((poi) => (
            <Marker 
              key={poi.name}
              longitude={poi.coords[0]} 
              latitude={poi.coords[1]}
            >
              <img 
                src={poi.icon} 
                alt={poi.name} 
                style={{ width: '100%', height: 'auto' }}
                title={poi.name}
              />
            </Marker>
          ))}
          
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
