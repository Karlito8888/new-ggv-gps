import { COPY } from "@ggv/shared";
import { Icon } from "./Icon";

interface AppOfferOverlayProps {
  storeUrl: string;
  onClose: () => void;
}

/** First screen on a phone: install the native app from its store, or go on with the web app. */
export function AppOfferOverlay({ storeUrl, onClose }: AppOfferOverlayProps) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={COPY.appOffer.aria.en}>
      <div className="modal">
        <div className="overlay-icon-wrapper">
          <Icon name="navigate" className="overlay-icon" />
        </div>

        <p className="overlay-eyebrow">{COPY.brand.village.en}</p>
        <h1>{COPY.appOffer.title.en}</h1>
        <p className="overlay-tagalog">{COPY.appOffer.title.tl}</p>

        <p className="overlay-description">
          {COPY.appOffer.free.en}
          <br />
          {COPY.appOffer.offline.en}
          <span className="tagalog-inline">
            {COPY.appOffer.free.tl}
            <br />
            {COPY.appOffer.offline.tl}
          </span>
        </p>

        <a className="overlay-btn-primary" href={storeUrl} onClick={onClose}>
          {COPY.appOffer.install.en}
          <Icon name="right" className="overlay-btn-icon" />
        </a>

        <button className="overlay-btn-secondary" onClick={onClose}>
          {COPY.appOffer.web.en}
        </button>
      </div>
    </div>
  );
}
