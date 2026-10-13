import {
  COPY,
  currentTurn,
  formatDistance,
  remainingAlongRoute,
  turnLabel,
  type Destination,
  type RouteGeometry,
  type RouteSourceType,
  type RouteStep,
  type UserLocation,
} from "@ggv/shared";

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
  const routeCoords: [number, number][] | null = routeGeoJSON?.coordinates ?? null;

  const currentStep = currentTurn(steps, userLocation, routeCoords);
  const totalDistanceRemaining = remainingAlongRoute(
    userLocation,
    destination,
    routeCoords,
    distanceRemaining
  );
  const label = turnLabel(currentStep);

  return (
    <>
      {/* Top pill — turn instruction + distance + cancel */}
      <nav className="nav-top-pill" aria-label={COPY.nav.infoAria.en}>
        <div className="nav-turn">
          {isRecalculating ? (
            <>
              <span className="nav-turn-icon nav-recalc-spin">↻</span>
              <span className="nav-turn-text" aria-live="polite">
                {COPY.nav.recalculating.en}
                <span className="tagalog-inline">({COPY.nav.recalculating.tl})</span>
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
              {COPY.nav.headToward.en}
              <span className="tagalog-inline">({COPY.nav.headToward.tl})</span>
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

        <button className="nav-cancel-btn" onClick={onCancel} aria-label={COPY.nav.cancelAria.en}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </nav>

      {/* Bottom strip — destination + compass/distance */}
      <nav className="nav-bottom-strip" aria-label={COPY.nav.destinationAria(destination?.name)}>
        <div className="nav-dest-name">
          <span className="nav-dest-icon">📍</span>
          <span className="nav-dest-text">{destination?.name || COPY.nav.navigating.en}</span>
        </div>

        <div className="nav-compass-text" aria-live="off">
          {formatDistance(totalDistanceRemaining)}
        </div>
      </nav>
    </>
  );
}
