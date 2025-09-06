import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import useSmoothedLocation from "./hooks/useSmoothedLocation";
import useAdaptiveGPS from "./hooks/useAdaptiveGPS";
import useAdaptivePitch from "./hooks/useAdaptivePitch";
import { Polygon } from "ol/geom";
import {
  Map,
  NavigationControl,
  GeolocateControl,
  Marker,
  Source,
  Layer,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { publicPois } from "./data/public-pois";
import { blocks } from "./data/blocks";
import LocationPermissionModalNew from "./components/LocationPermissionModalNew";
import WelcomeModalMobile from "./components/WelcomeModalMobile";
import NavigationDisplay from "./components/NavigationDisplay";
import ArrivalModalNew from "./components/ArrivalModalNew";
import NavigationAlerts from "./components/NavigationAlerts";

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
import { useAvailableBlocks } from "./hooks/useLocations";
import { cleanupDirectionIcons } from "./utils/mapIcons";
import {
  applyOptimalTransition,
  shouldTransition,
} from "./utils/mapTransitions";

// Constantes de configuration
const GEOLOCATION_CONFIG = {
  TIMEOUT: 10000,
  MAX_AGE: 300000,
  RETRY_DELAY: 1000,
  MIN_ACCURACY_DESKTOP: 5000,
};

function App() {
  // ========================================
  // REFS ET HOOKS DE DONNÉES
  // ========================================
  const mapRef = useRef(null);
  const geolocateControlRef = useRef(null);
  const { data: availableBlocks = [] } = useAvailableBlocks();

  // ========================================
  // ÉTATS DE NAVIGATION
  // ========================================
  const [navigationState, setNavigationState] = useState("permission"); // permission, welcome, navigating, arrived
  const [rawUserLocation, setRawUserLocation] = useState(null);
  const [previousUserLocation, setPreviousUserLocation] = useState(null);

  // ========================================
  // HOOKS DE TRAITEMENT GPS
  // ========================================
  const {
    location: userLocation,
    speed,
    speedKmh,
  } = useSmoothedLocation(rawUserLocation, {
    maxJumpDistance: 50,
    minAccuracy: GEOLOCATION_CONFIG.MIN_ACCURACY_DESKTOP,
    smoothingFactor: 0.3,
    maxSpeed: 50,
  });

  // Optimisation GPS adaptative pour économiser la batterie
  const { gpsOptions, fitBoundsOptions } = useAdaptiveGPS(
    speed,
    navigationState === "navigating"
  );

  // Pitch adaptatif selon vitesse et contexte
  const { pitch: adaptivePitch, pitchMode } = useAdaptivePitch(
    speedKmh,
    navigationState,
    navigationState === "navigating"
  ); // Track previous position for direction changes
  const [destination, setDestination] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [route, setRoute] = useState(null);
  const [originalRoute, setOriginalRoute] = useState(null); // Store the complete original route
  const [traveledRoute, setTraveledRoute] = useState(null); // Store the traveled portion
  const [lastRouteUpdatePosition, setLastRouteUpdatePosition] = useState(null); // Track last position when route was updated
  const [mapType, setMapType] = useState("osm"); // 'osm' ou 'satellite'

  // Coordonnées par défaut (Garden Grove Village)
  const DEFAULT_COORDS = {
    latitude: 14.347872973134175,
    longitude: 120.95134859887523,
  };

  // ========================================
  // HANDLERS ET FONCTIONS UTILITAIRES
  // ========================================
  const getCurrentPosition = () => {
    if (!userLocation && navigator.geolocation) {
      console.log("📍 Récupération position actuelle...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("📍 Position actuelle récupérée:", position);
          const newRawLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          console.log(
            "📍 Coordonnées:",
            newRawLocation.latitude,
            newRawLocation.longitude,
            "±" + newRawLocation.accuracy + "m"
          );
          setRawUserLocation(newRawLocation);
        },
        (error) => {
          console.error("❌ Erreur récupération position:", error);
        },
        {
          enableHighAccuracy: false,
          timeout: GEOLOCATION_CONFIG.TIMEOUT,
          maximumAge: GEOLOCATION_CONFIG.MAX_AGE,
        }
      );
    }
  };

  // Gestionnaires d'événements pour les modales
  const handleLocationPermissionGranted = () => {
    console.log("🔓 Permission géolocalisation accordée");
    setNavigationState("welcome");

    // Déclencher le GeolocateControl pour obtenir la position
    if (geolocateControlRef.current) {
      console.log("🎯 Déclenchement GeolocateControl...");
      geolocateControlRef.current.trigger();

      // Récupérer la position actuelle après un délai
      setTimeout(getCurrentPosition, GEOLOCATION_CONFIG.RETRY_DELAY);
    } else {
      console.warn("⚠️ GeolocateControl ref non disponible");
    }
  };

  const handleLocationPermissionDenied = (errorMessage) => {
    console.error("Location permission denied:", errorMessage);
    setNavigationState("welcome");
  };

  const handleDestinationSelected = async (dest) => {
    console.log("🎯 Destination sélectionnée:", dest);
    console.log(
      "📍 Position utilisateur disponible:",
      userLocation ? "OUI" : "NON"
    );

    setDestination(dest);
    setNavigationState("navigating");

    // Reset recalculation state for new navigation
    resetRecalculationState();

    // Attendre que la position utilisateur soit disponible
    if (!userLocation) {
      console.log("⏳ Attente de la position utilisateur...");
      // La route sera créée automatiquement dans useEffect quand userLocation sera disponible
      return;
    }

    // Créer l'itinéraire si on a la position utilisateur
    console.log("🚀 Tentative création route...");
    console.log("📍 De:", userLocation.latitude, userLocation.longitude);
    console.log("📍 Vers:", dest.coordinates[1], dest.coordinates[0]);
    try {
      const routeResult = await createRoute(
        userLocation.latitude,
        userLocation.longitude,
        dest.coordinates[1],
        dest.coordinates[0],
        mapRef.current?.getMap()
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
      console.error("❌ Erreur création route:", error);
      // Error logged to console only - not shown to user
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
          VILLAGE_EXIT_COORDS[0],
          mapRef.current?.getMap()
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

  // Gestionnaires pour les événements du GeolocateControl
  const handleGeolocate = useCallback(
    (e) => {
      console.log("📍 Position GPS reçue:", e);
      const position = e.data || e; // L'événement peut être dans e.data ou directement dans e
      if (!position || !position.coords) {
        console.warn("⚠️ Position GPS invalide:", position);
        return;
      }
      console.log(
        "📍 Coordonnées:",
        position.coords.latitude,
        position.coords.longitude,
        "±" + position.coords.accuracy + "m"
      );
      const newRawLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      console.log("📍 GPS Heading non disponible");

      // Store previous location before updating
      setPreviousUserLocation(userLocation);
      setRawUserLocation(newRawLocation); // Le hook useSmoothedLocation se chargera du filtrage

      // Smart route management if we have a destination
      if (destination && originalRoute) {
        // Check if we need to recalculate the entire route (user is off-route)
        const shouldRecalc = shouldRecalculateRoute(
          newRawLocation.latitude,
          newRawLocation.longitude,
          route,
          false, // not forced
          previousUserLocation?.latitude,
          previousUserLocation?.longitude
        );

        if (shouldRecalc) {
          console.log(
            "🔄 Automatic recalculation triggered - user is off route"
          );
          createRoute(
            newRawLocation.latitude,
            newRawLocation.longitude,
            destination.coordinates[1],
            destination.coordinates[0],
            mapRef.current?.getMap()
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
                lat: newRawLocation.latitude,
                lon: newRawLocation.longitude,
              });

              // Update recalculation state after successful recalculation
              updateRecalculationState(
                newRawLocation.latitude,
                newRawLocation.longitude
              );
            })
            .catch((error) => {
              console.error("Erreur mise à jour route:", error);
            });
        } else {
          // Check if we should update the remaining route (progressive route trimming)
          const shouldUpdateRemaining = shouldUpdateRemainingRoute(
            newRawLocation.latitude,
            newRawLocation.longitude,
            originalRoute,
            lastRouteUpdatePosition
          );

          if (shouldUpdateRemaining) {
            console.log(
              "✂️ Updating remaining route - trimming traveled portion"
            );
            const remainingRoute = createRemainingRoute(
              newRawLocation.latitude,
              newRawLocation.longitude,
              originalRoute
            );

            const traveledPortion = createTraveledRoute(
              newRawLocation.latitude,
              newRawLocation.longitude,
              originalRoute
            );

            setRoute(remainingRoute);
            setTraveledRoute(traveledPortion);
            setLastRouteUpdatePosition({
              lat: newRawLocation.latitude,
              lon: newRawLocation.longitude,
            });
          } else {
            console.log("📍 Position updated, no route changes needed");
          }
        }
      }
    },
    [
      userLocation,
      destination,
      originalRoute,
      route,
      previousUserLocation,
      lastRouteUpdatePosition,
    ]
  );

  const handleGeolocateError = useCallback((e) => {
    console.error("❌ Erreur géolocalisation:", e.data);
    console.error("❌ Code erreur:", e.data?.code);
    console.error("❌ Message:", e.data?.message);
  }, []);

  // Nettoyage des directions et icônes
  useEffect(() => {
    const currentMapRef = mapRef.current;

    return () => {
      // Nettoyer l'instance MapLibre Directions
      cleanupDirections();

      // Nettoyer les icônes de direction
      if (currentMapRef) {
        const map = currentMapRef.getMap();
        if (map) {
          cleanupDirectionIcons(map);
        }
      }
    };
  }, []);

  // Memoize les paramètres initiaux de la carte
  const initialViewState = useMemo(
    () => ({
      latitude: userLocation?.latitude || DEFAULT_COORDS.latitude,
      longitude: userLocation?.longitude || DEFAULT_COORDS.longitude,
      zoom: navigationState === "navigating" ? 18 : 16.5,
      bearing: 0, // Bearing fixe - la boussole native gère l'orientation
      pitch: adaptivePitch, // Utiliser le pitch adaptatif
    }),
    [
      userLocation,
      navigationState,
      adaptivePitch, // Ajouter le pitch adaptatif aux dépendances
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
          maxzoom: 18.4, // Limitation du zoom pour éviter la pixellisation
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

  // Mise à jour dynamique du pitch avec transitions optimales
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      const map = mapRef.current.getMap();

      // Utiliser shouldTransition pour vérifier si une mise à jour est nécessaire
      if (shouldTransition(map.getPitch(), adaptivePitch, 2)) {
        console.log(
          `🎥 Updating pitch: ${map.getPitch().toFixed(1)}° → ${adaptivePitch}°`
        );

        // Utiliser les transitions optimales
        applyOptimalTransition(map, {
          pitch: adaptivePitch,
          speed: speedKmh,
          source: "adaptive-pitch",
          context: pitchMode === "cinematic" ? "cinematic" : "navigation",
        }).catch((error) => {
          console.error("Erreur lors de la transition de pitch:", error);
        });
      }
    }
  }, [adaptivePitch, pitchMode, speedKmh, mapRef, isMapReady]);

  // Configuration des événements du GeolocateControl
  useEffect(() => {
    if (geolocateControlRef.current) {
      const geolocateControl = geolocateControlRef.current;

      // Ajouter les gestionnaires d'événements
      geolocateControl.on("geolocate", handleGeolocate);
      geolocateControl.on("error", handleGeolocateError);

      return () => {
        // Nettoyer les gestionnaires d'événements
        geolocateControl.off("geolocate", handleGeolocate);
        geolocateControl.off("error", handleGeolocateError);
      };
    }
  }, [handleGeolocate, handleGeolocateError]);

  // Gestion initiale des blocs - une seule fois au chargement
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    const map = mapRef.current.getMap();

    // Initialise MapLibre Directions si pas déjà fait
    if (map) {
      initMapLibreDirections(map);
    }

    return () => {
      // Nettoyage global
      const currentMap = map;
      if (currentMap) {
        try {
          currentMap.off("render");
          if (currentMap.getLayer("blocks-fill"))
            currentMap.removeLayer("blocks-fill");
          if (currentMap.getLayer("blocks-border"))
            currentMap.removeLayer("blocks-border");
          if (currentMap.getSource("blocks")) currentMap.removeSource("blocks");
        } catch (cleanupError) {
          console.error("Erreur de nettoyage:", cleanupError);
        }
      }
    };
  }, [isMapReady]);

  // Créer automatiquement la route quand userLocation devient disponible
  useEffect(() => {
    if (
      userLocation &&
      destination &&
      navigationState === "navigating" &&
      !route
    ) {
      console.log(
        "🚀 Position utilisateur disponible - création automatique de la route"
      );
      console.log("📍 De:", userLocation.latitude, userLocation.longitude);
      console.log(
        "📍 Vers:",
        destination.coordinates[1],
        destination.coordinates[0]
      );

      const createRouteAsync = async () => {
        try {
          const routeResult = await createRoute(
            userLocation.latitude,
            userLocation.longitude,
            destination.coordinates[1],
            destination.coordinates[0],
            mapRef.current?.getMap()
          );

          if (routeResult) {
            console.log(
              "✅ Route créée automatiquement avec succès:",
              routeResult
            );
            console.log(
              "📊 Coordonnées route:",
              routeResult.features?.[0]?.geometry?.coordinates?.length,
              "points"
            );
            setRoute(routeResult);
            setOriginalRoute(routeResult);
          } else {
            console.error("❌ Échec de la création automatique de route");
          }
        } catch (error) {
          console.error("❌ Erreur création automatique route:", error);
        }
      };

      createRouteAsync();
    }
  }, [userLocation, destination, navigationState, route]);

  // Surveillance du zoom de la carte
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      const map = mapRef.current.getMap();

      const handleZoomChange = () => {
        const currentZoom = map.getZoom();
        console.log("🔍 Zoom actuel:", currentZoom.toFixed(2));
      };

      // Log initial du zoom
      handleZoomChange();

      // Écouter les changements de zoom
      map.on("zoom", handleZoomChange);
      map.on("zoomend", () => {
        const finalZoom = map.getZoom();
        console.log("🔍 Zoom final:", finalZoom.toFixed(2));
      });

      // Cleanup
      return () => {
        map.off("zoom", handleZoomChange);
        map.off("zoomend", handleZoomChange);
      };
    }
  }, [isMapReady]);

  // Gestion des polygones de blocs - UNIQUEMENT en mode OSM
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      const map = mapRef.current.getMap();

      const manageBlockPolygons = () => {
        try {
          if (mapType === "osm") {
            // Mode OSM : ajouter les polygones
            if (!map.getSource("blocks")) {
              // Ajouter la source blocks
              map.addSource("blocks", {
                type: "geojson",
                data: blocksGeoJSON,
              });
            }

            // Ajouter les couches de polygones si elles n'existent pas
            if (!map.getLayer("blocks-fill")) {
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
            }

            if (!map.getLayer("blocks-border")) {
              map.addLayer({
                id: "blocks-border",
                type: "line",
                source: "blocks",
                paint: {
                  "line-color": "#999",
                  "line-width": 1,
                  "line-opacity": 1.0,
                },
              });
            }

            console.log("🗺️ Polygones des blocs affichés (mode OSM)");
          } else {
            // Mode satellite : supprimer les polygones
            if (map.getLayer("blocks-fill")) {
              map.removeLayer("blocks-fill");
            }
            if (map.getLayer("blocks-border")) {
              map.removeLayer("blocks-border");
            }
            if (map.getSource("blocks")) {
              map.removeSource("blocks");
            }
            console.log("🗺️ Polygones des blocs masqués (mode satellite)");
          }
        } catch (error) {
          console.error("❌ Erreur lors de la gestion des polygones:", error);
        }
      };

      // Si le style est déjà chargé, gérer immédiatement
      if (map.isStyleLoaded()) {
        manageBlockPolygons();
      } else {
        // Sinon, attendre que le style soit chargé
        map.once('styledata', manageBlockPolygons);
      }
    }
  }, [mapType, isMapReady, blocksGeoJSON]); // Déclenché à chaque changement de mapType

  // Debug des états de route
  console.log("🗺️ État routes:", {
    route: route ? `${route.features?.length} features` : "null",
    traveledRoute: traveledRoute
      ? `${traveledRoute.features?.length} features`
      : "null",
    navigationState,
    userLocation: userLocation ? "présent" : "absent",
    destination: destination ? "présent" : "absent",
  });

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
          {/* Contrôles de navigation - boussole toujours visible */}
          <NavigationControl
            showCompass={true}
            showZoom
            position="bottom-right"
          />

          {/* GeolocateControl optimisé avec gestion adaptative de la batterie */}
          <GeolocateControl
            ref={geolocateControlRef}
            positionOptions={gpsOptions}
            fitBoundsOptions={fitBoundsOptions}
            trackUserLocation={true}
            showUserLocation={true}
            showUserHeading={true}
            showAccuracyCircle={true} // Afficher le cercle de précision
            position="bottom-right"
          />

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

          {/* Affichage de l'itinéraire restant avec styles avancés */}
          {route && (
            <>
              {console.log("🗺️ Affichage route:", route)}
              <Source id="route" type="geojson" data={route}>
                {/* Couche d'ombre pour effet de profondeur */}
                <Layer
                  id="route-line-shadow"
                  type="line"
                  paint={{
                    "line-color": "#000000",
                    "line-width": [
                      "interpolate",
                      ["exponential", 1.5],
                      ["zoom"],
                      10,
                      8, // Zoom 10: 8px (ombre)
                      15,
                      10, // Zoom 15: 10px
                      20,
                      16, // Zoom 20: 16px
                    ],
                    "line-opacity": 0.2,
                    "line-blur": 2,
                  }}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round",
                  }}
                />
                {/* Couche de fond (outline) pour meilleur contraste */}
                <Layer
                  id="route-line-casing"
                  type="line"
                  paint={{
                    "line-color": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      10,
                      "#1e40af", // Bleu foncé aux petits zooms
                      15,
                      "#1d4ed8", // Bleu plus intense
                      20,
                      "#1e3a8a", // Bleu très foncé aux gros zooms
                    ],
                    "line-width": [
                      "interpolate",
                      ["exponential", 1.5],
                      ["zoom"],
                      10,
                      6, // Zoom 10: 6px (outline)
                      15,
                      8, // Zoom 15: 8px
                      20,
                      14, // Zoom 20: 14px
                    ],
                    "line-opacity": 0.8,
                  }}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round",
                  }}
                />
                {/* Couche principale de la route avec transitions fluides */}
                <Layer
                  id="route-line"
                  type="line"
                  paint={{
                    "line-color": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      10,
                      navigationState === "navigating" ? "#3b82f6" : "#60a5fa", // Plus vif en navigation
                      15,
                      navigationState === "navigating" ? "#2563eb" : "#3b82f6",
                      20,
                      navigationState === "navigating" ? "#1d4ed8" : "#2563eb",
                    ],
                    "line-width": [
                      "interpolate",
                      ["exponential", 1.5],
                      ["zoom"],
                      10,
                      navigationState === "navigating" ? 4 : 3, // Plus épais en navigation
                      15,
                      navigationState === "navigating" ? 6 : 5,
                      20,
                      navigationState === "navigating" ? 12 : 10,
                    ],
                    "line-opacity": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      10,
                      navigationState === "navigating" ? 0.9 : 0.8,
                      15,
                      navigationState === "navigating" ? 0.95 : 0.9,
                      20,
                      1.0,
                    ],
                  }}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round",
                  }}
                />
                {/* Flèches directionnelles pour la route - TEMPORAIREMENT DÉSACTIVÉES */}
              </Source>
            </>
          )}

          {/* Affichage de la partie parcourue avec styles avancés */}
          {traveledRoute && (
            <Source id="traveled-route" type="geojson" data={traveledRoute}>
              {/* Couche d'ombre pour la route parcourue */}
              <Layer
                id="traveled-route-line-shadow"
                type="line"
                paint={{
                  "line-color": "#000000",
                  "line-width": [
                    "interpolate",
                    ["exponential", 1.5],
                    ["zoom"],
                    10,
                    7, // Zoom 10: 7px (ombre)
                    15,
                    9, // Zoom 15: 9px
                    20,
                    14, // Zoom 20: 14px
                  ],
                  "line-opacity": 0.15,
                  "line-blur": 1.5,
                  "line-dasharray": [3, 3],
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
              {/* Couche de fond pour la route parcourue */}
              <Layer
                id="traveled-route-line-casing"
                type="line"
                paint={{
                  "line-color": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    "#d97706", // Orange foncé
                    15,
                    "#c2410c", // Orange plus intense
                    20,
                    "#9a3412", // Orange très foncé
                  ],
                  "line-width": [
                    "interpolate",
                    ["exponential", 1.5],
                    ["zoom"],
                    10,
                    5, // Zoom 10: 5px (outline)
                    15,
                    7, // Zoom 15: 7px
                    20,
                    12, // Zoom 20: 12px
                  ],
                  "line-opacity": 0.8,
                  "line-dasharray": [3, 3],
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
              {/* Couche principale de la route parcourue avec transitions */}
              <Layer
                id="traveled-route-line"
                type="line"
                paint={{
                  "line-color": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    "#f59e0b", // Orange standard
                    15,
                    "#f97316", // Orange plus vif
                    20,
                    "#ea580c", // Orange profond
                  ],
                  "line-width": [
                    "interpolate",
                    ["exponential", 1.5],
                    ["zoom"],
                    10,
                    2.5, // Zoom 10: 2.5px
                    15,
                    4, // Zoom 15: 4px
                    20,
                    8, // Zoom 20: 8px
                  ],
                  "line-opacity": 1,
                  "line-dasharray": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    ["literal", [2, 2]], // Tirets courts aux petits zooms
                    15,
                    ["literal", [3, 2]], // Tirets moyens
                    20,
                    ["literal", [4, 3]], // Tirets longs aux gros zooms
                  ],
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
              {/* Flèches directionnelles pour la route parcourue - TEMPORAIREMENT DÉSACTIVÉES */}
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

          {/* Le marqueur utilisateur est maintenant géré par showUserLocation du GeolocateControl */}

          {/* Affichage des POIs - toujours visibles */}
          {publicPois.map((poi) => (
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

          {/* Affichage des numéros de blocs - toujours visibles */}
          {blocks.map((block) => {
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
            deviceBearing={0}
            onArrival={handleArrival}
            isOrientationActive={false}
          />
        )}

        {/* Messages d'erreur - Hidden from users */}
        {/* Error messages are logged to console only */}
      </main>

      {/* Modales */}
      <LocationPermissionModalNew
        isOpen={navigationState === "permission"}
        onPermissionGranted={handleLocationPermissionGranted}
        onPermissionDenied={handleLocationPermissionDenied}
      />

      <WelcomeModalMobile
        isOpen={navigationState === "welcome"}
        onDestinationSelected={handleDestinationSelected}
        onCancel={() => setNavigationState("permission")}
        availableBlocks={availableBlocks}
      />

      {destination && (
        <ArrivalModalNew
          isOpen={navigationState === "arrived"}
          destination={destination}
          onNewDestination={handleNewDestination}
          onExitVillage={handleExitVillage}
        />
      )}

      {/* Alertes de navigation intelligentes */}
      <NavigationAlerts
        userLocation={userLocation}
        route={route}
        speedKmh={speedKmh}
        isNavigating={navigationState === "navigating"}
      />

      <Footer />
    </>
  );
}

export default App;
