import type { ReactNode } from "react";
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
      {/* The map shows behind the card: its credit, just above the card (OSMF guideline). */}
      <a className="map-credit" href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
        {COPY.credits.osm.en}
      </a>

      <div className="modal">
        <p className="overlay-eyebrow">{COPY.brand.village.en}</p>
        <h1>{COPY.welcome.title.en}</h1>
        <p className="overlay-tagalog">{COPY.welcome.title.tl}</p>

        <div className="welcome-plates">
          <Plate
            id="block-select"
            caption={COPY.welcome.plateBlock.en}
            label={COPY.welcome.selectBlockLabel.en}
            value={selectedBlock}
            placeholder={
              isOffline
                ? COPY.welcome.noConnection
                : isLoadingBlocks
                  ? COPY.welcome.loading
                  : COPY.welcome.selectBlock
            }
            disabled={isLoadingBlocks}
            onChange={setBlock}
          >
            {blocks.map((block) => (
              <option key={block} value={block}>
                {COPY.welcome.block(block)}
              </option>
            ))}
          </Plate>

          {selectedBlock && (
            <Plate
              id="lot-select"
              caption={COPY.welcome.plateLot.en}
              label={COPY.welcome.selectLotLabel.en}
              value={effectiveLot}
              placeholder={
                isLoadingLots
                  ? COPY.welcome.loading
                  : lotList.length === 0
                    ? COPY.welcome.noLots
                    : COPY.welcome.selectLot
              }
              disabled={isLoadingLots || lotList.length === 0}
              onChange={setLot}
            >
              {lotList.map((l) => (
                <option key={l.lot} value={l.lot}>
                  {COPY.welcome.lot(l.lot)}
                </option>
              ))}
            </Plate>
          )}
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
              {COPY.welcome.reload.en}
            </button>
          </div>
        )}

        <button
          className="overlay-btn-primary"
          onClick={navigate}
          disabled={!selectedBlock || !effectiveLot || isLoadingLots}
        >
          {COPY.welcome.navigate.en}
          <Icon name="navigate" className="overlay-btn-icon" />
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
    </div>
  );
}

/**
 * A destination plate: dashed while empty, a green street sign once chosen. The native
 * <select> covers it, invisible, so the OS picker does the choosing and keyboard focus works.
 */
function Plate({
  id,
  caption,
  label,
  value,
  placeholder,
  disabled,
  onChange,
  children,
}: {
  id: string;
  caption: string;
  label: string;
  value: string;
  placeholder: { en: string; tl: string };
  disabled: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className={`welcome-plate${value ? " is-filled" : ""}${disabled ? " is-disabled" : ""}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="welcome-plate-caption" aria-hidden="true">
        {caption}
      </span>
      {value ? (
        <span key={value} className="welcome-plate-value" aria-hidden="true">
          {value}
        </span>
      ) : (
        <span className="welcome-plate-placeholder" aria-hidden="true">
          {placeholder.en}
          <span>({placeholder.tl})</span>
        </span>
      )}
      <Icon name="chevron" className="welcome-plate-chevron" />
      <select
        id={id}
        className="welcome-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="" disabled>
          {inline(placeholder)}
        </option>
        {children}
      </select>
    </div>
  );
}
