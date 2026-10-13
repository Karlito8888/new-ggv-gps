import { getDistanceAlongRoute } from "./geo";
import { TURN_LABELS, type RouteStep } from "./routing";
import type { Destination, UserLocation } from "./types";

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

type RouteCoords = [number, number][] | null;

/** The next significant step ahead of the user on the route, by distance along the route. */
export function currentTurn(
  steps: RouteStep[],
  userLocation: UserLocation | null,
  routeCoords: RouteCoords
): (RouteStep & { distanceToStep: number }) | null {
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
}

/** Total along-route distance to the destination; crow-flies when the route cannot answer. */
export function remainingAlongRoute(
  userLocation: UserLocation | null,
  destination: Destination | null,
  routeCoords: RouteCoords,
  crowFlies: number
): number {
  if (!userLocation || !destination || !routeCoords) return crowFlies;
  const dist = getDistanceAlongRoute(
    userLocation.longitude,
    userLocation.latitude,
    destination.coordinates[0],
    destination.coordinates[1],
    routeCoords
  );
  // Fall back to crow-flies if target is behind or calculation fails
  return dist > 0 ? dist : crowFlies;
}

export function turnLabel(step: RouteStep | null): { en: string; tl: string } {
  return TURN_LABELS[step?.modifier ?? ""] ?? TURN_LABELS.straight;
}
