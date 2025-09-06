import { useState, useEffect } from "react";
import { getNavigationInstructions, hasArrived } from "../lib/navigation";

const NavigationDisplay = ({
  userLocation,
  destination,
  deviceBearing,
  onArrival,
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

    // Vérifier l'arrivée
    const arrived = hasArrived(
      userLocation.latitude,
      userLocation.longitude,
      destination.coordinates[1],
      destination.coordinates[0]
    );

    if (arrived && !hasTriggeredArrival) {
      setHasTriggeredArrival(true);
      onArrival();
    }
  }, [
    userLocation,
    destination,
    deviceBearing,
    onArrival,
    hasTriggeredArrival,
    isOrientationActive,
  ]);

  if (!instructions || !destination) return null;

  return (
    <div className="navigation-display">
      {/* Panneau de navigation principal */}
      <div className="navigation-panel">
        <div className="navigation-content">
          <div className="navigation-info">
            <div className="instruction-row">
              <div className="direction-icon">
                <span className="direction-symbol">
                  {instructions.direction.icon}
                </span>
              </div>
              <div>
                <p className="instruction-text">{instructions.instruction}</p>
                <p className="distance-text">{instructions.distance}</p>
              </div>
            </div>
          </div>

          {destination.blockNumber && destination.lotNumber && (
            <div className="destination-info">
              <p className="destination-label">Destination</p>
              <p className="destination-block">
                Block {destination.blockNumber}
              </p>
              <p className="destination-lot">Lot {destination.lotNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* Direction indicator with compass */}
      <div className="compass-container">
        <div className="compass">
          <div className="compass-face">
            {/* Compass background */}
            <div
              className="compass-ring"
              style={{
                transform: isOrientationActive
                  ? `rotate(${-deviceBearing}deg)`
                  : "rotate(0deg)",
                transition: "transform 0.3s ease",
              }}
            >
              {/* Cardinal points */}
              <div className="cardinal-point cardinal-north">N</div>
              <div className="cardinal-point cardinal-east">E</div>
              <div className="cardinal-point cardinal-south">S</div>
              <div className="cardinal-point cardinal-west">W</div>
            </div>

            {/* Direction arrow to destination */}
            <div
              className="direction-arrow"
              style={{
                transform: `rotate(${instructions.relativeBearing}deg)`,
                transition: "transform 0.3s ease",
              }}
            >
              <div className="arrow-line"></div>
              <div className="arrow-head"></div>
            </div>

            {/* Compass center */}
            <div className="compass-center">
              <div className="center-dot"></div>
            </div>

            {/* Indication si l'orientation n'est pas active */}
            {!isOrientationActive && (
              <div className="compass-inactive-overlay">
                <div className="compass-inactive-text">Activez la boussole</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GPS accuracy information */}
      {/* {userLocation.accuracy && (
        <div className="accuracy-info">
          <p className="accuracy-text">
            GPS accuracy: ±{Math.round(userLocation.accuracy)}m
          </p>
        </div>
      )} */}
    </div>
  );
};

export default NavigationDisplay;
