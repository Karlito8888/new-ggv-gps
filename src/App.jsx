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
import OrientationToggle from "./components/OrientationToggle";
import useDeviceOrientation from "./hooks/useDeviceOrientation";

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
  // REFS AND DATA HOOKS
  // ========================================
  const mapRef = useRef(null);
  const geolocateControlRef = useRef(null);
  const { data: availableBlocks = [] } = useAvailableBlocks();

  // ========================================
  // NAVIGATION STATES
  // ========================================
  const [navigationState, setNavigationState] = useState("permission"); // permission, welcome, navigating, arrived
  const [rawUserLocation, setRawUserLocation] = useState(null);
  const [previousUserLocation, setPreviousUserLocation] = useState(null);

  // ========================================
  // GPS PROCESSING HOOKS
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

  // Adaptive GPS optimization for battery saving
  const { gpsOptions, fitBoundsOptions } = useAdaptiveGPS(
    speed,
    navigationState === "navigating"
  );

  // Adaptive pitch based on speed and context
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
  const [orientationEnabled, setOrientationEnabled] = useState(false);

  // Device orientation hook - only enabled during navigation
  const { compass, isActive } = useDeviceOrientation({
    enabled: orientationEnabled && navigationState === "navigating",
    smoothingFactor: 0.8,
    throttleMs: 100
  });

  // Default coordinates (Garden Grove Village)
  const DEFAULT_COORDS = {
    latitude: 14.347872973134175,
    longitude: 120.95134859887523,
  };

  // ========================================
  // HANDLERS AND UTILITY FUNCTIONS
  // ========================================
  const getCurrentPosition = () => {
    if (!userLocation && navigator.geolocation) {
      console.log("📍 Getting current position...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("📍 Current position retrieved:", position);
          const newRawLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          console.log(
            "📍 Coordinates:",
            newRawLocation.latitude,
            newRawLocation.longitude,
            "±" + newRawLocation.accuracy + "m"
          );
          setRawUserLocation(newRawLocation);
        },
        (error) => {
          console.error("❌ Error retrieving position:", error);
        },
        {
          enableHighAccuracy: false,
          timeout: GEOLOCATION_CONFIG.TIMEOUT,
          maximumAge: GEOLOCATION_CONFIG.MAX_AGE,
        }
      );
    }
  };

  // Event handlers for modals
  const handleLocationPermissionGranted = () => {
    console.log("🔓 Geolocation permission granted");
    setNavigationState("welcome");

    // Trigger GeolocateControl to get position
    if (geolocateControlRef.current) {
      console.log("🎯 Triggering GeolocateControl...");
      geolocateControlRef.current.trigger();

      // Get current position after delay
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
    console.log("🎯 Destination selected:", dest);
    console.log(
      "📍 Position utilisateur disponible:",
      userLocation ? "OUI" : "NON"
    );

    setDestination(dest);
    setNavigationState("navigating");

    // Reset recalculation state for new navigation
    resetRecalculationState();

    // Wait for user position to be available
    if (!userLocation) {
      console.log("⏳ Attente de la position utilisateur...");
      // Route will be automatically created in useEffect when userLocation becomes available
      return;
    }

    // Create route if we have user position
    console.log("🚀 Attempting route creation...");
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

      // Ensure FeatureCollection format for MapLibre
      const routeData = {
        type: "FeatureCollection",
        features:
          routeResult.type === "Feature"
            ? [routeResult]
            : routeResult.features || [],
      };

      console.log("📍 Route created:", routeData);
      setRoute(routeData);
      setOriginalRoute(routeData); // Store the complete route
      setLastRouteUpdatePosition({
        lat: userLocation.latitude,
        lon: userLocation.longitude,
      });

      // Update recalculation state after successful route creation
      updateRecalculationState(userLocation.latitude, userLocation.longitude);
    } catch (error) {
      console.error("❌ Route creation error:", error);
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

        // Ensure FeatureCollection format for MapLibre
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
        console.error("Exit route creation error:", error);
        // Error logged to console only - not shown to user
      }
    }
  };

  // Event handlers for GeolocateControl events
  const handleGeolocate = useCallback(
    (e) => {
      console.log("📍 GPS position received:", e);
      const position = e.data || e; // Event can be in e.data or directly in e
      if (!position || !position.coords) {
        console.warn("⚠️ Position GPS invalide:", position);
        return;
      }
      console.log(
        "📍 Coordinates:",
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
              // Ensure FeatureCollection format for MapLibre
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
              console.error("Route update error:", error);
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
    console.error("❌ Geolocation error:", e.data);
    console.error("❌ Error code:", e.data?.code);
    console.error("❌ Message:", e.data?.message);
  }, []);

  // Cleanup directions and icons
  useEffect(() => {
    const currentMapRef = mapRef.current;

    return () => {
      // Clean up MapLibre Directions instance
      cleanupDirections();

      // Clean up direction icons
      if (currentMapRef) {
        const map = currentMapRef.getMap();
        if (map) {
          cleanupDirectionIcons(map);
        }
      }
    };
  }, []);

  // Memoize initial map parameters
  const initialViewState = useMemo(
    () => ({
      latitude: userLocation?.latitude || DEFAULT_COORDS.latitude,
      longitude: userLocation?.longitude || DEFAULT_COORDS.longitude,
      zoom: navigationState === "navigating" ? 18 : 16.5,
      bearing: 0, // Fixed bearing - native compass handles orientation
      pitch: adaptivePitch, // Use adaptive pitch
    }),
    [
      userLocation,
      navigationState,
      adaptivePitch, // Add adaptive pitch to dependencies
      DEFAULT_COORDS.latitude,
      DEFAULT_COORDS.longitude,
    ]
  );

  const getPolygonCenter = (coords) => {
    if (!coords || coords.length === 0) return [0, 0];
    const polygon = new Polygon([coords]);
    return polygon.getInteriorPoint().getCoordinates();
  };

  // Memoization of blocks in GeoJSON with calculated centers
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

  // Memoize map style
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
          maxzoom: 18.4, // Zoom limitation to avoid pixelation
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

  // Dynamic pitch update with optimal transitions
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      const map = mapRef.current.getMap();

      // Use shouldTransition to check if update is needed
      if (shouldTransition(map.getPitch(), adaptivePitch, 2)) {
        console.log(
          `🎥 Updating pitch: ${map.getPitch().toFixed(1)}° → ${adaptivePitch}°`
        );

        // Use optimal transitions
        applyOptimalTransition(map, {
          pitch: adaptivePitch,
          speed: speedKmh,
          source: "adaptive-pitch",
          context: pitchMode === "cinematic" ? "cinematic" : "navigation",
        }).catch((error) => {
          console.error("Error during pitch transition:", error);
        });
      }
    }
  }, [adaptivePitch, pitchMode, speedKmh, mapRef, isMapReady]);

  // Device orientation effect - update map bearing with device compass
  useEffect(() => {
    if (mapRef.current && isMapReady && orientationEnabled && isActive && navigationState === "navigating") {
      const map = mapRef.current.getMap();
      
      // Use shouldTransition to check if bearing update is needed
      const currentBearing = map.getBearing();
      const targetBearing = compass;
      
      // Calculate bearing difference (accounting for 360° wraparound)
      let bearingDiff = Math.abs(targetBearing - currentBearing);
      if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;
      
      if (shouldTransition(currentBearing, targetBearing, 5)) {
        console.log(
          `🧭 Updating bearing: ${currentBearing.toFixed(1)}° → ${targetBearing.toFixed(1)}°`
        );

        // Use optimal transitions for smooth bearing updates
        applyOptimalTransition(map, {
          bearing: targetBearing,
          speed: speedKmh,
          source: "device-orientation",
          context: "navigation",
        }).catch((error) => {
          console.error("Error during bearing transition:", error);
        });
      }
    }
  }, [compass, isActive, orientationEnabled, navigationState, speedKmh, mapRef, isMapReady]);

  // Handle orientation toggle
  const handleOrientationToggle = useCallback((enabled) => {
    console.log(`🧭 Orientation ${enabled ? 'enabled' : 'disabled'}`);
    setOrientationEnabled(enabled);
    
    // If disabling orientation, reset map bearing to north
    if (!enabled && mapRef.current && isMapReady) {
      const map = mapRef.current.getMap();
      applyOptimalTransition(map, {
        bearing: 0,
        speed: speedKmh,
        source: "orientation-reset",
        context: "navigation",
      }).catch((error) => {
        console.error("Error resetting bearing:", error);
      });
    }
  }, [speedKmh, mapRef, isMapReady]);

  // GeolocateControl event configuration
  useEffect(() => {
    if (geolocateControlRef.current) {
      const geolocateControl = geolocateControlRef.current;

      // Add event handlers
      geolocateControl.on("geolocate", handleGeolocate);
      geolocateControl.on("error", handleGeolocateError);

      return () => {
        // Clean up event handlers
        geolocateControl.off("geolocate", handleGeolocate);
        geolocateControl.off("error", handleGeolocateError);
      };
    }
  }, [handleGeolocate, handleGeolocateError]);

  // Initial block management - once at load
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    const map = mapRef.current.getMap();

    // Initialize MapLibre Directions if not already done
    if (map) {
      initMapLibreDirections(map);
    }

    return () => {
      // Global cleanup
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
          console.error("Cleanup error:", cleanupError);
        }
      }
    };
  }, [isMapReady]);

  // Automatically create route when userLocation becomes available
  useEffect(() => {
    if (
      userLocation &&
      destination &&
      navigationState === "navigating" &&
      !route
    ) {
      console.log(
        "🚀 User position available - automatic route creation"
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
              "✅ Route created automatically successfully:",
              routeResult
            );
            console.log(
              "📊 Route coordinates:",
              routeResult.features?.[0]?.geometry?.coordinates?.length,
              "points"
            );
            setRoute(routeResult);
            setOriginalRoute(routeResult);
          } else {
            console.error("❌ Automatic route creation failed");
          }
        } catch (error) {
          console.error("❌ Automatic route creation error:", error);
        }
      };

      createRouteAsync();
    }
  }, [userLocation, destination, navigationState, route]);

  // Monitor map zoom
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      const map = mapRef.current.getMap();

      const handleZoomChange = () => {
        const currentZoom = map.getZoom();
        console.log("🔍 Zoom actuel:", currentZoom.toFixed(2));
      };

      // Log initial du zoom
      handleZoomChange();

      // Listen to zoom changes
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

  // Block polygon management - OSM mode ONLY
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      const map = mapRef.current.getMap();

      const manageBlockPolygons = () => {
        try {
          if (mapType === "osm") {
            // OSM mode: add polygons
            if (!map.getSource("blocks")) {
              // Add blocks source
              map.addSource("blocks", {
                type: "geojson",
                data: blocksGeoJSON,
              });
            }

            // Add polygon layers if they don't exist
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

            console.log("🗺️ Block polygons displayed (OSM mode)");
          } else {
            // Satellite mode: remove polygons
            if (map.getLayer("blocks-fill")) {
              map.removeLayer("blocks-fill");
            }
            if (map.getLayer("blocks-border")) {
              map.removeLayer("blocks-border");
            }
            if (map.getSource("blocks")) {
              map.removeSource("blocks");
            }
            console.log("🗺️ Block polygons hidden (satellite mode)");
          }
        } catch (error) {
          console.error("❌ Error managing polygons:", error);
        }
      };

      // If style is already loaded, manage immediately
      if (map.isStyleLoaded()) {
        manageBlockPolygons();
      } else {
        // Otherwise, wait for style to load
        map.once('styledata', manageBlockPolygons);
      }
    }
  }, [mapType, isMapReady, blocksGeoJSON]); // Triggered on each mapType change

  // Debug route states
  console.log("🗺️ Route states:", {
    route: route ? `${route.features?.length} features` : "null",
    traveledRoute: traveledRoute
      ? `${traveledRoute.features?.length} features`
      : "null",
    navigationState,
    userLocation: userLocation ? "present" : "absent",
    destination: destination ? "present" : "absent",
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
          {/* Map controls - always available */}
          {/* Navigation controls - compass always visible */}
          <NavigationControl
            showCompass={true}
            showZoom
            position="bottom-right"
          />

          {/* Optimized GeolocateControl with adaptive battery management and orientation */}
          <GeolocateControl
            ref={geolocateControlRef}
            positionOptions={gpsOptions}
            fitBoundsOptions={{
              ...fitBoundsOptions,
              maxZoom: navigationState === "navigating" ? 18 : 16, // Higher zoom during navigation
              bearing: orientationEnabled && isActive ? compass : 0, // Use device orientation
              pitch: adaptivePitch, // Use adaptive pitch
            }}
            trackUserLocation={true}
            showUserLocation={true}
            showUserHeading={orientationEnabled && isActive} // Show heading arrow when orientation is active
            showAccuracyCircle={!orientationEnabled} // Hide accuracy circle when using orientation (cleaner UI)
            position="bottom-right"
          />

          {/* Map type toggle button */}
          <div className="map-type-switcher">
            <button
              onClick={() =>
                setMapType(mapType === "osm" ? "satellite" : "osm")
              }
              className="map-type-button"
              title={mapType === "osm" ? "Satellite view" : "Map view"}
            >
              <BsLayersHalf size={25} />
            </button>
          </div>

          {/* New destination button during navigation */}
          {navigationState === "navigating" && (
            <div className="new-destination-control">
              <button
                onClick={handleNewDestination}
                className="new-destination-button"
                title="New destination"
              >
                <img src={stopLogo} alt="Nouvelle destination" />
              </button>
            </div>
          )}

          {/* Device orientation toggle - only visible during navigation */}
          {navigationState === "navigating" && (
            <OrientationToggle
              enabled={orientationEnabled}
              onToggle={handleOrientationToggle}
              position="top-left"
              className="orientation-toggle"
            />
          )}

          {/* Display remaining route with advanced styles */}
          {route && (
            <>
              {console.log("🗺️ Route display:", route)}
              <Source id="route" type="geojson" data={route}>
                {/* Shadow layer for depth effect */}
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
                {/* Background layer (outline) for better contrast */}
                <Layer
                  id="route-line-casing"
                  type="line"
                  paint={{
                    "line-color": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      10,
                      "#1e40af", // Dark blue at small zooms
                      15,
                      "#1d4ed8", // More intense blue
                      20,
                      "#1e3a8a", // Very dark blue at high zooms
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
                {/* Main route layer with smooth transitions */}
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
                      navigationState === "navigating" ? 4 : 3, // Thicker during navigation
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
                {/* Directional arrows for route - TEMPORARILY DISABLED */}
              </Source>
            </>
          )}

          {/* Display traveled portion with advanced styles */}
          {traveledRoute && (
            <Source id="traveled-route" type="geojson" data={traveledRoute}>
              {/* Shadow layer for traveled route */}
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
              {/* Background layer for traveled route */}
              <Layer
                id="traveled-route-line-casing"
                type="line"
                paint={{
                  "line-color": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    "#d97706", // Dark orange
                    15,
                    "#c2410c", // More intense orange
                    20,
                    "#9a3412", // Very dark orange
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
              {/* Main traveled route layer with transitions */}
              <Layer
                id="traveled-route-line"
                type="line"
                paint={{
                  "line-color": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    "#f59e0b", // Standard orange
                    15,
                    "#f97316", // More vivid orange
                    20,
                    "#ea580c", // Deep orange
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
                    ["literal", [2, 2]], // Short dashes at small zooms
                    15,
                    ["literal", [3, 2]], // Medium dashes
                    20,
                    ["literal", [4, 3]], // Long dashes at high zooms
                  ],
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
              {/* Directional arrows for traveled route - TEMPORARILY DISABLED */}
            </Source>
          )}

          {/* Destination marker */}
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

          {/* User marker is now handled by showUserLocation of GeolocateControl */}

          {/* POI display - always visible */}
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

          {/* Block number display - always visible */}
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

        {/* Navigation interface */}
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

      {/* Modals */}
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

      {/* Smart navigation alerts */}
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
