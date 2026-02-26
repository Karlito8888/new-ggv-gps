import type { Map as MaplibreMap } from "maplibre-gl";
import { m } from "framer-motion";
import { getDistanceAlongRoute, flattenCoordinates } from "../lib/geo";
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
  isRecalculating: boolean;
  isOffCenter: boolean;
  onRecenter: () => void;
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
  isRecalculating,
  isOffCenter,
  onRecenter,
  onCancel,
}: NavigationOverlayProps) {
  const formatDistance = (meters: number): string =>
    meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

  // Flatten route coordinates once for reuse
  const routeCoords: [number, number][] | null = routeGeoJSON?.coordinates
    ? flattenCoordinates(routeGeoJSON)
    : null;

  // Calculate current step using distance along route (not crow-flies)
  const currentStep = (() => {
    if (!steps?.length || !userLocation || !routeCoords) return null;

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

  // Compute total along-route distance to destination
  const totalDistanceRemaining = (() => {
    if (!userLocation || !destination || !routeCoords) return distanceRemaining;
    const dist = getDistanceAlongRoute(
      userLocation.longitude,
      userLocation.latitude,
      destination.coordinates[0],
      destination.coordinates[1],
      routeCoords
    );
    // Fall back to crow-flies if target is behind or calculation fails
    return dist > 0 ? dist : distanceRemaining;
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
    <>
      {/* Top pill — turn instruction + distance + cancel */}
      <m.nav
        className="nav-top-pill"
        aria-label="Navigation info"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="nav-turn">
          {isRecalculating ? (
            <>
              <span className="nav-turn-icon nav-recalc-spin">↻</span>
              <span className="nav-turn-text" aria-live="polite">
                Recalculating...
                <span className="tagalog-inline">(Kinakalkula muli...)</span>
              </span>
            </>
          ) : currentStep ? (
            <>
              <span className="nav-turn-icon">{currentStep.icon}</span>
              <span className="nav-turn-text" aria-live="polite">
                {currentStep.modifier
                  ? `${currentStep.type === "turn" ? "Turn" : ""} ${currentStep.modifier}`.trim()
                  : "Continue"}
              </span>
            </>
          ) : routeSource === "direct" ? (
            <span className="nav-turn-text" aria-live="polite">
              Head toward destination
            </span>
          ) : (
            <span className="nav-turn-icon">↑</span>
          )}
        </div>

        <div className="nav-turn-dist" aria-live="off">
          {isRecalculating
            ? "..."
            : currentStep
              ? `${currentStep.distanceToStep}m`
              : formatDistance(distanceRemaining)}
        </div>

        <button className="nav-cancel-btn" onClick={onCancel} aria-label="Cancel navigation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </m.nav>

      {/* Bottom strip — destination + compass/distance */}
      <m.nav
        className="nav-bottom-strip"
        aria-label={`Destination info${destination?.name ? `: navigating to ${destination.name}` : ""}`}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="nav-dest-name">
          <span className="nav-dest-icon">📍</span>
          <span className="nav-dest-text">{destination?.name || "Navigating..."}</span>
        </div>

        <div className="nav-compass-text" aria-live="off">
          {formatDistance(totalDistanceRemaining)}
        </div>
      </m.nav>

      {/* Map controls — separate floating element */}
      <div className="nav-map-controls">
        {isOffCenter && (
          <button
            className="map-control-btn recenter-btn"
            onClick={onRecenter}
            aria-label="Re-center map (I-center muli ang mapa)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>
        )}
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
    </>
  );
}
