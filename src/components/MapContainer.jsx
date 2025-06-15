// Map container component
// Main MapLibre map component with all child components

import { useRef, useEffect } from "react";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import MapControls from './MapControls.jsx';
import RouteDisplay from './RouteDisplay.jsx';
import MapMarkers from './MapMarkers.jsx';
import NavigationDisplay from './NavigationDisplay.jsx';
import { centerMapOnUser } from '../lib/mapUtils.js';

/**
 * Map Container Component
 * Main map component that orchestrates all map-related functionality
 * @param {Object} props - Component props
 * @param {Object} props.locationTracking - Location tracking hook data
 * @param {Object} props.navigationState - Navigation state hook data
 * @param {Object} props.routeManagement - Route management hook data
 * @param {Object} props.mapConfig - Map configuration hook data
 * @param {Object} props.mapLibreSetup - MapLibre setup hook data
 * @returns {JSX.Element} Map container JSX
 */
function MapContainer({
  locationTracking,
  navigationState,
  routeManagement,
  mapConfig,
  mapLibreSetup,
}) {
  const mapRef = useRef(null);

  const { userLocation } = locationTracking;
  const { destination, isNavigatingState, handlers } = navigationState;
  const {
    mapStyle,
    initialViewState,
    mapInteractions,
    handleMapLoad,
    handleMapError,
  } = mapConfig;
  const { setupMapLibre } = mapLibreSetup;

  /**
   * Handle map load event
   * Initialize MapLibre setup when map is ready
   */
  const onMapLoad = () => {
    console.log('🗺️ Map loaded, initializing MapLibre setup...');
    handleMapLoad();
    
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      setupMapLibre(map);
    }
  };

  /**
   * Auto-center map on user during navigation
   */
  useEffect(() => {
    if (mapRef.current && userLocation && isNavigatingState) {
      centerMapOnUser(mapRef, userLocation, 18, 1000);
    }
  }, [userLocation, isNavigatingState]);

  return (
    <Map
      ref={mapRef}
      initialViewState={initialViewState}
      mapStyle={mapStyle}
      onLoad={onMapLoad}
      onError={handleMapError}
      {...mapInteractions}
    >
      {/* Map Controls */}
      <MapControls
        mapRef={mapRef}
        locationTracking={locationTracking}
        mapConfig={mapConfig}
        navigationState={navigationState}
      />

      {/* Route Display */}
      <RouteDisplay routeManagement={routeManagement} />

      {/* Map Markers */}
      <MapMarkers
        locationTracking={locationTracking}
        navigationState={navigationState}
      />

      {/* Navigation Display (overlay) */}
      {isNavigatingState && userLocation && destination && (
        <NavigationDisplay
          userLocation={userLocation}
          destination={destination}
          onArrival={handlers.onArrival}
        />
      )}
    </Map>
  );
}

export default MapContainer;