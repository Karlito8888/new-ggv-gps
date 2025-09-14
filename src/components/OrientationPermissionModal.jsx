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
import useDeviceOrientation from "../hooks/useDeviceOrientation";

const OrientationPermissionModal = ({
  isOpen,
  onPermissionGranted,
  handleOrientationToggle,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const { requestPermission } = useDeviceOrientation();

  const handleRequestOrientation = async () => {
    setIsRequesting(true);
    setHasError(false);
    setErrorMessage("");

    try {
      console.log("🧭 Requesting orientation permission via unified hook");
      const result = await requestPermission();
      console.log("🧭 Orientation permission result:", result);

      if (result.granted) {
        // Enable orientation with complete logic
        if (handleOrientationToggle) {
          await handleOrientationToggle(true);
        }
        onPermissionGranted();
      } else {
        setHasError(true);
        setErrorMessage(
          "Orientation permission was denied. You can still navigate without compass."
        );
      }
    } catch (orientationError) {
      console.warn("⚠️ Orientation permission failed:", orientationError);
      setHasError(true);
      setErrorMessage(
        "Failed to request orientation permission. You can still navigate without compass."
      );
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle></DialogTitle>
          <img
            src={ggvLogo}
            alt="Garden Grove Village Logo"
            className={modalBaseStyles.modalLogo}
          />
          <DialogDescription>
            Enable compass orientation
            <br />
            for better navigation experience...
          </DialogDescription>
        </DialogHeader>

        <div className={modalBaseStyles.modalForm}>
          {hasError && (
            <div className={modalBaseStyles.errorMessage}>
              <p>{errorMessage}</p>
            </div>
          )}



          <div className={modalBaseStyles.modalActions}>
            <Button
              onClick={handleRequestOrientation}
              disabled={isRequesting}
              preset="surface"
              loading={isRequesting}
              className={modalBaseStyles.gpsCustomButton}
              style={{ width: "auto" }}
            >
              {!isRequesting && (
                <span className={modalBaseStyles.permissionEmoji}>
                  🧭 Enable Compass 🧭
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrientationPermissionModal;
