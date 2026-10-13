import { useState } from "react";
import { COPY, inline } from "@ggv/shared";

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
      // Trigger the native GeolocateControl (requests permission + starts tracking)
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
    <div
      className="overlay gps-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={COPY.gps.aria.en}
    >
      <div className="modal gps-modal">
        {/* GPS Icon with pulse animation */}
        <div className="overlay-icon-wrapper">
          <svg
            className="overlay-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          </svg>
        </div>

        <h1>{COPY.gps.title.en}</h1>
        <p className="overlay-tagalog gps-tagalog">({COPY.gps.title.tl})</p>

        <p className="overlay-description">
          {COPY.gps.description.en}
          <span className="tagalog-inline">{COPY.gps.description.tl}</span>
        </p>

        {error && <div className="error-message">{error}</div>}

        <button
          className={`overlay-btn-primary${!isMapReady ? " gps-btn-disabled" : ""}`}
          onClick={handleEnableGPS}
          disabled={isRequesting || !isMapReady}
        >
          {!isMapReady && (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                animation: "spin 1s linear infinite",
                marginRight: "8px",
              }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
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
