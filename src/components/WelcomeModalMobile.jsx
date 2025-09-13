import { useState, useEffect } from "react";
import Picker from "react-mobile-picker";
import ggvLogo from "../assets/img/ggv.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import Button from "./ui/button";
import { useAvailableLots, useLocation } from "../hooks/useLocations";
import modalBaseStyles from './ui/modal-base.module.css';

const WelcomeModalMobile = ({
  isOpen,
  onDestinationSelected,
  onCancel,
  availableBlocks = [],
}) => {
  const [pickerValue, setPickerValue] = useState({
    block: "",
    lot: "",
  });

  // Dynamic retrieval of lots based on selected block
  const {
    data: availableLots = [],
    isLoading: isLotsLoading,
    error: lotsError,
  } = useAvailableLots(pickerValue.block);

  // Retrieve specific location when block and lot are selected
  const {
    isLoading: isLocationLoading,
    error: locationError,
    refetch: refetchLocation,
  } = useLocation(pickerValue.block, pickerValue.lot);

  // Handle default values and changes
  useEffect(() => {
    // Initialize default block
    if (availableBlocks.length > 0 && !pickerValue.block) {
      const defaultBlock = availableBlocks[0].toString();
      setPickerValue((prev) => ({
        ...prev,
        block: defaultBlock,
      }));
      return;
    }

    // Handle lots when they are loaded
    if (availableLots.length > 0) {
      const currentLot = pickerValue.lot;
      const lotExists = availableLots.some(
        (lot) => lot.toString() === currentLot
      );

      // If no lot selected or lot no longer exists, take the first one
      if (!currentLot || !lotExists) {
        setPickerValue((prev) => ({
          ...prev,
          lot: availableLots[0].toString(),
        }));
      }
    } else if (pickerValue.block && !isLotsLoading) {
      // Si pas de lots disponibles, reset le lot
      setPickerValue((prev) => ({
        ...prev,
        lot: "",
      }));
    }
  }, [
    availableBlocks,
    availableLots,
    isLotsLoading,
    pickerValue.block,
    pickerValue.lot,
  ]);

  // Handle destination selection with orientation permission
  const handleSubmitDestination = async (e) => {
    e.preventDefault();

    if (!pickerValue.block || !pickerValue.lot) {
      return;
    }

    try {
      // 1. Refetch destination data
      const result = await refetchLocation();
      
      if (result.data) {
        console.log("🎯 Destination selected");
        
        // 2. Proceed with destination selection
        onDestinationSelected(result.data);
      }
    } catch (error) {
      console.error("Error while searching for destination:", error);
    }
  };

  // Prepare selections for the picker
  const selections = {
    block: availableBlocks.map((block) => block.toString()),
    lot: isLotsLoading
      ? ["Loading..."]
      : availableLots.map((lot) => lot.toString()),
  };

  // Determine loading state and errors
  const isLoading = isLocationLoading;
  const error = locationError?.message || lotsError?.message || "";
  const canSubmit =
    pickerValue.block &&
    pickerValue.lot &&
    !isLotsLoading &&
    pickerValue.lot !== "Loading...";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle></DialogTitle>
          <img
            src={ggvLogo}
            alt="Garden Grove Village Logo"
            className={modalBaseStyles.modalLogo}
          />
          <DialogDescription>
            Where would you like to go
            <br />
            in Garden Grove Village ?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className={modalBaseStyles.modalForm}>
          <div className={modalBaseStyles.welcomePickerContainer}>


            <div className={modalBaseStyles.welcomeMobilePickerWrapper}>
              <Picker
                value={pickerValue}
                onChange={setPickerValue}
                height={180}
                itemHeight={45}
                wheelMode="normal"
              >
                <Picker.Column name="block">
                  {selections.block.map((option) => (
                     <Picker.Item key={option} value={option}>
                       {({ selected }) => (
                         <div
                           className={`${modalBaseStyles.welcomePickerItem} ${
                             selected ? modalBaseStyles.welcomePickerItem.selected : ""
                           }`}
                         >
                           Block {option}
                         </div>
                       )}
                     </Picker.Item>
                  ))}
                </Picker.Column>

                <Picker.Column name="lot">
                  {selections.lot.map((option) => (
                     <Picker.Item key={option} value={option}>
                       {({ selected }) => (
                         <div
                           className={`${modalBaseStyles.welcomePickerItem} ${
                             selected ? modalBaseStyles.welcomePickerItem.selected : ""
                           }`}
                         >
                           {option === "Loading..." ? (
                             <span className={modalBaseStyles.welcomeLoadingText}>
                               <div className={modalBaseStyles.welcomeMiniSpinner}></div>
                               Loading...
                             </span>
                           ) : (
                             `Lot ${option}`
                           )}
                         </div>
                       )}
                     </Picker.Item>
                  ))}
                </Picker.Column>
              </Picker>
            </div>
          </div>

          {error && (
            <div className={modalBaseStyles.errorMessage}>
              <p>{error}</p>
            </div>
          )}

          <div className={modalBaseStyles.modalActions}>
  
            <Button
              onClick={handleSubmitDestination}
              disabled={!canSubmit || isLoading}
              preset="surface"
              className={modalBaseStyles.gpsCustomButton}
              style={{ width: "auto" }}
            >
              <span className={modalBaseStyles.permissionEmojiMirrored}>
                🛵💨
              </span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModalMobile;
