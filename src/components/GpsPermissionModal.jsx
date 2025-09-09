import { useState } from "react";
import ggvLogo from "../assets/img/ggv.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import Button from "./ui/button";

const GpsPermissionModal = ({ isOpen, geolocateControlRef }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleRequestGps = async () => {
    if (!geolocateControlRef?.current) {
      console.error("❌ GeolocateControl not available");
      setHasError(true);
      return;
    }

    setIsRequesting(true);
    setHasError(false);

    try {
      console.log("📍 Requesting GPS permission...");

      // Trigger GPS permission request
      geolocateControlRef.current.trigger();

      // DON'T automatically call onPermissionGranted()
      // Wait for actual GPS success/error events in App.jsx
      console.log(
        "📍 GPS permission request sent, waiting for actual response..."
      );
    } catch (error) {
      console.error("❌ GPS permission request failed:", error);
      setHasError(true);
      setIsRequesting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="welcome-modal gps-permission-modal">
        <DialogHeader className="modal-content text-center">
          <DialogTitle className="modal-title">Welcome to</DialogTitle>
          <img
            src={ggvLogo}
            alt="Garden Grove Village Logo"
            className="modal-logo"
          />
          <DialogDescription className="modal-description">
            We need access to your location
            <br />
            to help you navigate in Garden Grove Village
          </DialogDescription>
        </DialogHeader>

        <div className="modal-form">
          {hasError && (
            <div className="error-message">
              <p>
                Unable to access GPS. Please check your browser settings and try
                again.
              </p>
            </div>
          )}

          <div className="permission-info">
            <div className="permission-icon">📍</div>
            <p className="permission-description">
              Your location will only be used for navigation purposes and will
              not be stored or shared.
            </p>
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              onClick={handleRequestGps}
              disabled={isRequesting}
              className="modal-button primary full-width"
            >
              {isRequesting ? (
                <>
                  <div className="spinner"></div>
                  Requesting permission...
                </>
              ) : (
                <>
                  <span className="permission-emoji">👍</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GpsPermissionModal;
