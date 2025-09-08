import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import Button from "./ui/button";

const ExitSuccessModal = ({ isOpen, onStartNewNavigation }) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="exit-success-modal">
        <DialogHeader className="modal-content text-center">
          <div className="modal-icon success-icon">
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <DialogTitle className="modal-title success-title">
            Safe travels! 🚗
          </DialogTitle>
          
          <div className="exit-message">
            <p className="main-message">
              You've successfully exited Garden Grove Village!
            </p>
            <p className="filipino-message">
              Salamat po sa paggamit ng MyGGV|GPS!
              <br />
              🙏 Ingat sa paguwi! 🙏
            </p>
          </div>

          <div className="button-group single-button">
            <Button
              onClick={onStartNewNavigation}
              className="button button-success"
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
              Start new navigation
            </Button>
          </div>
          
          <p className="modal-footer">Thank you for using MyGGV|GPS! 💚</p>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ExitSuccessModal;