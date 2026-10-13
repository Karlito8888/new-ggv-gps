import { COPY, inline, useDestinationChoice, type Destination } from "@ggv/shared";

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
  const {
    selectedBlock,
    setBlock,
    effectiveLot,
    setLot,
    lotList,
    isLoadingLots,
    isOffline,
    navigate,
  } = useDestinationChoice(onSelectDestination);

  return (
    <div
      className="overlay welcome-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={COPY.welcome.aria.en}
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

        <h1>{COPY.welcome.title.en}</h1>
        <p className="overlay-tagalog">({COPY.welcome.title.tl})</p>

        <div className="welcome-block-selector">
          <label htmlFor="block-select" className="sr-only">
            {COPY.welcome.selectBlockLabel.en}
          </label>
          <select
            id="block-select"
            value={selectedBlock}
            onChange={(e) => setBlock(e.target.value)}
            className="welcome-select"
            disabled={isLoadingBlocks}
          >
            <option value="" disabled>
              {isOffline
                ? inline(COPY.welcome.noConnection)
                : isLoadingBlocks
                  ? inline(COPY.welcome.loading)
                  : inline(COPY.welcome.selectBlock)}
            </option>
            {blocks.map((block) => (
              <option key={block} value={block}>
                {COPY.welcome.block(block)}
              </option>
            ))}
          </select>
        </div>

        {isOffline && (
          <div className="welcome-offline" role="status">
            <p>
              {COPY.welcome.offlineMessage.en}
              <span className="tagalog-inline">{COPY.welcome.offlineMessage.tl}</span>
            </p>
            <button
              type="button"
              className="overlay-btn-secondary"
              onClick={() => window.location.reload()}
            >
              {inline(COPY.welcome.reload)}
            </button>
          </div>
        )}

        <div className="welcome-block-selector">
          <label htmlFor="lot-select" className="sr-only">
            {COPY.welcome.selectLotLabel.en}
          </label>
          <select
            id="lot-select"
            value={effectiveLot}
            onChange={(e) => setLot(e.target.value)}
            className="welcome-select"
            disabled={!selectedBlock || isLoadingLots || lotList.length === 0}
          >
            <option value="" disabled>
              {isLoadingLots
                ? inline(COPY.welcome.loading)
                : !selectedBlock
                  ? inline(COPY.welcome.selectBlockFirst)
                  : lotList.length === 0
                    ? inline(COPY.welcome.noLots)
                    : inline(COPY.welcome.selectLot)}
            </option>
            {lotList.map((l) => (
              <option key={l.lot} value={l.lot}>
                {COPY.welcome.lot(l.lot)}
              </option>
            ))}
          </select>
        </div>

        <button
          className="overlay-btn-primary"
          onClick={navigate}
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
          {inline(COPY.welcome.navigate)}
        </button>
      </div>
    </div>
  );
}
