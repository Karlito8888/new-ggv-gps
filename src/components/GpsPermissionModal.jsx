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
import modalBaseStyles from './ui/modal-base.module.css';

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
      <DialogContent>
        <>
          <DialogTitle></DialogTitle>
          <img
            src={ggvLogo}
            alt="Garden Grove Village Logo"
            className={modalBaseStyles.modalLogo}
          />
          <DialogDescription>
            We need access to your location
            <br />
            to help you navigate
            <br />
            in Garden Grove Village...
          </DialogDescription>
        </>

          <div className={modalBaseStyles.modalForm}>
          {hasError && (
            <div className={modalBaseStyles.errorMessage}>
              <p>
                Unable to access GPS. Please check your browser settings and try
                again.
              </p>
            </div>
          )}

          <div className={modalBaseStyles.modalActions}>
            <Button
              onClick={handleRequestGps}
              disabled={isRequesting}
              preset="surface"
              loading={isRequesting}
              className={modalBaseStyles.gpsCustomButton}
              style={{ width: "auto" }}
            >
              {!isRequesting && (
                <span className={modalBaseStyles.permissionEmoji}>
                  📍Allow GPS Location📍
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GpsPermissionModal;
