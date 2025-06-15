import { useState, useEffect } from "react";
import { getNavigationInstructions, hasArrived } from "../lib/navigation";
import "./NavigationDisplay.css";

const NavigationDisplay = ({
  userLocation,
  destination,
  onArrival,
}) => {
  const [instructions, setInstructions] = useState(null);
  const [hasTriggeredArrival, setHasTriggeredArrival] = useState(false);

  useEffect(() => {
    if (!userLocation || !destination) return;

    const navInstructions = getNavigationInstructions(
      userLocation.latitude,
      userLocation.longitude,
      destination.coordinates[1],
      destination.coordinates[0]
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
    onArrival,
    hasTriggeredArrival,
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
    </div>
  );
};

export default NavigationDisplay;
