import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import Button from "./ui/button";
import modalBaseStyles from './ui/modal-base.module.css';

const ArrivalModalNew = ({ isOpen, destination, onNewDestination, onExitVillage }) => {

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
                  className={modalBaseStyles.gpsCustomButton}
                  style={{ width: "100%" }}
                >
                  <span className={modalBaseStyles.permissionEmoji}>🎯 </span>
                  New destination ?
                </Button>

                <Button
                  onClick={onExitVillage}
                  preset="secondary"
                  className={modalBaseStyles.gpsCustomButton}
                  style={{ width: "100%" }}
                >
                  <span className={modalBaseStyles.permissionEmoji}>🚪 </span>
                  Exit the village !
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
