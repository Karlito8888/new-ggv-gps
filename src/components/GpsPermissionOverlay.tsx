import { useState } from "react";
import { m } from "framer-motion";
import { overlayVariants, modalVariants } from "../lib/animations";

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
      setError("Please, try again");
      setIsRequesting(false);
    }
  };

  return (
    <m.div
      className="overlay gps-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <m.div className="modal gps-modal" variants={modalVariants}>
        {/* GPS Icon with pulse animation */}
        <div className="gps-icon-wrapper">
          <svg
            className="gps-icon"
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

        <h1 className="gps-title">Enable Location</h1>
        <p className="gps-tagalog">(I-enable ang Lokasyon)</p>

        <p className="gps-description">
          MyGGV GPS needs your location to guide you through the village.
          <span className="tagalog-inline">
            Kailangan ng MyGGV GPS ang iyong lokasyon para gabayan ka sa village.
          </span>
        </p>

        {error && <div className="error-message">{error}</div>}

        <button
          className="gps-btn"
          onClick={handleEnableGPS}
          disabled={isRequesting || !isMapReady}
          style={!isMapReady ? { backgroundColor: "#888", opacity: 0.6 } : undefined}
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
            ? "Please wait, map is loading..."
            : isRequesting
              ? "Requesting..."
              : "Enable GPS"}
        </button>

        <p className="gps-version">v{__APP_VERSION__}</p>
      </m.div>
    </m.div>
  );
}
