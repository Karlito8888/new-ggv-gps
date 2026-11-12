import { COPY } from "@ggv/shared";
import { Icon } from "./Icon";

export function ExitCompleteOverlay() {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={COPY.exit.aria.en}>
      <div className="modal">
        <div className="overlay-icon-wrapper exit-icon-wrapper">
          <Icon name="car" className="overlay-icon" />
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
