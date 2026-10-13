import { COPY, inline, type Destination } from "@ggv/shared";

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
      <div className="modal arrived-modal arrived-top-modal">
        <div className="overlay-icon-wrapper arrived-icon-wrapper">
          <svg
            className="overlay-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
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
          {inline(COPY.arrived.again)}
        </button>

        <button className="overlay-btn-secondary" onClick={onExitVillage}>
          <svg
            className="arrived-exit-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {inline(COPY.arrived.exit)}
        </button>
      </div>
    </div>
  );
}
