import { useState } from "react";
import { COPY, inline, PRIVACY_URL } from "@ggv/shared";
import { Icon } from "./Icon";

interface GpsPermissionOverlayProps {
  onGrant: () => void;
  triggerGeolocate: () => Promise<GeolocationPosition>;
  isMapReady: boolean;
}

export function GpsPermissionOverlay({
  onGrant,
  triggerGeolocate,
  isMapReady,
}: GpsPermissionOverlayProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnableGPS = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      // Browser permission prompt, then the continuous GPS watch (first fix resolves)
      await triggerGeolocate();
      // Permission granted, proceed to welcome screen
      onGrant();
    } catch (err) {
      console.error("GPS permission error:", err);
      setError(inline(COPY.gps.retry));
      setIsRequesting(false);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={COPY.gps.aria.en}>
      <div className="modal">
        <div className={`overlay-icon-wrapper${isRequesting ? " is-searching" : ""}`}>
          <Icon name="gps" className="overlay-icon" />
        </div>

        <h1>{COPY.gps.title.en}</h1>
        <p className="overlay-tagalog">({COPY.gps.title.tl})</p>

        <p className="overlay-description">
          {COPY.gps.description.en}
          <span className="tagalog-inline">{COPY.gps.description.tl}</span>
        </p>

        {/* Where the position goes, before the browser asks for it; the privacy policy at its end. */}
        <p className="gps-note">
          {COPY.gps.routing.en}
          <span className="tagalog-inline">{COPY.gps.routing.tl}</span>
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
            {inline(COPY.credits.privacy)}
          </a>
        </p>

        {error && <div className="error-message">{error}</div>}

        <button
          className="overlay-btn-primary"
          onClick={handleEnableGPS}
          disabled={isRequesting || !isMapReady}
        >
          {!isMapReady && <Icon name="spinner" className="overlay-btn-icon spin" />}
          {!isMapReady
            ? inline(COPY.gps.wait)
            : isRequesting
              ? inline(COPY.gps.requesting)
              : inline(COPY.gps.enable)}
        </button>

        <p className="gps-version">v{__APP_VERSION__}</p>
      </div>
    </div>
  );
}
