import { useState } from "react";
import "./LocationPermissionModal.css";
import ggvLogo from "../assets/img/ggv.png";

const LocationPermissionModal = ({
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestLocationPermission = async () => {
    setIsRequesting(true);

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser");
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      setIsVisible(false);
      onPermissionGranted(position);
    } catch (error) {
      console.error("Geolocation error:", error);
      onPermissionDenied(error.message);
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="location-permission-modal-overlay">
      <div className="location-permission-modal">
        <div className="modal-content">
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
          <h2 className="modal-title">Location Permission</h2>
          <p className="modal-description">
            MyGGV | GPS needs access to your location to provide accurate
            navigation within Garden Grove Village.
          </p>
        </div>

        <button
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
            // "Allow Location Access"
            "OKu"
          )}
        </button>
        <p className="modal-footer">
          Your location will only be used for navigation within the village.
        </p>
        <img
          src={ggvLogo}
          alt="Garden Grove Village Logo"
          className="modal-logo"
        />
      </div>
    </div>
  );
};

export default LocationPermissionModal;
