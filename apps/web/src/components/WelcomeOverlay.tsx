import {
  COPY,
  inline,
  OSM_COPYRIGHT_URL,
  PRIVACY_URL,
  useDestinationChoice,
  type Destination,
} from "@ggv/shared";
import { Icon } from "./Icon";

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
    <div className="overlay" role="dialog" aria-modal="true" aria-label={COPY.welcome.aria.en}>
      <div className="modal welcome-modal">
        <div className="overlay-icon-wrapper">
          <Icon name="pin" className="overlay-icon" />
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

        {selectedBlock && (
          <div className="welcome-block-selector">
            <label htmlFor="lot-select" className="sr-only">
              {COPY.welcome.selectLotLabel.en}
            </label>
            <select
              id="lot-select"
              value={effectiveLot}
              onChange={(e) => setLot(e.target.value)}
              className="welcome-select"
              disabled={isLoadingLots || lotList.length === 0}
            >
              <option value="" disabled>
                {isLoadingLots
                  ? inline(COPY.welcome.loading)
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
        )}

        <button
          className="overlay-btn-primary"
          onClick={navigate}
          disabled={!selectedBlock || !effectiveLot || isLoadingLots}
        >
          <Icon name="navigate" className="overlay-btn-icon" />
          {inline(COPY.welcome.navigate)}
        </button>

        {/* Navigate is the tap that sends the position out: say where, at that very spot. */}
        <p className="route-note">
          {COPY.welcome.routing.en}
          <span className="tagalog-inline">{COPY.welcome.routing.tl}</span>
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
            {inline(COPY.credits.privacy)}
          </a>
        </p>
      </div>

      {/* The map shows dimmed behind the card: its credit, in the corner (OSMF guideline). */}
      <a className="map-credit" href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
        {COPY.credits.osm.en}
      </a>
    </div>
  );
}
