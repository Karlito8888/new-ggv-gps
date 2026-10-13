import { useEffect, useEffectEvent, useRef } from "react";
import { nextBearing } from "./course";
import { trace } from "./trace";
import type { UserLocation } from "./types";

export const NAV_PITCH = 50; // 3D chase-cam tilt (MapLibre maxPitch is 60)
export const NAV_ZOOM = 17;
export const FOLLOW_MS = 1000; // ~ GPS cadence (1 Hz): each easeTo ends as the next fix arrives
export const RESUME_MS = 5000; // auto-resume following after a user pan

/**
 * The camera of whichever renderer is in use. `easeTo` must be linear and uninterruptible by
 * reduced-motion settings (web: `easing: t => t, essential: true`; mobile: `easing: "linear"`).
 * `onUserPan` fires only on user gestures, never on programmatic moves, and returns its
 * unsubscribe function.
 */
export interface CameraDriver {
  jumpTo(o: { center: [number, number]; bearing: number; pitch: number; zoom: number }): void;
  easeTo(o: { center: [number, number]; bearing: number; duration: number }): void;
  onUserPan(cb: () => void): () => void;
}

/**
 * Single camera driver for course-up 3D navigation — GPS course only, no sensor.
 *
 * On every GPS fix it eases the map to the user position with a bearing derived
 * from the GPS course (see lib/course). The user can pan to look around; the
 * camera resumes following automatically after RESUME_MS. Pitch/zoom are set
 * once per session so the user's pinch-zoom sticks afterward.
 *
 * Replaces the former DeviceOrientation/compass stack and the competing
 * setCenter/easeTo drivers with one coordinated animation.
 */
export function useCourseUpCamera(
  driver: CameraDriver | null,
  isNavigating: boolean,
  userLocation: UserLocation | null
): void {
  const bearingRef = useRef(0);
  const followingRef = useRef(true);
  const initializedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset camera session state when navigation stops.
  useEffect(() => {
    if (!isNavigating) {
      initializedRef.current = false;
      followingRef.current = true;
    }
  }, [isNavigating]);

  // Suspend following on user pan, resume after a delay.
  useEffect(() => {
    if (!driver) return;
    const onUserPan = () => {
      followingRef.current = false;
      clearTimeout(resumeTimerRef.current ?? undefined);
      resumeTimerRef.current = setTimeout(() => {
        followingRef.current = true;
      }, RESUME_MS);
    };
    const unsubscribe = driver.onUserPan(onUserPan);
    return () => {
      unsubscribe();
      clearTimeout(resumeTimerRef.current ?? undefined);
    };
  }, [driver]);

  // Follow the user on each GPS fix (latest driver/nav state via effect event).
  const follow = useEffectEvent((loc: UserLocation) => {
    if (!driver || !isNavigating || !followingRef.current) return;
    bearingRef.current = nextBearing(bearingRef.current, loc.heading ?? null, loc.speed ?? null);
    const center: [number, number] = [loc.longitude, loc.latitude];

    // First fix: snap to the 3D nav view. jumpTo is instant, so the rapid GPS
    // fixes that follow can't interrupt (and freeze) a pitch/zoom animation.
    if (!initializedRef.current) {
      initializedRef.current = true;
      trace("cam:jump");
      driver.jumpTo({ center, bearing: bearingRef.current, pitch: NAV_PITCH, zoom: NAV_ZOOM });
      return;
    }

    // Subsequent fixes: ease center + bearing only. Omitting pitch/zoom keeps
    // whatever the user set via pinch-zoom / two-finger tilt.
    trace("cam:ease", { bearing: bearingRef.current });
    driver.easeTo({ center, bearing: bearingRef.current, duration: FOLLOW_MS });
  });

  // `isNavigating` is a dependency on purpose: without it the 3D nav view only engaged on the
  // *next* GPS fix, so tapping Navigate left the map at the village-wide north-up view for a
  // whole GPS interval — and for good, if the watch went quiet.
  useEffect(() => {
    if (userLocation) follow(userLocation);
  }, [userLocation, isNavigating]);
}
