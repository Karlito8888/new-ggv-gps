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
  shouldRecalculateRoute,
  updateRecalculationState,
  resetRecalculationState,
  createRemainingRoute,
  shouldUpdateRemainingRoute,
  createTraveledRoute,
  VILLAGE_EXIT_COORDS,
} from "./lib/navigation";
import { BsLayersHalf } from "react-icons/bs";
import Header from "./components/Header";
import Footer from "./components/Footer";
import stopLogo from "./assets/img/stop.png";
import "./App.css";
import { useAvailableBlocks } from "./hooks/useAvailableBlocks";

function App() {
  "use memo"; // Utiliser React 19 compiler pour optimiser ce composant
  const mapRef = useRef(null);
  const watchId = useRef(null);
  const {
    availableBlocks,
    isLoading,
    error: blocksError,
    setError,
  } = useAvailableBlocks();
  // Geolocation errors are now logged to console only

  // États de navigation
  const [navigationState, setNavigationState] = useState("permission"); // permission, welcome, navigating, arrived
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [route, setRoute] = useState(null);
  const [originalRoute, setOriginalRoute] = useState(null); // Store the complete original route
  const [traveledRoute, setTraveledRoute] = useState(null); // Store the traveled portion
  const [lastRouteUpdatePosition, setLastRouteUpdatePosition] = useState(null); // Track last position when route was updated
  const [mapType, setMapType] = useState("osm"); // 'osm' ou 'satellite'
  const [orientationPermissionGranted, setOrientationPermissionGranted] =
    useState(false);
  const [isOrientationActive, setIsOrientationActive] = useState(false);
  const [compassCalibration, setCompassCalibration] = useState(0);
  const [needsCalibration, setNeedsCalibration] = useState(false);

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
    console.error("Location permission denied:", errorMessage);
    setNavigationState("welcome");
    // Supprimer la demande automatique d'orientation
  };

  const handleDestinationSelected = async (dest) => {
    setDestination(dest);
    setNavigationState("navigating");

    // Reset recalculation state for new navigation
    resetRecalculationState();

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
        setOriginalRoute(routeData); // Store the complete route
        setLastRouteUpdatePosition({
          lat: userLocation.latitude,
          lon: userLocation.longitude,
        });

        // Update recalculation state after successful route creation
        updateRecalculationState(userLocation.latitude, userLocation.longitude);
      } catch (error) {
        console.error("Erreur création route:", error);
        // Error logged to console only - not shown to user
      }
    }
  };

  const handleArrival = () => {
    setNavigationState("arrived");
  };

  const handleNewDestination = () => {
    setDestination(null);
    setRoute(null);
    setOriginalRoute(null);
    setTraveledRoute(null);
    setLastRouteUpdatePosition(null);
    setNavigationState("welcome");
  };

  const handleExitVillage = async () => {
    const exitDestination = {
      blockNumber: "",
      lotNumber: "",
      coordinates: VILLAGE_EXIT_COORDS,
      address: "Salamat po !\n🙏 Ingat 🙏",
    };
    setDestination(exitDestination);
    setNavigationState("navigating");

    // Reset recalculation state for exit navigation
    resetRecalculationState();

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
        setOriginalRoute(routeData); // Store the complete route for exit
        setLastRouteUpdatePosition({
          lat: userLocation.latitude,
          lon: userLocation.longitude,
        });

        // Update recalculation state after successful route creation
        updateRecalculationState(userLocation.latitude, userLocation.longitude);
      } catch (error) {
        console.error("Erreur création route sortie:", error);
        // Error logged to console only - not shown to user
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

          // Smart route management if we have a destination
          if (destination && originalRoute) {
            // Check if we need to recalculate the entire route (user is off-route)
            const shouldRecalc = shouldRecalculateRoute(
              newLocation.latitude,
              newLocation.longitude,
              route
            );

            if (shouldRecalc) {
              console.log(
                "🔄 Automatic recalculation triggered - user is off route"
              );
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
                  setOriginalRoute(routeData); // Update original route
                  setLastRouteUpdatePosition({
                    lat: newLocation.latitude,
                    lon: newLocation.longitude,
                  });

                  // Update recalculation state after successful recalculation
                  updateRecalculationState(
                    newLocation.latitude,
                    newLocation.longitude
                  );
                })
                .catch((error) => {
                  console.error("Erreur mise à jour route:", error);
                });
            } else {
              // Check if we should update the remaining route (progressive route trimming)
              const shouldUpdateRemaining = shouldUpdateRemainingRoute(
                newLocation.latitude,
                newLocation.longitude,
                originalRoute,
                lastRouteUpdatePosition
              );

              if (shouldUpdateRemaining) {
                console.log(
                  "✂️ Updating remaining route - trimming traveled portion"
                );
                const remainingRoute = createRemainingRoute(
                  newLocation.latitude,
                  newLocation.longitude,
                  originalRoute
                );

                const traveledPortion = createTraveledRoute(
                  newLocation.latitude,
                  newLocation.longitude,
                  originalRoute
                );

                setRoute(remainingRoute);
                setTraveledRoute(traveledPortion);
                setLastRouteUpdatePosition({
                  lat: newLocation.latitude,
                  lon: newLocation.longitude,
                });
              } else {
                console.log("📍 Position updated, no route changes needed");
              }
            }
          }
        },
        (error) => {
          console.error("Erreur de suivi GPS:", error);
          // Error logged to console only - not shown to user
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
          console.log(
            "🧭 Permission d'orientation accordée - True North disponible"
          );
          return true;
        } else {
          console.warn("Permission pour l'orientation refusée");
          return false;
        }
      } else {
        // Pour les navigateurs qui ne nécessitent pas de permission explicite
        setOrientationPermissionGranted(true);
        setIsOrientationActive(true);

        // Vérifier si deviceorientationabsolute est disponible
        if ("ondeviceorientationabsolute" in window) {
          console.log(
            "🧭 DeviceOrientationAbsolute disponible - True North OK"
          );
        } else {
          console.warn(
            "⚠️ DeviceOrientationAbsolute non disponible - orientation relative"
          );
        }

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
        console.warn(
          "Permission d'orientation refusée. La boussole ne fonctionnera pas."
        );
        // Error logged to console only - not shown to user
      }
    } else {
      // Désactiver la boussole
      setIsOrientationActive(false);
      setBearing(0); // Remettre à zéro l'orientation
      setCompassCalibration(0); // Reset calibration
      setNeedsCalibration(false);
    }
  };

  // Fonction de calibration manuelle de la boussole
  const calibrateCompass = () => {
    if (bearing !== null) {
      // L'utilisateur pointe vers le nord et appuie sur "Calibrer"
      const calibrationOffset = -bearing;
      setCompassCalibration(calibrationOffset);
      setNeedsCalibration(false);
      console.log(
        "🧭 Boussole calibrée manuellement, offset:",
        calibrationOffset
      );

      // Feedback visuel temporaire
      const button = document.querySelector(".calibrate-button");
      if (button) {
        button.textContent = "✅ Calibré !";
        setTimeout(() => {
          button.textContent = "🧭 Calibrer Nord";
        }, 2000);
      }
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
        let trueNorthBearing = 0;

        // 🎯 SOLUTION 1: iOS Safari - webkitCompassHeading donne le vrai nord
        if (event.webkitCompassHeading !== undefined) {
          trueNorthBearing = event.webkitCompassHeading;
          console.log("🧭 iOS Compass Heading (True North):", trueNorthBearing);
        }
        // 🎯 SOLUTION 2: Android/autres - deviceorientationabsolute avec event.absolute
        else if (event.absolute === true) {
          trueNorthBearing = 360 - event.alpha;
          console.log(
            "🧭 Absolute Orientation (True North):",
            trueNorthBearing
          );
        }
        // ⚠️ FALLBACK: Orientation relative (pas le vrai nord)
        else {
          trueNorthBearing = 360 - event.alpha;
          setNeedsCalibration(true);
          console.warn("⚠️ Using relative orientation - not true north!");
        }

        // Appliquer la calibration manuelle si nécessaire
        const calibratedBearing =
          (trueNorthBearing + compassCalibration + 360) % 360;

        // Debug logs pour validation
        console.log("🔍 Debug Compass:", {
          alpha: event.alpha,
          absolute: event.absolute,
          webkitCompassHeading: event.webkitCompassHeading,
          calculatedBearing: trueNorthBearing,
          calibratedBearing: calibratedBearing,
          calibrationOffset: compassCalibration,
        });

        setBearing(calibratedBearing);

        // Mise à jour de l'orientation de la carte avec moins de fréquence pour éviter les conflits
        if (mapRef.current && isMapReady && navigationState === "navigating") {
          mapRef.current.easeTo({
            bearing: calibratedBearing,
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
      // 🎯 PRIORITÉ 1: Essayer deviceorientationabsolute (vrai nord)
      if ("ondeviceorientationabsolute" in window) {
        console.log("🧭 Using deviceorientationabsolute for true north");
        window.addEventListener(
          "deviceorientationabsolute",
          handleOrientation,
          {
            passive: true,
          }
        );
      }
      // 🎯 PRIORITÉ 2: Fallback vers deviceorientation standard
      else {
        console.log("🧭 Using deviceorientation (may be relative)");
        window.addEventListener("deviceorientation", handleOrientation, {
          passive: true,
        });
      }
    }

    return () => {
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation
      );
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
    } catch (error) {
      console.error("Erreur lors du chargement des blocs:", error);
      // Error logged to console only - not shown to user
    }

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
          onError={(e) => {
            console.error(
              "Erreur de carte:",
              e.error.message || "Erreur inconnue"
            );
            // Error logged to console only - not shown to user
          }}
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
              <BsLayersHalf size={25} />
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
              <div className="compass-face-mini">
                {/* Compass ring with cardinal points */}
                <div
                  className="compass-ring-mini"
                  style={{
                    transform: isOrientationActive
                      ? `rotate(${-bearing}deg)`
                      : "rotate(0deg)",
                    transition: "transform 0.3s ease",
                  }}
                >
                  {/* Cardinal points */}
                  <div className="cardinal-point-mini cardinal-north-mini">
                    N
                  </div>
                  <div className="cardinal-point-mini cardinal-east-mini">
                    E
                  </div>
                  <div className="cardinal-point-mini cardinal-south-mini">
                    S
                  </div>
                  <div className="cardinal-point-mini cardinal-west-mini">
                    W
                  </div>
                </div>

                {/* North indicator (always points up) */}
                <div className="north-indicator">
                  <div className="north-arrow"></div>
                </div>

                {/* Center dot */}
                <div className="compass-center-mini">
                  <div className="center-dot-mini"></div>
                </div>

                {/* Status indicator */}
                {isOrientationActive && (
                  <div className="compass-status-dot"></div>
                )}

                {/* Calibration needed indicator */}
                {needsCalibration && isOrientationActive && (
                  <div className="compass-calibration-needed">⚠️</div>
                )}

                {/* Inactive overlay */}
                {!isOrientationActive && (
                  <div className="compass-inactive-overlay-mini">
                    <div className="compass-inactive-icon">⊕</div>
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Bouton de calibration de la boussole */}
          {needsCalibration && isOrientationActive && (
            <div className="compass-calibration-control">
              <button
                onClick={calibrateCompass}
                className="calibrate-button"
                title="Pointez vers le nord géographique et appuyez pour calibrer"
              >
                🧭 Calibrer Nord
              </button>
            </div>
          )}

          {/* Bouton nouvelle destination pendant la navigation */}
          {navigationState === "navigating" && (
            <div className="new-destination-control">
              <button
                onClick={handleNewDestination}
                className="new-destination-button"
                title="Nouvelle destination"
              >
                <img src={stopLogo} alt="Nouvelle destination" />
              </button>
            </div>
          )}

          {/* Affichage de l'itinéraire restant */}
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

          {/* Affichage de la partie parcourue */}
          {traveledRoute && (
            <Source id="traveled-route" type="geojson" data={traveledRoute}>
              <Layer
                id="traveled-route-line"
                type="line"
                paint={{
                  "line-color": "#f3c549",
                  "line-width": 3,
                  "line-opacity": 1,
                  "line-dasharray": [2, 2],
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

        {/* Messages d'erreur - Hidden from users */}
        {/* Error messages are logged to console only */}
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
          availableBlocks={availableBlocks}
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
