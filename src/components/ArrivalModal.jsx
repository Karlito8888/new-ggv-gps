import { useState } from "react";
import "./ArrivalModal.css";

const ArrivalModal = ({ destination, onNewDestination, onExitVillage }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleExitVillage = () => {
    setIsExiting(true);
    onExitVillage();
  };

  return (
    <div className="arrival-modal-overlay">
      <div className="arrival-modal">
        <div className="modal-content">
          <div className="modal-icon">
            <svg
              className="icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="modal-title">Destination reached !</h2>
          {/* <p className="modal-description">
            You have arrived at your destination:
          </p> */}
          {destination.blockNumber && destination.lotNumber ? (
            <>
              <div className="destination-info">
                <p className="destination-title">
                  Block {destination.blockNumber}, Lot {destination.lotNumber}
                </p>
              </div>

              <div className="button-group">
                <button
                  onClick={onNewDestination}
                  className="button button-primary"
                >
                  <svg
                    className="button-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                  </svg>
                  New destination ?
                </button>

                <button
                  onClick={handleExitVillage}
                  disabled={isExiting}
                  className="button button-secondary"
                >
                  {isExiting ? (
                    <>
                      <div className="spinner"></div>
                      Navigating to exit...
                    </>
                  ) : (
                    <>
                      <svg
                        className="button-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Exit the village
                    </>
                  )}
                </button>
              </div>
            </>
          ) : destination.address ? (
            <div className="exit-info">
              <p className="exit-title">{destination.address}</p>
            </div>
          ) : null}
          <p className="modal-footer">Thank you for using MyGGV|GPS !</p>
        </div>
      </div>
    </div>
  );
};

export default ArrivalModal;
