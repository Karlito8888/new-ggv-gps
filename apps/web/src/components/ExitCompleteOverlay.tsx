import { COPY } from "@ggv/shared";

export function ExitCompleteOverlay() {
  return (
    <div
      className="overlay exit-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={COPY.exit.aria.en}
    >
      <div className="modal exit-modal">
        {/* Wave Icon */}
        <div className="overlay-icon-wrapper exit-icon-wrapper">
          <svg
            className="overlay-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
        </div>

        <h1>{COPY.exit.title.en}</h1>
        <p className="overlay-tagalog">({COPY.exit.title.tl})</p>

        <p className="overlay-description">
          {COPY.exit.exited.en}
          <br />
          {COPY.exit.thanks.en}
          <span className="tagalog-inline">
            {COPY.exit.exited.tl}
            <br />
            {COPY.exit.thanks.tl}
          </span>
        </p>
      </div>
    </div>
  );
}
