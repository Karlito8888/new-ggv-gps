import { NavigationControl } from "react-map-gl/maplibre";
import { BsLayersHalf } from "react-icons/bs";
import { Button } from "@radix-ui/themes";
import stopLogo from "../../assets/img/stop.png";
import OrientationToggle from "../OrientationToggle";
import styles from './mapControls.module.css';

/**
 * Composant pour les contrôles de la carte (navigation, géolocalisation, etc.)
 * Migration vers CSS Modules pour un contrôle total de la disposition
 */
export function MapControls({
  navigationState,
  orientationEnabled,
  userLocation,
  handleMapTypeToggle,
  handleNewDestination,
  handleOrientationToggle,
  handleRecenterMap,
}) {
  return (
    <>
      {/* Navigation controls - compass always visible */}
      <NavigationControl showCompass={true} showZoom position="bottom-right" />

      {/* Map type toggle button */}
      <div className={styles.mapTypeSwitcher}>
        <Button
          onClick={handleMapTypeToggle}
          variant="soft"
          title="Satellite view"
          className={styles.mapTypeButton}
        >
          <BsLayersHalf size={25} />
        </Button>
      </div>

      {/* New destination button during navigation */}
      {navigationState === "navigating" && (
        <div className={styles.newDestinationControl}>
          <Button
            onClick={handleNewDestination}
            variant="ghost"
            size="4"
            title="New destination"
            className={styles.newDestinationButton}
          >
            <img src={stopLogo} alt="Nouvelle destination" />
          </Button>
        </div>
      )}

      {/* Device orientation toggle - only visible during navigation */}
      {navigationState === "navigating" && (
        <OrientationToggle
          enabled={orientationEnabled}
          onToggle={handleOrientationToggle}
          position="top-right-above-map-type"
          className={styles.orientationToggle}
        />
      )}

      {/* Recenter GPS button - visible when userLocation available */}
      {userLocation &&
        (navigationState === "navigating" || navigationState === "arrived") && (
          <div className={styles.recenterGpsControl}>
            <Button
              onClick={handleRecenterMap}
              title="Recenter on my location"
              className={styles.recenterGpsButton}
            >
              <span className={styles.recenterIcon}>⌖</span>
            </Button>
          </div>
        )}
    </>
  );
}