import { m } from "framer-motion";
import { overlayVariants, modalVariants } from "../lib/animations";

export function ExitCompleteOverlay() {
  return (
    <m.div
      className="overlay exit-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <m.div className="modal exit-modal" variants={modalVariants}>
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

        <h1>Safe Travels!</h1>
        <p className="overlay-tagalog exit-tagalog">(Ingat sa byahe!)</p>

        <p className="overlay-description">
          You have exited Garden Grove Village.
          <br />
          Thank you for using MyGGV GPS!
          <span className="tagalog-inline">
            Lumabas ka na sa Garden Grove Village.
            <br />
            Salamat sa paggamit ng MyGGV GPS!
          </span>
        </p>
      </m.div>
    </m.div>
  );
}
