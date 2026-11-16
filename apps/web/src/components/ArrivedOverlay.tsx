import { COPY, type Destination } from "@ggv/shared";
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
      {/* Top card: title and the destination sign. The centre stays clear for the user and pin. */}
      <div className="modal arrived-top-modal">
        <h1>{COPY.arrived.title.en}</h1>
        <p className="overlay-tagalog">{COPY.arrived.title.tl}</p>

        <div className="arrived-plate">
          <div>
            <span className="arrived-plate-caption">{COPY.arrived.reached.en}</span>
            <span className="arrived-plate-name">
              {destination?.name || COPY.arrived.yourDestination.en}
            </span>
          </div>
          <span className="arrived-plate-check">
            <Icon name="check" />
          </span>
        </div>

        <p className="arrived-gloss">
          {COPY.arrived.reached.tl} {destination?.name || COPY.arrived.yourDestination.tl}.
        </p>
      </div>

      {/* Bottom card: action buttons */}
      <div className="modal arrived-bottom-modal">
        <button className="overlay-btn-primary" onClick={onNavigateAgain}>
          {COPY.arrived.again.en}
          <Icon name="navigate" className="overlay-btn-icon" />
        </button>

        <button className="overlay-btn-secondary" onClick={onExitVillage}>
          <Icon name="exit" className="overlay-btn-icon" />
          {COPY.arrived.exit.en}
        </button>
      </div>
    </div>
  );
}
