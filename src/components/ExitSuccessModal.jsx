import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import modalBaseStyles from './ui/modal-base.module.css';

const ExitSuccessModal = ({ isOpen }) => {
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


          <p className={modalBaseStyles.modalFooter}>Thank you for using MyGGV|GPS! 💚</p>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ExitSuccessModal;