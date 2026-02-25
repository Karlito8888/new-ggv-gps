import { useState } from "react";
import { m } from "framer-motion";
import { overlayVariants, modalVariants } from "../lib/animations";

interface OrientationOverlayProps {
  onGrant: () => void;
}

export function OrientationOverlay({ onGrant }: OrientationOverlayProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async () => {
    setIsRequesting(true);
    setError(null);

    // iOS 13+ requires explicit permission
    // https://developer.apple.com/documentation/safari-release-notes/safari-13-release-notes#Media
    const needsPermission =
      typeof DeviceOrientationEvent !== "undefined" &&
      // @ts-expect-error iOS 13+ API not in standard TypeScript DOM types
      typeof DeviceOrientationEvent.requestPermission === "function";

    if (!needsPermission) {
      // Android doesn't need permission
      onGrant();
      setIsRequesting(false);
      return;
    }

    try {
      // @ts-expect-error iOS 13+ API not in standard TypeScript DOM types
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission === "granted") {
        onGrant();
      } else {
        setError("Permission denied. Please enable in Settings.");
      }
    } catch (err) {
      console.error("Orientation permission error:", err);
      setError("Failed to request permission. Please try again.");
    }
    setIsRequesting(false);
  };

  return (
    <m.div
      className="overlay orientation-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <m.div className="modal orientation-modal" variants={modalVariants}>
        {/* Compass Icon */}
        <div className="orientation-icon-wrapper">
          <svg
            className="orientation-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon
              points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
              fill="currentColor"
            />
          </svg>
        </div>

        <h1 className="orientation-title">Enable Compass</h1>
        <p className="orientation-tagalog">(I-enable ang Compass)</p>

        <p className="orientation-description">
          Enable device orientation for accurate compass heading during navigation.
          <span className="tagalog-inline">
            I-enable ang device orientation para sa tamang direksyon habang nag-navigate.
          </span>
        </p>

        {error && <div className="error-message">{error}</div>}

        <button className="orientation-btn" onClick={handleRequest} disabled={isRequesting}>
          <svg
            className="orientation-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon
              points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
              fill="currentColor"
            />
          </svg>
          {isRequesting ? "Requesting..." : "Enable Compass"}
        </button>
      </m.div>
    </m.div>
  );
}
