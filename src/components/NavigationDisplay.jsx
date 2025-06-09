import { useState, useEffect } from "react";
import { getNavigationInstructions, hasArrived } from "../lib/navigation";

const NavigationDisplay = ({
  userLocation,
  destination,
  deviceBearing,
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
      destination.coordinates[0],
      deviceBearing
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
  ]);

  if (!instructions || !destination) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-40 pointer-events-none">
      {/* Panneau de navigation principal */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-3 pointer-events-auto">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 font-bold text-lg">
                  {instructions.direction.icon}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {instructions.instruction}
                </p>
                <p className="text-gray-600 text-xs">{instructions.distance}</p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500">Destination</p>
            <p className="font-medium text-gray-900 text-sm">
              Block {destination.blockNumber}
            </p>
            <p className="text-gray-600 text-xs">Lot {destination.lotNumber}</p>
          </div>
        </div>
      </div>

      {/* Direction indicator with compass */}
      <div className="flex justify-center">
        <div className="bg-white rounded-full shadow-lg p-3 pointer-events-auto">
          <div className="relative w-16 h-16">
            {/* Compass background */}
            <div
              className="absolute inset-0 rounded-full border-2 border-gray-200"
              style={{
                transform: `rotate(${-deviceBearing}deg)`,
                transition: "transform 0.3s ease",
              }}
            >
              {/* Cardinal points */}
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-600">
                N
              </div>
              <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 text-xs font-bold text-gray-600">
                E
              </div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-600">
                S
              </div>
              <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 text-xs font-bold text-gray-600">
                W
              </div>
            </div>

            {/* Direction arrow to destination */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `rotate(${instructions.relativeBearing}deg)`,
                transition: "transform 0.3s ease",
              }}
            >
              <div className="w-1 h-6 bg-red-500 rounded-full"></div>
              <div className="absolute -top-1 w-2 h-2 bg-red-500 transform rotate-45"></div>
            </div>

            {/* Compass center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* GPS accuracy information */}
      {userLocation.accuracy && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500 bg-white bg-opacity-75 rounded px-2 py-1 inline-block">
            GPS accuracy: ±{Math.round(userLocation.accuracy)}m
          </p>
        </div>
      )}
    </div>
  );
};

export default NavigationDisplay;
