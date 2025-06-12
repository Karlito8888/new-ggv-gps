import { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import { Feature } from "ol";
import { Polygon } from "ol/geom";
import { Style, Fill, Stroke } from "ol/style";
import {
  Map,
  NavigationControl,
  Marker,
  Source,
  Layer,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { publicPois } from "./data/public-pois";
import { blocks } from "./data/blocks";
import LocationPermissionModal from "./components/LocationPermissionModal";
import WelcomeModal from "./components/WelcomeModal";
import NavigationDisplay from "./components/NavigationDisplay";
import ArrivalModal from "./components/ArrivalModal";
import {
  createRoute,
  initMapLibreDirections,
  cleanupDirections,
  VILLAGE_EXIT_COORDS,
} from "./lib/navigation";
import { BsLayersHalf } from "react-icons/bs";
import "./App.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  "use memo"; // Utiliser React 19 compiler pour optimiser ce composant
  const mapRef = useRef(null);
  const watchId = useRef(null);

  // États de navigation
  const [navigationState, setNavigationState] = useState("permission"); // permission, welcome, navigating, arrived
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [error, setError] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [route, setRoute] = useState(null);
  const [mapType, setMapType] = useState("osm"); // 'osm' ou 'satellite'
  const [orientationPermissionGranted, setOrientationPermissionGranted] =
    useState(false);
  const [isOrientationActive, setIsOrientationActive] = useState(false);

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
      accuracy: position.coords.accuracy,
    });
    setNavigationState("welcome");
    startLocationTracking();
    // Supprimer la demande automatique d'orientation
  };

  const handleLocationPermissionDenied = (errorMessage) => {
    setError(errorMessage);
    setNavigationState("welcome"); // Permettre quand même l'utilisation
    // Supprimer la demande automatique d'orientation
  };

  const handleDestinationSelected = async (dest) => {
    setDestination(dest);
    setNavigationState("navigating");

    // Créer l'itinéraire si on a la position utilisateur
    if (userLocation) {
      try {
        const routeResult = await createRoute(
          userLocation.latitude,
          userLocation.longitude,
          dest.coordinates[1],
          dest.coordinates[0]
        );

        // Assurer le format FeatureCollection pour MapLibre
        const routeData = {
          type: "FeatureCollection",
          features:
            routeResult.type === "Feature"
              ? [routeResult]
              : routeResult.features || [],
        };

        console.log("📍 Route créée:", routeData);
        setRoute(routeData);
      } catch (error) {
        console.error("Erreur création route:", error);
        setError("Erreur lors du calcul de l'itinéraire");
      }
    }
  };

  const handleArrival = () => {
    setNavigationState("arrived");
  };

  const handleNewDestination = () => {
    setDestination(null);
    setRoute(null);
    setNavigationState("welcome");
  };

  const handleExitVillage = async () => {
    const exitDestination = {
      blockNumber: "",
      lotNumber: "",
      coordinates: VILLAGE_EXIT_COORDS,
      address: "Salamat po, ingat",
    };
    setDestination(exitDestination);
    setNavigationState("navigating");

    if (userLocation) {
      try {
        const routeResult = await createRoute(
          userLocation.latitude,
          userLocation.longitude,
          VILLAGE_EXIT_COORDS[1],
          VILLAGE_EXIT_COORDS[0]
        );

        // Assurer le format FeatureCollection pour MapLibre
        const routeData = {
          type: "FeatureCollection",
          features:
            routeResult.type === "Feature"
              ? [routeResult]
              : routeResult.features || [],
        };

        setRoute(routeData);
      } catch (error) {
        console.error("Erreur création route sortie:", error);
        setError("Erreur lors du calcul de l'itinéraire de sortie");
      }
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
            accuracy: position.coords.accuracy,
          };
          setUserLocation(newLocation);

          // Mettre à jour l'itinéraire si on a une destination
          if (destination) {
            createRoute(
              newLocation.latitude,
              newLocation.longitude,
              destination.coordinates[1],
              destination.coordinates[0]
            )
              .then((routeResult) => {
                // Assurer le format FeatureCollection pour MapLibre
                const routeData = {
                  type: "FeatureCollection",
                  features:
                    routeResult.type === "Feature"
                      ? [routeResult]
                      : routeResult.features || [],
                };

                setRoute(routeData);
              })
              .catch((error) => {
                console.error("Erreur mise à jour route:", error);
              });
          }
        },
        (error) => {
          console.error("Erreur de suivi GPS:", error);
          setError("Erreur de suivi GPS: " + error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 1000,
        }
      );
    }
  };

  // Nettoyage du suivi de position et directions
  useEffect(() => {
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      // Nettoyer l'instance MapLibre Directions
      cleanupDirections();
    };
  }, []);

  // Memoize les paramètres initiaux de la carte
  const initialViewState = useMemo(
    () => ({
      latitude: userLocation?.latitude || DEFAULT_COORDS.latitude,
      longitude: userLocation?.longitude || DEFAULT_COORDS.longitude,
      zoom: navigationState === "navigating" ? 18 : 16.5,
      bearing: bearing,
      pitch: navigationState === "navigating" ? 60 : 45,
    }),
    [
      userLocation,
      bearing,
      navigationState,
      DEFAULT_COORDS.latitude,
      DEFAULT_COORDS.longitude,
    ]
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
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
        satellite: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "© Esri",
        },
      },
      layers: [
        {
          id: "base-layer",
          type: "raster",
          source: mapType,
        },
      ],
    }),
    [mapType]
  );

  // Fonction pour demander la permission d'orientation du device
  const requestDeviceOrientationPermission = async () => {
    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const permissionState =
          await DeviceOrientationEvent.requestPermission();
        if (permissionState === "granted") {
          setOrientationPermissionGranted(true);
          setIsOrientationActive(true);
          console.log("Permission d'orientation accordée");
          return true;
        } else {
          console.warn("Permission pour l'orientation refusée");
          return false;
        }
      } else {
        // Pour les navigateurs qui ne nécessitent pas de permission explicite
        setOrientationPermissionGranted(true);
        setIsOrientationActive(true);
        return true;
      }
    } catch (err) {
      console.error("Erreur demande permission orientation:", err);
      return false;
    }
  };

  // Fonction pour basculer l'état de la boussole
  const toggleCompass = async () => {
    if (!isOrientationActive) {
      // Activer la boussole
      const granted = await requestDeviceOrientationPermission();
      if (!granted) {
        setError(
          "Permission d'orientation refusée. La boussole ne fonctionnera pas."
        );
      }
    } else {
      // Désactiver la boussole
      setIsOrientationActive(false);
      setBearing(0); // Remettre à zéro l'orientation
    }
  };

  // Gestion de l'orientation du device pour navigation GPS
  useEffect(() => {
    const handleOrientation = (event) => {
      if (
        event.alpha !== null &&
        isOrientationActive &&
        orientationPermissionGranted
      ) {
        const newBearing = 360 - event.alpha;
        setBearing(newBearing);

        // Mise à jour de l'orientation de la carte avec moins de fréquence pour éviter les conflits
        if (mapRef.current && isMapReady && navigationState === "navigating") {
          mapRef.current.easeTo({
            bearing: newBearing,
            duration: 500, // Augmenté pour plus de fluidité
          });
        }
      }
    };

    if (
      typeof window !== "undefined" &&
      window.DeviceOrientationEvent &&
      isOrientationActive &&
      orientationPermissionGranted
    ) {
      window.addEventListener("deviceorientation", handleOrientation, {
        passive: true,
      });
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [
    isMapReady,
    navigationState,
    orientationPermissionGranted,
    isOrientationActive,
  ]);

  // Centrer la carte sur l'utilisateur pendant la navigation
  useEffect(() => {
    if (mapRef.current && userLocation && navigationState === "navigating") {
      mapRef.current.easeTo({
        center: [userLocation.longitude, userLocation.latitude],
        duration: 1000,
      });
    }
  }, [userLocation, navigationState]);

  // Gestion des blocs vectoriels
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    const map = mapRef.current.getMap();

    // Initialise MapLibre Directions si pas déjà fait
    if (map) {
      initMapLibreDirections(map);
    }

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
    map.on("render", () => {
      blocksGeoJSON.features.forEach((block) => {
        if (block.properties.name) {
          block.properties.center = getPolygonCenter(
            block.geometry.coordinates[0]
          );
        }
      });
    });

    return () => {
      // Nettoyage robuste - capturer la référence au moment de la création
      const currentMap = map;
      if (currentMap) {
        try {
          currentMap.off("render");
          if (currentMap.getLayer("blocks-fill"))
            currentMap.removeLayer("blocks-fill");
          if (currentMap.getLayer("blocks-text"))
            currentMap.removeLayer("blocks-text");
          if (currentMap.getSource("blocks")) currentMap.removeSource("blocks");
        } catch (cleanupError) {
          console.error("Erreur de nettoyage:", cleanupError);
        }
      }
    };
  }, [isMapReady, blocksGeoJSON]);

  return (
    <>
      <Header />
      <main style={{ width: "100%", height: "100%", position: "relative" }}>
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle={mapStyle}
          onLoad={() => setIsMapReady(true)}
          onError={(e) =>
            setError(`Erreur de carte: ${e.error.message || "Erreur inconnue"}`)
          }
          // Assurer que les interactions tactiles restent fonctionnelles
          interactiveLayerIds={
            navigationState === "navigating" ? [] : undefined
          }
          touchZoomRotate={true}
          doubleClickZoom={true}
          dragPan={true}
          dragRotate={navigationState !== "navigating"}
          scrollZoom={true}
          touchPitch={true}
        >
          {/* Contrôles de carte - toujours disponibles */}
          <NavigationControl
            showCompass={navigationState !== "navigating"}
            showZoom
            position="bottom-right"
          />

          {/* Bouton de recentrage personnalisé */}
          <div className="geolocate-control-custom">
            <button
              onClick={() => {
                if (userLocation && mapRef.current) {
                  mapRef.current.easeTo({
                    center: [userLocation.longitude, userLocation.latitude],
                    zoom: 18,
                    duration: 1000,
                  });
                }
              }}
              className="geolocate-button"
              title="Recentrer sur ma position"
              disabled={!userLocation}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
              </svg>
            </button>
          </div>

          {/* Bouton de basculement de carte */}
          <div className="map-type-switcher">
            <button
              onClick={() =>
                setMapType(mapType === "osm" ? "satellite" : "osm")
              }
              className="map-type-button"
              title={mapType === "osm" ? "Vue satellite" : "Vue carte"}
            >
              <BsLayersHalf size={19} />
            </button>
          </div>

          {/* Bouton boussole pour l'orientation */}
          <div className="compass-control">
            <button
              onClick={toggleCompass}
              className={`compass-button ${
                isOrientationActive ? "active" : ""
              }`}
              title={
                isOrientationActive
                  ? "Désactiver la boussole"
                  : "Activer la boussole"
              }
            >
              <div
                className="compass-icon"
                style={{
                  transform: isOrientationActive
                    ? `rotate(${bearing}deg)`
                    : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                  />
                  <path d="M12 2 L14 8 L12 6 L10 8 Z" fill="red" />
                  <path d="M12 22 L10 16 L12 18 L14 16 Z" fill="currentColor" />
                  <text
                    x="12"
                    y="5"
                    textAnchor="middle"
                    fontSize="8"
                    fill="red"
                  >
                    N
                  </text>
                </svg>
              </div>
              {isOrientationActive && (
                <div className="compass-status-dot"></div>
              )}
            </button>
          </div>

          {/* Affichage de l'itinéraire */}
          {route && (
            <Source id="route" type="geojson" data={route}>
              <Layer
                id="route-line"
                type="line"
                paint={{
                  "line-color": "#3b82f6",
                  "line-width": 4,
                  "line-opacity": 0.8,
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
                <div className="destination-marker-pin">
                  <div className="destination-marker-center"></div>
                </div>
              </div>
            </Marker>
          )}

          {/* Marker de position utilisateur */}
          {userLocation && navigationState === "navigating" && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="center"
            >
              <div
                className="user-location-marker"
                style={{ transform: `rotate(${bearing}deg)` }}
              >
                <div className="user-location-pin">
                  <div className="user-location-arrow"></div>
                </div>
              </div>
            </Marker>
          )}

          {/* Affichage des POIs seulement quand on n'est pas en navigation */}
          {navigationState === "navigating" &&
            publicPois.map((poi) => (
              <Marker
                key={poi.name}
                longitude={poi.coords[0]}
                latitude={poi.coords[1]}
              >
                <img
                  src={poi.icon}
                  alt={poi.name}
                  style={{ width: "50px", height: "auto" }}
                  title={poi.name}
                />
              </Marker>
            ))}

          {/* Affichage des numéros de blocs seulement quand on n'est pas en navigation */}
          {navigationState === "navigating" &&
            blocks.map((block) => {
              if (!block.name || block.color === "#19744B") return null;

              const center = getPolygonCenter(block.coords);

              return (
                <Marker
                  key={`block-${block.name}`}
                  longitude={center[0]}
                  latitude={center[1]}
                  anchor="center"
                >
                  <div className="block-label">{block.name}</div>
                </Marker>
              );
            })}
        </Map>

        {/* Interface de navigation */}
        {navigationState === "navigating" && userLocation && destination && (
          <NavigationDisplay
            userLocation={userLocation}
            destination={destination}
            deviceBearing={bearing}
            onArrival={handleArrival}
            isOrientationActive={isOrientationActive}
          />
        )}

        {/* Messages d'erreur */}
        {error && (
          <div className="error-notification">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="error-notification-button"
            >
              Fermer
            </button>
          </div>
        )}
      </main>

      {/* Modales */}
      {navigationState === "permission" && (
        <LocationPermissionModal
          onPermissionGranted={handleLocationPermissionGranted}
          onPermissionDenied={handleLocationPermissionDenied}
        />
      )}

      {navigationState === "welcome" && (
        <WelcomeModal
          onDestinationSelected={handleDestinationSelected}
          onCancel={() => setNavigationState("permission")}
        />
      )}

      {navigationState === "arrived" && destination && (
        <ArrivalModal
          destination={destination}
          onNewDestination={handleNewDestination}
          onExitVillage={handleExitVillage}
          onClose={() => setNavigationState("navigating")}
        />
      )}
      <Footer />
    </>
  );
}

export default App;
