import { NavigationControl } from "react-map-gl/maplibre";
import { BsLayersHalf } from "react-icons/bs";
import stopLogo from "../assets/img/stop.png";
import OrientationToggle from "./OrientationToggle";

/**
 * Composant pour les contrôles de la carte (navigation, géolocalisation, etc.)
 */
export function MapControls({
  navigationState,
  orientationEnabled,
  handleMapTypeToggle,
  handleNewDestination,
  handleOrientationToggle,
}) {
  return (
    <>
      {/* Navigation controls - compass always visible */}
      <NavigationControl showCompass={true} showZoom position="bottom-right" />

      {/* Map type toggle button */}
      <div className="map-type-switcher">
        <button
          onClick={handleMapTypeToggle}
          className="map-type-button"
          title="Satellite view"
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
          position="center-left"
          className="orientation-toggle"
        />
      )}
    </>
  );
}
