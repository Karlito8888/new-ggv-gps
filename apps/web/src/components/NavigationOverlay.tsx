import {
  COPY,
  currentTurn,
  formatDistance,
  remainingAlongRoute,
  turnLabel,
  type Destination,
  type IconName,
  type RouteGeometry,
  type RouteSourceType,
  type RouteStep,
  type UserLocation,
} from "@ggv/shared";
import { Icon } from "./Icon";

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

  // What the turn card shows: arrow, distance to read while walking, instruction if any.
  const card: { icon: IconName; distance: string; text?: { en: string; tl: string } } =
    isRecalculating
      ? { icon: "spinner", distance: "…", text: COPY.nav.recalculating }
      : currentStep
        ? {
            icon: currentStep.icon,
            distance: formatDistance(currentStep.distanceToStep),
            text: label,
          }
        : routeSource === "direct"
          ? {
              icon: "navigate",
              distance: formatDistance(distanceRemaining),
              text: COPY.nav.headToward,
            }
          : { icon: "straight", distance: formatDistance(distanceRemaining) };

  return (
    <>
      <nav className="nav-top-pill" aria-label={COPY.nav.infoAria.en}>
        <div className="nav-turn-icon">
          <Icon name={card.icon} className={isRecalculating ? "spin" : undefined} />
        </div>

        <div className="nav-turn-body">
          <div className="nav-turn-dist" aria-live="off">
            {card.distance}
          </div>
          {card.text && (
            <div className="nav-turn-text" aria-live="polite">
              {card.text.en}
              <span className="nav-turn-gloss">({card.text.tl})</span>
            </div>
          )}
        </div>

        <button className="nav-cancel-btn" onClick={onCancel} aria-label={COPY.nav.cancelAria.en}>
          <Icon name="close" />
        </button>
      </nav>

      <nav className="nav-bottom-strip" aria-label={COPY.nav.destinationAria(destination?.name)}>
        <div className="nav-dest-name">
          <Icon name="pin" className="nav-dest-icon" />
          <span className="nav-dest-text">{destination?.name || COPY.nav.navigating.en}</span>
        </div>

        <div className="nav-compass-text" aria-live="off">
          {formatDistance(totalDistanceRemaining)}
        </div>
      </nav>
    </>
  );
}
