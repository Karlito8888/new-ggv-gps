// Route display component
// Handles rendering of main route and traveled route on MapLibre

import { Source, Layer } from "react-map-gl/maplibre";
import { ROUTE_STYLES } from '../lib/mapStyles.js';

/**
 * Route Display Component
 * Renders route layers on MapLibre map
 * @param {Object} props - Component props
 * @param {Object} props.routeManagement - Route management hook data
 * @returns {JSX.Element|null} Route layers JSX or null
 */
function RouteDisplay({ routeManagement }) {
  const { route, traveledRoute } = routeManagement;

  return (
    <>
      {/* Main Route Display */}
      {route && (
        <Source id="route" type="geojson" data={route}>
          <Layer
            id="route-line"
            type="line"
            paint={ROUTE_STYLES.route}
          />
        </Source>
      )}

      {/* Traveled Route Display */}
      {traveledRoute && (
        <Source id="traveled-route" type="geojson" data={traveledRoute}>
          <Layer
            id="traveled-route-line"
            type="line"
            paint={ROUTE_STYLES.traveled}
          />
        </Source>
      )}
    </>
  );
}

export default RouteDisplay;