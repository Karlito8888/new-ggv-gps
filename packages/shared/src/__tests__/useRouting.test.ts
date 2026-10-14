/**
 * @vitest-environment jsdom
 *
 * The one contract the gate could not defend, and that reached production three times:
 * a route request must survive the GPS stream.
 *
 * `useRouting`'s effect lists the origin coordinates in its dependencies, so it re-runs on every
 * GPS fix, and React runs the previous cleanup before each re-run. When that cleanup aborted the
 * in-flight request, every fix cancelled the answer the user was waiting for — and the movement
 * guard then declined to start a new one. Result: no line, no instructions, not even the
 * direct-line fallback, for as long as the round-trip outlasted the GPS cadence.
 *
 * No timers here, real or fake: the fake `fetch` hands back its own resolver, so "the network has
 * not answered yet" is a state this test holds rather than a delay it waits for. The fixes are
 * then pushed synchronously. `pending[0].aborted` is the assertion that names the defect; the
 * `onRouteDisplay` one is the user-visible consequence. Both fail on the pre-2026-08-26 code.
 *
 * jsdom is declared per file so the four pure-function suites keep running in node.
 */
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { useRouting } from "../useRouting";
import type { UserLocation, Destination } from "../types";

const ORIGIN: UserLocation = { latitude: 14.3478, longitude: 120.9513 };
const DEST: Destination = { name: "Block 1, Lot 3", coordinates: [120.9525, 14.3495] };

const osrmOk = {
  code: "Ok",
  routes: [
    {
      geometry: {
        type: "LineString",
        coordinates: [
          [120.9513, 14.3478],
          [120.952, 14.3488],
          [120.9525, 14.3495],
        ],
      },
      distance: 260,
      legs: [
        {
          steps: [
            {
              maneuver: { type: "turn", modifier: "left", location: [120.952, 14.3488] },
              distance: 120,
            },
            { maneuver: { type: "arrive", location: [120.9525, 14.3495] }, distance: 0 },
          ],
        },
      ],
    },
  ],
};

/** One in-flight OSRM call the test drives by hand. */
interface PendingRequest {
  deliver: () => void;
  aborted: boolean;
}

let pending: PendingRequest[];
let onRouteDisplay: Mock;
const onOffRoute = () => {};

/** Six GPS fixes of ~1.7 m each: jitter, far below the 30 m recalculation threshold. */
function pushFixes(rerender: (props: { origin: UserLocation }) => void): void {
  for (let i = 1; i <= 6; i++) {
    act(() => {
      rerender({
        origin: { latitude: ORIGIN.latitude + i * 0.000015, longitude: ORIGIN.longitude },
      });
    });
  }
}

