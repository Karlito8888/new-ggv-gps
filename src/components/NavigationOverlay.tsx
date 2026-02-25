import type { Map as MaplibreMap } from "maplibre-gl";
import { m } from "framer-motion";
import { getDistanceAlongRoute } from "../lib/geo";
import type { UserLocation, Destination } from "../hooks/useMapSetup";
import type { RouteStep, RouteGeometry, RouteSourceType } from "../hooks/useRouting";

interface NavigationOverlayProps {
  map: MaplibreMap | null;
  distanceRemaining: number;
  destination: Destination | null;
  steps: RouteStep[];
  routeSource: RouteSourceType | null;
  routeGeoJSON: RouteGeometry | null;
  userLocation: UserLocation | null;
  onCancel: () => void;
}

// React Compiler handles memoization automatically
export function NavigationOverlay({
  map,
  distanceRemaining,
  destination,
  steps,
  routeSource,
  routeGeoJSON,
  userLocation,
  onCancel,
}: NavigationOverlayProps) {
  const formatDistance = (meters: number): string =>
    meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

  // Calculate current step using distance along route (not crow-flies)
  const currentStep = (() => {
    if (!steps?.length || !userLocation || !routeGeoJSON?.coordinates) return null;

    // Flatten MultiLineString coordinates (ORS) to simple coordinate array
    const routeCoords: [number, number][] = Array.isArray(routeGeoJSON.coordinates[0]?.[0])
      ? (routeGeoJSON.coordinates as [number, number][][]).flat()
      : (routeGeoJSON.coordinates as [number, number][]);

    // Find the next significant step that's ahead of the user on the route
    for (const step of steps) {
      if (!step.location || !step.isSignificant) continue;
      if (step.type === "arrive") continue; // Skip arrival step

      const distAlongRoute = getDistanceAlongRoute(
        userLocation.longitude,
        userLocation.latitude,
        step.location[0],
        step.location[1],
        routeCoords
      );

      // Distance < 0 means step is behind us, skip it
      if (distAlongRoute < 0) continue;

      // Found the next upcoming significant step
      return { ...step, distanceToStep: Math.round(distAlongRoute) };
    }

    return null; // No significant steps ahead = continue straight
  })();

  // Zoom handlers - React Compiler handles memoization automatically
  const handleZoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom();
      map.easeTo({ zoom: Math.min(currentZoom + 1, 20), duration: 200 });
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom();
      map.easeTo({ zoom: Math.max(currentZoom - 1, 14), duration: 200 });
    }
  };

  return (
    <m.div
      className="navigation-overlay"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
    >
      <div className="nav-header-compact">
        {/* Turn instruction (left) */}
        <div className="nav-turn">
          {currentStep ? (
            <>
              <span className="nav-turn-icon">{currentStep.icon}</span>
              <span className="nav-turn-dist">{currentStep.distanceToStep}m</span>
            </>
          ) : (
            <span className="nav-turn-icon">↑</span>
          )}
        </div>

        {/* Destination + distance (center) */}
        <div className="nav-center">
          <div className="nav-dest-name">{destination?.name || "Navigating..."}</div>
          <div className="nav-remaining">{formatDistance(distanceRemaining)}</div>
          {routeSource && <div className="nav-source">{routeSource.toUpperCase()}</div>}
        </div>

        {/* Cancel button (right) */}
        <button className="nav-cancel-btn" onClick={onCancel} aria-label="Stop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Map controls */}
      <div className="nav-map-controls">
        <button className="map-control-btn" onClick={handleZoomIn} aria-label="Zoom in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button className="map-control-btn" onClick={handleZoomOut} aria-label="Zoom out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </m.div>
  );
}
