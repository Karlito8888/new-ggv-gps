import { useState, useEffect, useMemo, useCallback } from 'react';
import { detectTurns, snapToRoad } from '../utils/geoUtils';

const NavigationAlerts = ({
  userLocation,
  route,
  isNavigating = false
}) => {
  const [alerts, setAlerts] = useState([]);
  const [lastAlertTime, setLastAlertTime] = useState(0);

  // Use optimized geoUtils functions with fixed distance
  const detectTurnsOptimized = useCallback((routeCoordinates, userPos) => {
    const lookAheadDistance = 100; // Fixed 100m look-ahead distance
    return detectTurns(routeCoordinates, userPos, lookAheadDistance);
  }, []);

  const snapToRoadOptimized = useCallback((userPos, routeCoordinates) => {
    return snapToRoad(userPos, routeCoordinates, 20); // 20m max distance
  }, []);

  // Analyze navigation and generate alerts
  const analyzeNavigation = useMemo(() => {
    if (!isNavigating || !userLocation || !route?.features?.[0]?.geometry?.coordinates) {
      return { alerts: [], snappedPosition: null };
    }

    const routeCoordinates = route.features[0].geometry.coordinates;
    const newAlerts = [];
    
    // Snap-to-road
    const snappedPosition = snapToRoadOptimized(userLocation, routeCoordinates);

    // Detect upcoming turns
    const upcomingTurns = detectTurnsOptimized(routeCoordinates, userLocation);
    
    // Generate turn alerts
    upcomingTurns.forEach(turn => {
      const timeToTurn = 0; // Time calculation removed
      
      if (turn.distance < 100 && timeToTurn < 10) { // Moins de 100m ou 10 secondes
        newAlerts.push({
          id: `turn-${turn.coordinates[0]}-${turn.coordinates[1]}`,
          type: 'turn',
          message: `${turn.severity === 'sharp' ? 'Sharp turn' : 'Turn'} ${turn.direction === 'left' ? 'left' : 'right'} in ${Math.round(turn.distance)}m`,
          icon: turn.direction === 'left' ? '↰' : '↱',
          priority: turn.severity === 'sharp' ? 'high' : 'medium',
          distance: turn.distance,
          timeToAlert: timeToTurn
        });
      }
    });

    // Speed alerts removed (not needed)

    // Route deviation alert
    if (snappedPosition && snappedPosition.distance > 15) {
      newAlerts.push({
        id: 'off-route',
        type: 'deviation',
        message: 'You are moving away from the route',
        icon: '🔄',
        priority: 'high'
      });
    }

    return { alerts: newAlerts, snappedPosition };
  }, [userLocation, route, isNavigating, detectTurnsOptimized, snapToRoadOptimized]);

  // Update alerts with throttling
  useEffect(() => {
    const now = Date.now();
    if (now - lastAlertTime > 2000) { // Throttle to 2 seconds
      setAlerts(analyzeNavigation.alerts);
      setLastAlertTime(now);
    }
  }, [analyzeNavigation.alerts, lastAlertTime]);

  // Auto-dismiss alerts after delay
  useEffect(() => {
    if (alerts.length > 0) {
      const timer = setTimeout(() => {
        setAlerts(prev => prev.filter(alert => 
          alert.type === 'turn' ? false : true // Keep non-turn alerts longer
        ));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [alerts]);

  if (!isNavigating || alerts.length === 0) {
    return null;
  }

  return (
    <div className="navigation-alerts">
      {alerts.map(alert => (
        <div 
          key={alert.id}
          className={`navigation-alert ${alert.priority}`}
        >
          <span className="alert-icon">{alert.icon}</span>
          <span className="alert-message">{alert.message}</span>
        </div>
      ))}
    </div>
  );
};

export default NavigationAlerts;
