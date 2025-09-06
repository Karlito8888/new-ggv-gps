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

const LocationPermissionModalNew = ({
  isOpen,
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const requestLocationPermission = async () => {
    setIsRequesting(true);

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser");
      }

      // Just check that geolocation is available
      // GeolocateControl will handle permission request and position acquisition
      onPermissionGranted();
    } catch (error) {
      console.error("Geolocation error:", error);
      onPermissionDenied(error.message);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="location-permission-modal">
        <DialogHeader className="modal-content">
          <div className="modal-icon">
            <svg
              className="icon"
              fill="none"
              stroke="#f4f4f4"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <DialogTitle className="modal-title">Location Permission</DialogTitle>
          <DialogDescription className="modal-description">
            MyGGV | GPS needs access to your location to provide accurate
            navigation within Garden Grove Village.
          </DialogDescription>
        </DialogHeader>

        <Button
          onClick={requestLocationPermission}
          disabled={isRequesting}
          className="modal-button"
        >
          {isRequesting ? (
            <>
              <div className="spinner"></div>
              Requesting...
            </>
          ) : (
            "OK"
          )}
        </Button>
        <p className="modal-footer">
          Your location will only be used for navigation within the village.
        </p>
        <img
          src={ggvLogo}
          alt="Garden Grove Village Logo"
          className="modal-logo"
        />
      </DialogContent>
    </Dialog>
  );
};

export default LocationPermissionModalNew;
