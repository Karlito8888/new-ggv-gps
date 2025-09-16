import { useState, useEffect } from "react";
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
import { testGeolocation } from '../utils/geolocationUtils';

const GpsPermissionModal = ({ isOpen, geolocateControlRef }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [capabilities, setCapabilities] = useState(null);

  // Détecter les capacités au montage
  useEffect(() => {
    const checkCapabilities = async () => {
      const result = await testGeolocation();
      setCapabilities(result);
      
      if (!result.success) {
        console.warn('Geolocation test failed:', result.error);
      }
    };
    
    if (isOpen) {
      checkCapabilities();
    }
  }, [isOpen]);

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

      // Utiliser les capacités détectées
      if (capabilities?.capabilities?.isDesktop) {
        console.log("🖥️ Desktop detected - GPS may be less accurate but functional");
      }

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
            {capabilities?.capabilities?.isDesktop && (
              <>
                <br />
                <small style={{ opacity: 0.8 }}>
                  📍 Desktop location may be less precise but works fine for navigation
                </small>
              </>
            )}
          </DialogDescription>
        </>

          <div className={modalBaseStyles.modalForm}>
          {hasError && (
            <div className={modalBaseStyles.errorMessage}>
              <p>
                Unable to access location. 
                {capabilities?.capabilities?.isDesktop ? (
                  <>
                    <br />
                    <strong>Desktop users:</strong> Location may be less precise but still works.
                    <br />
                    Please allow location access in your browser.
                  </>
                ) : (
                  <>
                    <br />
                    Please check your browser settings and try again.
                  </>
                )}
                {!capabilities?.capabilities?.isSecureContext && (
                  <>
                    <br />
                    <strong>Note:</strong> HTTPS is required for location access.
                  </>
                )}
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
