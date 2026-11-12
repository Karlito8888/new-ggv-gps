import { COPY, inline, type Destination } from "@ggv/shared";
import { Icon } from "./Icon";

interface ArrivedOverlayProps {
  destination: Destination | null;
  onNavigateAgain: () => void;
  onExitVillage: () => void;
}

export function ArrivedOverlay({
  destination,
  onNavigateAgain,
  onExitVillage,
}: ArrivedOverlayProps) {
  return (
    <div
      className="overlay arrived-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={COPY.arrived.aria.en}
    >
      {/* Top mini-modal: success icon + title + description */}
      <div className="modal arrived-top-modal">
        <div className="overlay-icon-wrapper arrived-icon-wrapper">
          <Icon name="arrived" className="overlay-icon" />
        </div>

        <h1>{COPY.arrived.title.en}</h1>
        <p className="overlay-tagalog">({COPY.arrived.title.tl})</p>

        <p className="overlay-description">
          {COPY.arrived.reached.en}{" "}
          <strong>{destination?.name || COPY.arrived.yourDestination.en}</strong>.
          <span className="tagalog-inline">
            {COPY.arrived.reached.tl} {destination?.name || COPY.arrived.yourDestination.tl}.
          </span>
        </p>
      </div>

      {/* Bottom mini-modal: action buttons */}
      <div className="modal arrived-bottom-modal">
        <button className="overlay-btn-primary" onClick={onNavigateAgain}>
          <Icon name="navigate" className="overlay-btn-icon" />
          <span>
            {COPY.arrived.again.en}
            <br />({COPY.arrived.again.tl})
          </span>
        </button>

        <button className="overlay-btn-secondary" onClick={onExitVillage}>
          <Icon name="exit" className="overlay-btn-icon" />
          {inline(COPY.arrived.exit)}
        </button>
      </div>
    </div>
  );
}
