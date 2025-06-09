import { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from 'maplibre-gl';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Style, Fill, Stroke } from 'ol/style';
import {
  Map,
  NavigationControl,
  GeolocateControl,
  Marker,
  Source,
  Layer
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { publicPois } from "./data/public-pois";
import { blocks } from "./data/blocks";
import LocationPermissionModal from "./components/LocationPermissionModal";
import WelcomeModal from "./components/WelcomeModal";
import NavigationDisplay from "./components/NavigationDisplay";
import ArrivalModal from "./components/ArrivalModal";
import { createDirectRoute, VILLAGE_EXIT_COORDS } from "./lib/navigation";

function App() {
  "use memo"; // Utiliser React 19 compiler pour optimiser ce composant
  const mapRef = useRef(null);
  const geolocateControlRef = useRef();
  const watchId = useRef(null);

  // États de navigation
  const [navigationState, setNavigationState] = useState('permission'); // permission, welcome, navigating, arrived
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [error, setError] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [route, setRoute] = useState(null);

  // Coordonnées par défaut (Garden Grove Village)
  const DEFAULT_COORDS = {
    latitude: 14.347872973134175,
    longitude: 120.95134859887523,
  };

  // Gestionnaires d'événements pour les modales
  const handleLocationPermissionGranted = (position) => {
    setUserLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    });
    setNavigationState('welcome');
    startLocationTracking();
  };

  const handleLocationPermissionDenied = (errorMessage) => {
    setError(errorMessage);
    setNavigationState('welcome'); // Permettre quand même l'utilisation
  };

  const handleDestinationSelected = (dest) => {
    setDestination(dest);
    setNavigationState('navigating');
    
    // Créer l'itinéraire si on a la position utilisateur
    if (userLocation) {
      const routeData = createDirectRoute(
        userLocation.latitude,
        userLocation.longitude,
        dest.coordinates[1],
        dest.coordinates[0]
      );
      setRoute(routeData);
    }
  };

  const handleArrival = () => {
    setNavigationState('arrived');
  };

  const handleNewDestination = () => {
    setDestination(null);
    setRoute(null);
    setNavigationState('welcome');
  };

  const handleExitVillage = () => {
    const exitDestination = {
      blockNumber: 'Sortie',
      lotNumber: 'Village',
      coordinates: VILLAGE_EXIT_COORDS,
      address: 'Sortie de Garden Grove Village'
    };
    setDestination(exitDestination);
    setNavigationState('navigating');
    
    if (userLocation) {
      const routeData = createDirectRoute(
        userLocation.latitude,
        userLocation.longitude,
        VILLAGE_EXIT_COORDS[1],
        VILLAGE_EXIT_COORDS[0]
      );
      setRoute(routeData);
    }
  };

  // Suivi de position en temps réel
  const startLocationTracking = () => {
    if (navigator.geolocation && !watchId.current) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setUserLocation(newLocation);
          
          // Mettre à jour l'itinéraire si on a une destination
          if (destination) {
            const routeData = createDirectRoute(
              newLocation.latitude,
              newLocation.longitude,
              destination.coordinates[1],
              destination.coordinates[0]
            );
            setRoute(routeData);
          }
        },
        (error) => {
          console.error('Erreur de suivi GPS:', error);
          setError('Erreur de suivi GPS: ' + error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 1000
        }
      );
    }
  };

  // Nettoyage du suivi de position
  useEffect(() => {
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, []);

  // Memoize les paramètres initiaux de la carte
  const initialViewState = useMemo(
    () => ({
      latitude: userLocation?.latitude || DEFAULT_COORDS.latitude,
      longitude: userLocation?.longitude || DEFAULT_COORDS.longitude,
      zoom: navigationState === 'navigating' ? 18 : 16.5,
      bearing: bearing,
      pitch: navigationState === 'navigating' ? 60 : 45,
    }),
    [userLocation, bearing, navigationState, DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude]
  );

  const getPolygonCenter = (coords) => {
    if (!coords || coords.length === 0) return [0, 0];
    const polygon = new Polygon([coords]);
    return polygon.getInteriorPoint().getCoordinates();
  };

  // Mémoization des blocs en GeoJSON avec centres calculés
  const blocksGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: blocks
        .filter((block) => block.coords.length > 0)
        .map((block) => ({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [block.coords],
          },
          properties: {
            name: block.name || "",
            color: block.color || "#E0DFDF",
            center: getPolygonCenter(block.coords),
          },
        })),
    }),
    []
  );

  // Memoize le style de la carte
  const mapStyle = useMemo(
    () => ({
      version: 8,
      // glyphs: "/fonts/{fontstack}/{range}.pbf",
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
    }),
    []
  );

  // Gestion de l'orientation du device pour navigation GPS
  useEffect(() => {
    const handleOrientation = (event) => {
      if (event.alpha !== null && navigationState === 'navigating') {
        const newBearing = 360 - event.alpha;
        setBearing(newBearing);

        if (mapRef.current && isMapReady) {
          mapRef.current.easeTo({
            bearing: newBearing,
            duration: 300
          });
        }
      }
    };

    const requestOrientationPermission = async () => {
      try {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
          const permissionState =
            await DeviceOrientationEvent.requestPermission();
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          } else {
            console.warn("Permission pour l'orientation refusée");
          }
        } else {
          window.addEventListener("deviceorientation", handleOrientation);
        }
      } catch (err) {
        console.error("Erreur d'orientation:", err);
      }
    };

    if (typeof window !== "undefined" && window.DeviceOrientationEvent && navigationState === 'navigating') {
      requestOrientationPermission();
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [isMapReady, navigationState]);

  // Centrer la carte sur l'utilisateur pendant la navigation
  useEffect(() => {
    if (mapRef.current && userLocation && navigationState === 'navigating') {
      mapRef.current.easeTo({
        center: [userLocation.longitude, userLocation.latitude],
        duration: 1000
      });
    }
  }, [userLocation, navigationState]);

  // Gestion des blocs vectoriels
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    const map = mapRef.current.getMap();

    try {
      // Source unique pour tous les blocs
      map.addSource("blocks", {
        type: "geojson",
        data: blocksGeoJSON,
      });

      // Couche de remplissage
      map.addLayer({
        id: "blocks-fill",
        type: "fill",
        source: "blocks",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.8,
          "fill-outline-color": "#999",
        },
      });

      // Couche de bordure
      map.addLayer({
        id: "blocks-border",
        type: "line",
        source: "blocks",
        paint: {
          "line-color": "#999",
          "line-width": 1,
        },
      });

      // Interactions
      map.on("click", "blocks-fill", (e) => {
        if (e.features[0].properties.name) {
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`Bloc <strong>${e.features[0].properties.name}</strong>`)
            .addTo(map);
        }
      });

      // Changement du curseur au survol
      map.on("mouseenter", "blocks-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "blocks-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    } catch (error) {
      console.error("Erreur lors du chargement des blocs:", error);
      setError("Erreur d'affichage des blocs");
    }

    // Met à jour les positions après chaque rendu
    map.on('render', () => {
      blocksGeoJSON.features.forEach(block => {
        if (block.properties.name) {
          block.properties.center = getPolygonCenter(block.geometry.coordinates[0]);
        }
      });
    });

    return () => {
      // Nettoyage robuste
      const currentMapRef = mapRef.current;
      const map = currentMapRef?.getMap();
      if (map) {
        try {
          map.off('render');
          if (map.getLayer("blocks-fill")) map.removeLayer("blocks-fill");
          if (map.getLayer("blocks-text")) map.removeLayer("blocks-text");
          if (map.getSource("blocks")) map.removeSource("blocks");
        } catch (cleanupError) {
          console.error("Erreur de nettoyage:", cleanupError);
        }
      }
    };
  }, [isMapReady, blocksGeoJSON]);

  return (
    <>
      <main style={{ width: "100%", height: "100%", position: "relative" }}>
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle={mapStyle}
          onLoad={() => setIsMapReady(true)}
          onError={(e) =>
            setError(`Erreur de carte: ${e.error.message || "Erreur inconnue"}`)
          }
        >
          {/* Contrôles de carte conditionnels */}
          {navigationState !== 'navigating' && (
            <>
              <NavigationControl showCompass showZoom position="top-right" />
              <GeolocateControl
                ref={geolocateControlRef}
                position="top-right"
                positionOptions={{ enableHighAccuracy: true, timeout: 6000 }}
                trackUserLocation={true}
                showUserLocation={true}
              />
            </>
          )}

          {/* Affichage de l'itinéraire */}
          {route && (
            <Source id="route" type="geojson" data={route}>
              <Layer
                id="route-line"
                type="line"
                paint={{
                  'line-color': '#3b82f6',
                  'line-width': 4,
                  'line-opacity': 0.8
                }}
              />
            </Source>
          )}

          {/* Marker de destination */}
          {destination && (
            <Marker
              longitude={destination.coordinates[0]}
              latitude={destination.coordinates[1]}
              anchor="bottom"
            >
              <div className="destination-marker">
                <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            </Marker>
          )}

          {/* Marker de position utilisateur */}
          {userLocation && navigationState === 'navigating' && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="center"
            >
              <div 
                className="user-location-marker"
                style={{ transform: `rotate(${bearing}deg)` }}
              >
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg">
                  <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-blue-500 absolute -top-1 left-1/2 transform -translate-x-1/2"></div>
                </div>
              </div>
            </Marker>
          )}

          {/* Affichage des POIs seulement quand on n'est pas en navigation */}
          {navigationState !== 'navigating' && publicPois.map((poi) => (
            <Marker
              key={poi.name}
              longitude={poi.coords[0]}
              latitude={poi.coords[1]}
            >
              <img
                src={poi.icon}
                alt={poi.name}
                style={{ width: "100%", height: "auto" }}
                title={poi.name}
              />
            </Marker>
          ))}

          {/* Affichage des numéros de blocs seulement quand on n'est pas en navigation */}
          {navigationState !== 'navigating' && blocks.map((block) => {
            if (!block.name || block.color === "#19744B") return null;
            
            const center = getPolygonCenter(block.coords);
            
            return (
              <Marker
                key={`block-${block.name}`}
                longitude={center[0]}
                latitude={center[1]}
                anchor="center"
              >
                <div style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  color: '#444',
                  border: '1px solid #999',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  fontStyle: 'italic',
                }}>
                  {block.name}
                </div>
              </Marker>
            );
          })}
        </Map>

        {/* Interface de navigation */}
        {navigationState === 'navigating' && userLocation && destination && (
          <NavigationDisplay
            userLocation={userLocation}
            destination={destination}
            deviceBearing={bearing}
            onArrival={handleArrival}
          />
        )}

        {/* Messages d'erreur */}
        {error && (
          <div className="absolute bottom-4 left-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Fermer
            </button>
          </div>
        )}
      </main>

      {/* Modales */}
      {navigationState === 'permission' && (
        <LocationPermissionModal
          onPermissionGranted={handleLocationPermissionGranted}
          onPermissionDenied={handleLocationPermissionDenied}
        />
      )}

      {navigationState === 'welcome' && (
        <WelcomeModal
          onDestinationSelected={handleDestinationSelected}
          onCancel={() => setNavigationState('permission')}
        />
      )}

      {navigationState === 'arrived' && destination && (
        <ArrivalModal
          destination={destination}
          onNewDestination={handleNewDestination}
          onExitVillage={handleExitVillage}
          onClose={() => setNavigationState('navigating')}
        />
      )}
    </>
  );
}

export default App;