beforeEach(() => {
  pending = [];
  onRouteDisplay = vi.fn();

  vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
    const { promise, resolve, reject } = Promise.withResolvers<Response>();
    const entry: PendingRequest = {
      deliver: () => resolve({ json: async () => osrmOk } as unknown as Response),
      aborted: false,
    };
    init?.signal?.addEventListener("abort", () => {
      entry.aborted = true;
      reject(new DOMException("The operation was aborted.", "AbortError"));
    });
    pending.push(entry);
    return promise;
  });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useRouting under a live GPS stream", () => {
  test("a fix arriving mid-request does not cancel it", () => {
    const { rerender } = renderHook(
      ({ origin }: { origin: UserLocation }) =>
        useRouting(true, origin, DEST, onRouteDisplay, onOffRoute),
      { initialProps: { origin: ORIGIN } }
    );
    expect(pending).toHaveLength(1);

    pushFixes(rerender);

    expect(pending[0].aborted).toBe(false);
  });

  test("the route is drawn once the answer arrives, fixes notwithstanding", async () => {
    const { rerender } = renderHook(
      ({ origin }: { origin: UserLocation }) =>
        useRouting(true, origin, DEST, onRouteDisplay, onOffRoute),
      { initialProps: { origin: ORIGIN } }
    );
    pushFixes(rerender);

    await act(async () => {
      pending[0].deliver();
    });

    expect(onRouteDisplay).toHaveBeenCalled();
    const drawn = onRouteDisplay.mock.calls.at(-1)![0];
    expect(drawn.type).toBe("LineString");
    expect(drawn.coordinates.at(-1)).toEqual([120.9525, 14.3495]);
  });

  test("jitter below the threshold issues exactly one request", () => {
    const { rerender } = renderHook(
      ({ origin }: { origin: UserLocation }) =>
        useRouting(true, origin, DEST, onRouteDisplay, onOffRoute),
      { initialProps: { origin: ORIGIN } }
    );
    pushFixes(rerender);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("stopping navigation mid-request erases the line and drops the request", () => {
    const { rerender } = renderHook(
      ({ dest }: { dest: Destination | null }) =>
        useRouting(true, ORIGIN, dest, onRouteDisplay, onOffRoute),
      { initialProps: { dest: DEST as Destination | null } }
    );
    expect(pending[0].aborted).toBe(false);

    act(() => {
      rerender({ dest: null });
    });

    expect(onRouteDisplay).toHaveBeenCalledWith(null);
    expect(pending[0].aborted).toBe(true);
  });

  test("after a cancel, the previous destination's route is not shown for the next one", async () => {
    const DEST_B: Destination = { name: "Block 9, Lot 1", coordinates: [120.95, 14.346] };
    const { result, rerender } = renderHook(
      ({ dest }: { dest: Destination | null }) =>
        useRouting(true, ORIGIN, dest, onRouteDisplay, onOffRoute),
      { initialProps: { dest: DEST as Destination | null } }
    );
    await act(async () => {
      pending[0].deliver();
    });
    expect(result.current.routeGeoJSON).not.toBeNull();

    act(() => {
      rerender({ dest: null });
    });
    onRouteDisplay.mockClear();
    act(() => {
      rerender({ dest: DEST_B });
    });

    // B's answer has not arrived: nothing of A may leak into B's first render.
    expect(result.current.routeGeoJSON).toBeNull();
    expect(result.current.steps).toEqual([]);
    expect(result.current.routeSource).toBeNull();
    expect(onRouteDisplay).not.toHaveBeenCalled();
  });

  test("cancelling mid-request then reselecting the same destination requests again", () => {
    const { rerender } = renderHook(
      ({ dest }: { dest: Destination | null }) =>
        useRouting(true, ORIGIN, dest, onRouteDisplay, onOffRoute),
      { initialProps: { dest: DEST as Destination | null } }
    );
    expect(pending).toHaveLength(1);

    act(() => {
      rerender({ dest: null });
    });
    act(() => {
      rerender({ dest: DEST });
    });

    // Same destination, no movement: without a reset the 30 m guard refused this request.
    expect(pending).toHaveLength(2);
  });

  test("off-route does not force a recalculation while a request is in flight", async () => {
    // ~43 m east of the origin, ~35 m off the first segment: beyond the 25 m threshold.
    const off = (east: number): UserLocation => ({
      latitude: ORIGIN.latitude,
      longitude: ORIGIN.longitude + east,
    });
    const now = vi.spyOn(Date, "now").mockReturnValue(100_000);
    const { rerender } = renderHook(
      ({ origin }: { origin: UserLocation }) =>
        useRouting(true, origin, DEST, onRouteDisplay, onOffRoute),
      { initialProps: { origin: ORIGIN } }
    );
    await act(async () => {
      pending[0].deliver();
    });

    // Moving 43 m issues the normal recalculation; its answer is still pending.
    act(() => {
      rerender({ origin: off(0.0004) });
    });
    expect(pending).toHaveLength(2);

    // 4 s later (past the old 3 s cooldown), still off route and still waiting.
    now.mockReturnValue(104_000);
    act(() => {
      rerender({ origin: off(0.00042) });
    });

    expect(pending).toHaveLength(2);
    expect(pending[1].aborted).toBe(false);
  });
});
