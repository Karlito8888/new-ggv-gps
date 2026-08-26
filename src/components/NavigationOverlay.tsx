import { getDistanceAlongRoute } from "../lib/geo";
import { TURN_LABELS } from "../lib/routing";
import type { UserLocation, Destination } from "../types/map";
import type { RouteStep, RouteGeometry, RouteSourceType } from "../hooks/useRouting";

interface NavigationOverlayProps {
  distanceRemaining: number;
  destination: Destination | null;
  steps: RouteStep[];
  routeSource: RouteSourceType | null;
  routeGeoJSON: RouteGeometry | null;
  userLocation: UserLocation | null;
  isRecalculating: boolean;
  onCancel: () => void;
}

// React Compiler handles memoization automatically
export function NavigationOverlay({
  distanceRemaining,
  destination,
  steps,
  routeSource,
  routeGeoJSON,
  userLocation,
  isRecalculating,
  onCancel,
}: NavigationOverlayProps) {
  const formatDistance = (meters: number): string =>
    meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

  const routeCoords: [number, number][] | null = routeGeoJSON?.coordinates ?? null;

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

  const label = TURN_LABELS[currentStep?.modifier ?? ""] ?? TURN_LABELS.straight;

  return (
    <>
      {/* Top pill — turn instruction + distance + cancel */}
      <nav className="nav-top-pill" aria-label="Navigation info">
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
                {label.en}
                <span className="tagalog-inline">({label.tl})</span>
              </span>
            </>
          ) : routeSource === "direct" ? (
            <span className="nav-turn-text" aria-live="polite">
              Head toward destination
              <span className="tagalog-inline">(Tumungo sa destinasyon)</span>
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
      </nav>

      {/* Bottom strip — destination + compass/distance */}
      <nav
        className="nav-bottom-strip"
        aria-label={`Destination info${destination?.name ? `: navigating to ${destination.name}` : ""}`}
      >
        <div className="nav-dest-name">
          <span className="nav-dest-icon">📍</span>
          <span className="nav-dest-text">{destination?.name || "Navigating..."}</span>
        </div>

        <div className="nav-compass-text" aria-live="off">
          {formatDistance(totalDistanceRemaining)}
        </div>
      </nav>
    </>
  );
}
