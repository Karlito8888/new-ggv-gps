import { useState, useEffect } from "react";
import { isUserOffRoute } from "../lib/navigation";
import "./OffRouteIndicator.css";

const OffRouteIndicator = ({ userLocation, route, onRecalculateRequest }) => {
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!userLocation || !route || !route.features || !route.features[0]) {
      setIsOffRoute(false);
      setShowIndicator(false);
      return;
    }

    const routeGeometry = route.features[0].geometry;
    const offRoute = isUserOffRoute(
      userLocation.latitude,
      userLocation.longitude,
      routeGeometry
    );

    setIsOffRoute(offRoute);

    if (offRoute && !showIndicator) {
      // Show indicator with a slight delay to avoid flickering
      const timer = setTimeout(() => setShowIndicator(true), 2000);
      return () => clearTimeout(timer);
    } else if (!offRoute) {
      setShowIndicator(false);
    }
  }, [userLocation, route, showIndicator]);

  const handleRecalculate = () => {
    setShowIndicator(false);
    onRecalculateRequest();
  };

  if (!showIndicator || !isOffRoute) return null;

  return (
    <div className="off-route-indicator">
      <div className="off-route-content">
        <div className="off-route-icon">🛣️</div>
        <div className="off-route-text">
          <h3>You're off the route</h3>
          <p>Would you like to recalculate?</p>
        </div>
        <div className="off-route-actions">
          <button className="recalculate-button" onClick={handleRecalculate}>
            Recalculate
          </button>
          <button
            className="dismiss-button"
            onClick={() => setShowIndicator(false)}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default OffRouteIndicator;
