import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import Button from "./ui/button";
import modalBaseStyles from './ui/modal-base.module.css';

const ExitSuccessModal = ({ isOpen, onStartNewNavigation }) => {
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <DialogTitle>
            You've successfully exited
            <br />
            Garden Grove Village !
          </DialogTitle>

          <div className={modalBaseStyles.exitMessage}>
            {/* <p className={modalBaseStyles.exitMainMessage}>
              You've successfully exited Garden Grove Village!
            </p> */}
            <p className={modalBaseStyles.exitFilipinoMessage}>
              Salamat po
              <br />
              🙏 Ingat sa paguwi 🙏
            </p>
          </div>

          <div className={modalBaseStyles.modalActions}>
            <Button
              onClick={onStartNewNavigation}
              preset="success"
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
              Start new navigation
            </Button>
          </div>

          <p className={modalBaseStyles.modalFooter}>Thank you for using MyGGV|GPS! 💚</p>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ExitSuccessModal;