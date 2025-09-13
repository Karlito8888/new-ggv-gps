import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import Button from "./ui/button";
import modalBaseStyles from './ui/modal-base.module.css';

const ArrivalModalNew = ({ isOpen, destination, onNewDestination, onExitVillage }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleExitVillage = () => {
    setIsExiting(true);
    onExitVillage();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <div className={modalBaseStyles.modalIcon}>
            <svg
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
          <DialogTitle>Destination reached !</DialogTitle>

          {destination.blockNumber && destination.lotNumber ? (
            <>
              <div className={modalBaseStyles.arrivalDestinationInfo}>
                <p className={modalBaseStyles.arrivalDestinationTitle}>
                  Block {destination.blockNumber}, Lot {destination.lotNumber}
                </p>
              </div>

              <div className={modalBaseStyles.modalActions}>
                <Button
                  onClick={onNewDestination}
                  preset="primary"
                >
                  <svg
                    width="20"
                    height="20"
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
                </Button>

                <Button
                  onClick={handleExitVillage}
                  preset="secondary"
                  loading={isExiting}
                >
                  {!isExiting && (
                    <svg
                      width="20"
                      height="20"
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
                  )}
                  Exit the village
                </Button>
              </div>
            </>
          ) : destination.address ? (
            <div className={modalBaseStyles.arrivalExitInfo}>
              <p className={modalBaseStyles.arrivalExitTitle}>{destination.address}</p>
            </div>
          ) : null}
          <p className={modalBaseStyles.modalFooter}>Thank you for using MyGGV|GPS !</p>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ArrivalModalNew;
