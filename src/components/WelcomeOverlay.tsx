import { useState } from "react";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import type { Destination } from "../hooks/useMapSetup";

interface LotData {
  lot: string;
  coordinates: {
    lng: number;
    lat: number;
  } | null;
}

interface WelcomeOverlayProps {
  blocks: string[];
  isLoadingBlocks: boolean;
  onSelectDestination: (destination: Destination) => void;
}

export function WelcomeOverlay({
  blocks,
  isLoadingBlocks,
  onSelectDestination,
}: WelcomeOverlayProps) {
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedLot, setSelectedLot] = useState("");

  // Lots (with coords) for the selected block — reactive Convex query (skips when no block)
  const lots = useQuery(
    anyApi.locations.lotsWithCoordsByBlock,
    selectedBlock ? { block: selectedBlock } : "skip"
  ) as LotData[] | undefined;
  const isLoadingLots = !!selectedBlock && lots === undefined;
  // `anyApi` is untyped, so `tsc` cannot see a shape change in the myggv backend. A malformed
  // lot would silently become a `[undefined, undefined]` destination — MapLibre and the OSRM
  // URL both take it without complaining. Dropping it here reuses the existing "No lots
  // available" path instead, so the failure is visible and never reaches navigation.
  const lotList = (lots ?? []).filter(
    (l) => typeof l?.coordinates?.lng === "number" && typeof l?.coordinates?.lat === "number"
  );

  // Derived selection: honour the user's pick when still valid, else default to the first lot.
  // (Derive during render instead of a setState-in-effect — react.dev "You Might Not Need an Effect".)
  const effectiveLot =
    selectedLot && lotList.some((l) => l.lot === selectedLot)
      ? selectedLot
      : (lotList[0]?.lot ?? "");

  const handleBlockChange = (value: string) => {
    setSelectedBlock(value);
    setSelectedLot("");
  };

  const handleNavigate = () => {
    if (!selectedBlock || !effectiveLot) return;
    const lot = lotList.find((l) => l.lot === effectiveLot);
    if (lot?.coordinates) {
      // Coordinates stored as { lng, lat }
      onSelectDestination({
        type: "lot",
        coordinates: [lot.coordinates.lng, lot.coordinates.lat],
        name: `Block ${selectedBlock}, Lot ${effectiveLot}`,
      });
    }
  };

  return (
    <div
      className="overlay welcome-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Choose Destination"
    >
      <div className="modal welcome-modal">
        {/* Destination Icon */}
        <div className="overlay-icon-wrapper">
          <svg
            className="overlay-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>

        <h1>Choose Destination</h1>
        <p className="overlay-tagalog">(Pumili ng Destinasyon)</p>

        <div className="welcome-block-selector">
          <label htmlFor="block-select" className="sr-only">
            Select Block
          </label>
          <select
            id="block-select"
            value={selectedBlock}
            onChange={(e) => handleBlockChange(e.target.value)}
            className="welcome-select"
            disabled={isLoadingBlocks}
          >
            <option value="" disabled>
              {isLoadingBlocks ? "Loading... (Nag-lo-load...)" : "Select Block (Pumili ng Block)"}
            </option>
            {blocks.map((block) => (
              <option key={block} value={block}>
                Block {block}
              </option>
            ))}
          </select>
        </div>

        <div className="welcome-block-selector">
          <label htmlFor="lot-select" className="sr-only">
            Select Lot
          </label>
          <select
            id="lot-select"
            value={effectiveLot}
            onChange={(e) => setSelectedLot(e.target.value)}
            className="welcome-select"
            disabled={!selectedBlock || isLoadingLots || lotList.length === 0}
          >
            <option value="" disabled>
              {isLoadingLots
                ? "Loading... (Nag-lo-load...)"
                : !selectedBlock
                  ? "Select a block first (Pumili muna ng Block)"
                  : lotList.length === 0
                    ? "No lots available (Walang available na Lot)"
                    : "Select Lot (Pumili ng Lot)"}
            </option>
            {lotList.map((l) => (
              <option key={l.lot} value={l.lot}>
                Lot {l.lot}
              </option>
            ))}
          </select>
        </div>

        <button
          className="overlay-btn-primary"
          onClick={handleNavigate}
          disabled={!selectedBlock || !effectiveLot || isLoadingLots}
        >
          <svg
            className="overlay-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Navigate
        </button>
      </div>
    </div>
  );
}
