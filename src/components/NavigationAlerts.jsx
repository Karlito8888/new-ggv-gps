import { useState, useEffect, useMemo, useCallback } from 'react';
import { detectTurns, snapToRoad } from '../utils/geoUtils';

const NavigationAlerts = ({
  userLocation,
  route,
  speedKmh = 0,
  isNavigating = false
}) => {
  const [alerts, setAlerts] = useState([]);
  const [lastAlertTime, setLastAlertTime] = useState(0);

  // Utiliser les fonctions optimisées de geoUtils
  const detectTurnsOptimized = useCallback((routeCoordinates, userPos) => {
    const lookAheadDistance = Math.max(50, speedKmh * 2); // Distance d'anticipation basée sur la vitesse
    return detectTurns(routeCoordinates, userPos, lookAheadDistance);
  }, [speedKmh]);

  const snapToRoadOptimized = useCallback((userPos, routeCoordinates) => {
    return snapToRoad(userPos, routeCoordinates, 20); // 20m max distance
  }, []);

  // Analyser la navigation et générer des alertes
  const analyzeNavigation = useMemo(() => {
    if (!isNavigating || !userLocation || !route?.features?.[0]?.geometry?.coordinates) {
      return { alerts: [], snappedPosition: null };
    }

    const routeCoordinates = route.features[0].geometry.coordinates;
    const newAlerts = [];
    
    // Snap-to-road
    const snappedPosition = snapToRoadOptimized(userLocation, routeCoordinates);

    // Détecter les virages à venir
    const upcomingTurns = detectTurnsOptimized(routeCoordinates, userLocation);
    
    // Générer des alertes pour les virages
    upcomingTurns.forEach(turn => {
      const timeToTurn = speedKmh > 0 ? (turn.distance / (speedKmh / 3.6)) : 0;
      
      if (turn.distance < 100 && timeToTurn < 10) { // Moins de 100m ou 10 secondes
        newAlerts.push({
          id: `turn-${turn.coordinates[0]}-${turn.coordinates[1]}`,
          type: 'turn',
          message: `${turn.severity === 'sharp' ? 'Virage serré' : 'Tournez'} à ${turn.direction === 'left' ? 'gauche' : 'droite'} dans ${Math.round(turn.distance)}m`,
          icon: turn.direction === 'left' ? '↰' : '↱',
          priority: turn.severity === 'sharp' ? 'high' : 'medium',
          distance: turn.distance,
          timeToAlert: timeToTurn
        });
      }
    });

    // Alerte de vitesse excessive (si on a des données de vitesse)
    if (speedKmh > 50) { // Plus de 50 km/h dans le village
      newAlerts.push({
        id: 'speed-warning',
        type: 'speed',
        message: `Vitesse élevée: ${Math.round(speedKmh)} km/h`,
        icon: '⚠️',
        priority: 'medium'
      });
    }

    // Alerte de déviation de route
    if (snappedPosition && snappedPosition.distance > 15) {
      newAlerts.push({
        id: 'off-route',
        type: 'deviation',
        message: 'Vous vous éloignez de la route',
        icon: '🔄',
        priority: 'high'
      });
    }

    return { alerts: newAlerts, snappedPosition };
  }, [userLocation, route, speedKmh, isNavigating, detectTurnsOptimized, snapToRoadOptimized]);

  // Mettre à jour les alertes avec throttling
  useEffect(() => {
    const now = Date.now();
    if (now - lastAlertTime > 2000) { // Throttle à 2 secondes
      setAlerts(analyzeNavigation.alerts);
      setLastAlertTime(now);
    }
  }, [analyzeNavigation.alerts, lastAlertTime]);

  // Auto-dismiss des alertes après un délai
  useEffect(() => {
    if (alerts.length > 0) {
      const timer = setTimeout(() => {
        setAlerts(prev => prev.filter(alert => 
          alert.type === 'turn' ? false : true // Garder les alertes non-turn plus longtemps
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
