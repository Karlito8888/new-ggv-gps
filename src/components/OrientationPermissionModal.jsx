import { useState } from 'react';
import ggvLogo from "../assets/img/ggv.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import Button from "./ui/button";

const OrientationPermissionModal = ({ 
  isOpen, 
  onPermissionGranted,
  onPermissionSkipped,
  handleOrientationToggle
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRequestOrientation = async () => {
    setIsRequesting(true);
    setHasError(false);
    setErrorMessage('');

    try {
      // Check if this is iOS with orientation permission
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        
        console.log('🧭 Requesting iOS orientation permission');
        const permission = await DeviceOrientationEvent.requestPermission();
        console.log('🧭 iOS orientation permission result:', permission);
        
        if (permission === 'granted') {
          // Enable orientation with complete logic
          if (handleOrientationToggle) {
            await handleOrientationToggle(true);
          }
          onPermissionGranted();
        } else {
          setHasError(true);
          setErrorMessage('Orientation permission was denied. You can still navigate without compass.');
        }
      } else {
        // Android/Desktop - auto enable
        console.log('🧭 Auto-enabling orientation (Android/Desktop)');
        if (handleOrientationToggle) {
          await handleOrientationToggle(true);
        }
        onPermissionGranted();
      }
    } catch (orientationError) {
      console.warn('⚠️ Orientation permission failed:', orientationError);
      setHasError(true);
      setErrorMessage('Failed to request orientation permission. You can still navigate without compass.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    console.log('🧭 User skipped orientation permission');
    onPermissionSkipped();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="welcome-modal orientation-permission-modal">
        <DialogHeader className="modal-content text-center">
          <DialogTitle className="modal-title">Enhanced Navigation</DialogTitle>
          <img
            src={ggvLogo}
            alt="Garden Grove Village Logo"
            className="modal-logo"
          />
          <DialogDescription className="modal-description">
            Enable compass orientation
            <br />
            for better navigation experience
          </DialogDescription>
        </DialogHeader>

        <div className="modal-form">
          {hasError && (
            <div className="error-message">
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="orientation-info">
            <div className="permission-icon">🧭</div>
            <p className="permission-description">
              Your device orientation will help align the map with your
              direction for easier navigation.
            </p>
            <p className="permission-note">
              This feature works best on mobile devices.
            </p>
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              onClick={handleRequestOrientation}
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
                  <span className="permission-emoji">🧭</span>
                  👍
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleSkip}
              disabled={isRequesting}
              variant="outline"
              className="modal-button secondary full-width"
            >
              Skip (Navigate without compass)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrientationPermissionModal;