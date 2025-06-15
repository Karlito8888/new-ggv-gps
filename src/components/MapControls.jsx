// Map controls component
// Handles geolocate, map type switcher, and new destination buttons

import { BsLayersHalf } from "react-icons/bs";
import { centerMapOnUser } from '../lib/mapUtils.js';
import stopLogo from "../assets/img/stop.png";

/**
 * Map Controls Component
 * Renders custom map control buttons
 * @param {Object} props - Component props
 * @param {Object} props.mapRef - MapLibre map reference
 * @param {Object} props.locationTracking - Location tracking hook data
 * @param {Object} props.mapConfig - Map configuration hook data
 * @param {Object} props.navigationState - Navigation state hook data
 * @returns {JSX.Element} Map controls JSX
 */
function MapControls({ 
  mapRef, 
  locationTracking, 
  mapConfig, 
  navigationState 
}) {
  const { userLocation } = locationTracking;
  const { toggleMapType, getMapTypeInfo } = mapConfig;
  const { isNavigatingState, handlers } = navigationState;

  const mapTypeInfo = getMapTypeInfo();

  /**
   * Handle geolocate button click
   * Centers map on user location
   */
  const handleGeolocateClick = () => {
    if (userLocation && mapRef.current) {
      console.log('🎯 Centering map on user location');
      centerMapOnUser(mapRef, userLocation, 18, 1000);
    } else {
      console.log('❌ No user location available for centering');
    }
  };

  /**
   * Handle map type toggle
   */
  const handleMapTypeToggle = () => {
    console.log(`🗺️ Switching to ${mapTypeInfo.next} view`);
    toggleMapType();
  };

  /**
   * Handle new destination button click
   */
  const handleNewDestination = () => {
    console.log('🔄 Requesting new destination');
    handlers.onNewDestination();
  };

  return (
    <>
      {/* Geolocate Control */}
      <div className="geolocate-control-custom">
        <button
          onClick={handleGeolocateClick}
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

      {/* Map Type Switcher */}
      <div className="map-type-switcher">
        <button
          onClick={handleMapTypeToggle}
          className="map-type-button"
          title={mapTypeInfo.title}
        >
          <BsLayersHalf size={25} />
        </button>
      </div>

      {/* New Destination Button (only during navigation) */}
      {isNavigatingState && (
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
    </>
  );
}

export default MapControls;