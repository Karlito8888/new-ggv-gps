import {
  COPY,
  OSM_COPYRIGHT_URL,
  OSM_FIX_URL,
  PRIVACY_URL,
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
  useCreditsBubble,
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
  const credits = useCreditsBubble();

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
        {credits.open && (
          <p className="nav-credits">
            <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
              {COPY.credits.osm.en}
            </a>
            {" · "}
            <a href={OSM_FIX_URL} target="_blank" rel="noopener noreferrer">
              {COPY.credits.fixMap.en}
            </a>
            {credits.open === "manual" && (
              <>
                {" · "}
                <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                  {COPY.credits.privacy.en}
                </a>
              </>
            )}
          </p>
        )}

        <div className="nav-dest-name">
          <Icon name="pin" className="nav-dest-icon" />
          <span className="nav-dest-text">{destination?.name || COPY.nav.navigating.en}</span>
        </div>

        <div className="nav-compass-text" aria-live="off">
          {formatDistance(totalDistanceRemaining)}
        </div>

        <button
          className="nav-credits-btn"
          onClick={credits.toggle}
          aria-label={COPY.credits.aria.en}
          aria-expanded={credits.open !== null}
        >
          <Icon name="info" />
        </button>
      </nav>
    </>
  );
}
