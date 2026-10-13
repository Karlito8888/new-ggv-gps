/**
 * Shared map vocabulary — the two shapes every navigation module speaks.
 *
 * They live here rather than in `useMapSetup` because six modules need the words without
 * needing the hook: `import type` is erased at compile time, so nothing changes at runtime,
 * but the dependency graph stops pointing at a 370-line hook for a two-field interface.
 */

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
}

export interface Destination {
  name: string;
  coordinates: [number, number];
  type?: string;
}
