import { useState } from "react";
import { useConvexConnectionState, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import type { Destination } from "./types";
import { isCoord } from "./geo";
import { COPY } from "./copy";

export interface LotData {
  lot: string;
  coordinates: {
    lng: number;
    lat: number;
  } | null;
}

/**
 * Block/lot selection logic of the Welcome screen, without any markup.
 *
 * `fallbackLotsByBlock` is the bundled village snapshot (mobile): when the live query has not
 * answered, the snapshot does, so the lot list never waits on the network.
 */
export function useDestinationChoice(
  onSelectDestination: (destination: Destination) => void,
  fallbackLotsByBlock?: Record<string, LotData[]>
) {
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedLot, setSelectedLot] = useState("");

  // Without this, a first visit on a dead network sat on "Loading..." forever with no message and
  // no way out: the Convex queries travel over a WebSocket, so Workbox cannot cache them.
  // `connectionRetries` only increments AFTER a failed attempt, which is what keeps this from
  // flashing during the normal opening handshake. There IS a reload button on purpose: the client
  // does retry, but automatic recovery could not be demonstrated here (network restored, backend
  // answering 200, socket still failing after 90 s), so the UI does not promise it.
  const connection = useConvexConnectionState();
  const isOffline = connection.connectionRetries > 0 && !connection.isWebSocketConnected;

  // Lots (with coords) for the selected block — reactive Convex query (skips when no block)
  const lots = useQuery(
    anyApi.locations.lotsWithCoordsByBlock,
    selectedBlock ? { block: selectedBlock } : "skip"
  ) as LotData[] | undefined;
  const fallbackLots = fallbackLotsByBlock?.[selectedBlock];
  const isLoadingLots = !!selectedBlock && lots === undefined && fallbackLots === undefined;
  // `anyApi` is untyped, so `tsc` cannot see a shape change in the myggv backend. A malformed
  // lot would silently become a `[undefined, undefined]` destination — MapLibre and the OSRM
  // URL both take it without complaining. Dropping it here reuses the existing "No lots
  // available" path instead, so the failure is visible and never reaches navigation.
  const lotList = (lots ?? fallbackLots ?? []).filter(
    (l) => isCoord(l?.coordinates?.lng) && isCoord(l?.coordinates?.lat)
  );

  // Derived selection: honour the user's pick when still valid, else default to the first lot.
  // (Derive during render instead of a setState-in-effect — react.dev "You Might Not Need an Effect".)
  const effectiveLot =
    selectedLot && lotList.some((l) => l.lot === selectedLot)
      ? selectedLot
      : (lotList[0]?.lot ?? "");

  const setBlock = (value: string) => {
    setSelectedBlock(value);
    setSelectedLot("");
  };

  const navigate = () => {
    if (!selectedBlock || !effectiveLot) return;
    const lot = lotList.find((l) => l.lot === effectiveLot);
    if (lot?.coordinates) {
      // Coordinates stored as { lng, lat }
      onSelectDestination({
        type: "lot",
        coordinates: [lot.coordinates.lng, lot.coordinates.lat],
        name: COPY.welcome.destinationName(selectedBlock, effectiveLot),
      });
    }
  };

  return {
    selectedBlock,
    setBlock,
    effectiveLot,
    setLot: setSelectedLot,
    lotList,
    isLoadingLots,
    isOffline,
    navigate,
  };
}
