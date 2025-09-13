import { useState, useEffect } from "react";
import { getNavigationInstructions, hasArrived, VILLAGE_EXIT_COORDS } from "../lib/navigation";
import styles from './navigationDisplay.module.css';

const NavigationDisplay = ({
  userLocation,
  destination,
  deviceBearing,
  onArrival,
  onExitComplete,
  isOrientationActive = false,
}) => {
  const [instructions, setInstructions] = useState(null);
  const [hasTriggeredArrival, setHasTriggeredArrival] = useState(false);

  useEffect(() => {
    if (!userLocation || !destination) return;

    const navInstructions = getNavigationInstructions(
      userLocation.latitude,
      userLocation.longitude,
      destination.coordinates[1],
      destination.coordinates[0],
      isOrientationActive ? deviceBearing : 0
    );

    setInstructions(navInstructions);

    // Check arrival
    const arrived = hasArrived(
      userLocation.latitude,
      userLocation.longitude,
      destination.coordinates[1],
      destination.coordinates[0]
    );

    if (arrived && !hasTriggeredArrival) {
      setHasTriggeredArrival(true);
      
      // Check if destination is the village exit
      const isExitDestination = 
        destination.coordinates &&
        destination.coordinates[0] === VILLAGE_EXIT_COORDS[0] &&
        destination.coordinates[1] === VILLAGE_EXIT_COORDS[1];
      
      if (isExitDestination && onExitComplete) {
        console.log("🚪 Arrived at village exit - triggering exit complete");
        onExitComplete();
      } else {
        console.log("🎯 Arrived at normal destination - triggering arrival");
        onArrival();
      }
    }
  }, [
    userLocation,
    destination,
    deviceBearing,
    onArrival,
    onExitComplete,
    hasTriggeredArrival,
    isOrientationActive,
  ]);

  if (!instructions || !destination) return null;

  return (
    <div className={styles.navigationDisplay}>
      {/* Panneau de navigation principal */}
      <div className={styles.navigationPanel}>
        <div className={styles.navigationContent}>
          <div className={styles.navigationInfo}>
            <div className={styles.instructionRow}>
              <div className={styles.directionIcon}>
                <span className={styles.directionSymbol}>
                  {instructions.direction.icon}
                </span>
              </div>
              <div>
                <p className={styles.instructionText}>{instructions.instruction}</p>
                <p className={styles.distanceText}>{instructions.distance}</p>
              </div>
            </div>
          </div>

          {destination.blockNumber && destination.lotNumber && (
            <div className={styles.destinationInfo}>
              <p className={styles.destinationLabel}>Destination</p>
              <p className={styles.destinationBlock}>
                Block {destination.blockNumber}
              </p>
              <p className={styles.destinationLot}>Lot {destination.lotNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* Direction indicator with compass */}
      <div className={styles.compassContainer}>
        <div className={styles.compass}>
          <div className={styles.compassFace}>
            {/* Compass background */}
            <div
              className={styles.compassRing}
              style={{
                transform: isOrientationActive
                  ? `rotate(${-deviceBearing}deg)`
                  : "rotate(0deg)",
                transition: "transform 0.3s ease",
              }}
            >
              {/* Cardinal points */}
              <div className={`${styles.cardinalPoint} ${styles.cardinalNorth}`}>N</div>
              <div className={`${styles.cardinalPoint} ${styles.cardinalEast}`}>E</div>
              <div className={`${styles.cardinalPoint} ${styles.cardinalSouth}`}>S</div>
              <div className={`${styles.cardinalPoint} ${styles.cardinalWest}`}>W</div>
            </div>

            {/* Direction arrow to destination */}
            <div
              className={styles.directionArrow}
              style={{
                transform: `rotate(${instructions.relativeBearing}deg)`,
                transition: "transform 0.3s ease",
              }}
            >
              <div className={styles.arrowLine}></div>
              <div className={styles.arrowHead}></div>
            </div>

            {/* Compass center */}
            <div className={styles.compassCenter}>
              <div className={styles.centerDot}></div>
            </div>

            {/* Indication si l'orientation n'est pas active */}
            {!isOrientationActive && (
              <div className={styles.compassInactiveOverlay}>
                <div className={styles.compassInactiveText}>Activez la boussole</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GPS accuracy information */}
      {/* {userLocation.accuracy && (
        <div className={styles.accuracyInfo}>
          <p className={styles.accuracyText}>
            GPS accuracy: ±{Math.round(userLocation.accuracy)}m
          </p>
        </div>
      )} */}
    </div>
  );
};

export default NavigationDisplay;
