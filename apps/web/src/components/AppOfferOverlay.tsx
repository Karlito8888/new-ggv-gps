import { COPY, inline } from "@ggv/shared";
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

        <h1>{COPY.appOffer.title.en}</h1>
        <p className="overlay-tagalog">({COPY.appOffer.title.tl})</p>

        <p className="overlay-description">
          {COPY.appOffer.description.en}
          <span className="tagalog-inline">{COPY.appOffer.description.tl}</span>
        </p>

        <a className="overlay-btn-primary app-offer-store" href={storeUrl} onClick={onClose}>
          {inline(COPY.appOffer.install)}
        </a>

        <button className="overlay-btn-secondary app-offer-web" onClick={onClose}>
          {inline(COPY.appOffer.web)}
        </button>
      </div>
    </div>
  );
}
