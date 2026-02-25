import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { overlayVariants, modalVariants } from "../lib/animations";
import { supabase } from "../lib/supabase";
import type { Destination } from "../hooks/useMapSetup";

interface Block {
  name: string;
}

interface LotData {
  lot: string;
  coordinates: {
    type: string;
    coordinates: [number, number];
  } | null;
}

interface WelcomeOverlayProps {
  blocks: Block[];
  isLoadingBlocks: boolean;
  blocksError: string | null;
  onRetryBlocks: () => void;
  onSelectDestination: (destination: Destination) => void;
}

export function WelcomeOverlay({
  blocks,
  isLoadingBlocks,
  blocksError,
  onRetryBlocks,
  onSelectDestination,
}: WelcomeOverlayProps) {
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedLot, setSelectedLot] = useState("");
  const [lots, setLots] = useState<LotData[]>([]);
  const [isLoadingLots, setIsLoadingLots] = useState(false);

  // Handle block selection change - reset lots and start loading in event handler
  const handleBlockChange = (value: string) => {
    setSelectedBlock(value);
    // Reset lots immediately when block changes (OK in event handler)
    setLots([]);
    setSelectedLot("");
    // Set loading state in handler to avoid setState in effect
    if (value) {
      setIsLoadingLots(true);
    }
  };

  // Fetch lots from Supabase when block changes (async only, no sync setState)
  useEffect(() => {
    if (!selectedBlock) return;

    // Fetch is async - setState in .then() callback is OK
    supabase.rpc("get_lots_by_block", { block_name: selectedBlock }).then(({ data, error }) => {
      if (error) {
        console.error("Error fetching lots:", error);
        setLots([]);
      } else if (data) {
        setLots(data);
        if (data.length > 0) {
          setSelectedLot(data[0].lot);
        }
      }
      setIsLoadingLots(false);
    });
  }, [selectedBlock]);

  const handleNavigate = () => {
    if (selectedBlock && selectedLot) {
      const lot = lots.find((l) => l.lot === selectedLot);
      if (lot?.coordinates) {
        // PostGIS returns GeoJSON: {type: "Point", coordinates: [lng, lat]}
        onSelectDestination({
          type: "lot",
          coordinates: [lot.coordinates.coordinates[0], lot.coordinates.coordinates[1]],
          name: `Block ${selectedBlock}, Lot ${selectedLot}`,
        });
      }
    }
  };

  return (
    <m.div
      className="overlay welcome-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <m.div className="modal welcome-modal" variants={modalVariants}>
        {/* Destination Icon */}
        <div className="welcome-icon-wrapper">
          <svg
            className="welcome-icon"
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

        <h1 className="welcome-title">Choose Destination</h1>
        <p className="welcome-tagalog">(Pumili ng Destinasyon)</p>

        {blocksError ? (
          <div className="welcome-error">
            <p className="welcome-error-text">
              {blocksError}
              <br />
              <span className="welcome-error-tagalog">(Hindi ma-load ang mga block)</span>
            </p>
            <button className="welcome-retry-btn" onClick={onRetryBlocks}>
              Retry (Subukan muli)
            </button>
          </div>
        ) : (
          <div className="welcome-block-selector">
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
                <option key={block.name} value={block.name}>
                  Block {block.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!blocksError && (
          <>
            <div className="welcome-block-selector">
              <select
                id="lot-select"
                value={selectedLot}
                onChange={(e) => setSelectedLot(e.target.value)}
                className="welcome-select"
                disabled={!selectedBlock || isLoadingLots || lots.length === 0}
              >
                <option value="" disabled>
                  {isLoadingLots
                    ? "Loading... (Nag-lo-load...)"
                    : !selectedBlock
                      ? "Select a block first (Pumili muna ng Block)"
                      : lots.length === 0
                        ? "No lots available (Walang available na Lot)"
                        : "Select Lot (Pumili ng Lot)"}
                </option>
                {lots.map((l) => (
                  <option key={l.lot} value={l.lot}>
                    Lot {l.lot}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="welcome-btn"
              onClick={handleNavigate}
              disabled={!selectedBlock || !selectedLot || isLoadingLots}
            >
              <svg
                className="welcome-btn-icon"
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
          </>
        )}
      </m.div>
    </m.div>
  );
}
