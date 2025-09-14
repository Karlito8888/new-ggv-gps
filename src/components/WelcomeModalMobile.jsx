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

  // Récupération des coordonnées précises pour la destination sélectionnée
  const {
    data: locationData,
    isLoading: isLocationLoading,
    error: locationError,
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

  // Handle destination selection - avec coordonnées précises depuis Supabase
  const handleSubmitDestination = (e) => {
    e.preventDefault();

    if (!pickerValue.block || !pickerValue.lot) {
      return;
    }

    // Validation stricte des coordonnées avant de procéder
    if (locationData && locationData.coordinates && Array.isArray(locationData.coordinates) && locationData.coordinates.length === 2) {
      const location = {
        blockNumber: parseInt(pickerValue.block),
        lotNumber: parseInt(pickerValue.lot),
        address: `Block ${pickerValue.block}, Lot ${pickerValue.lot}`,
        coordinates: locationData.coordinates, // [longitude, latitude]
        markerUrl: locationData.marker_url || '/default-marker.png',
      };
      console.log("🎯 Destination selected with coordinates:", location);
      onDestinationSelected(location);
    } else if (locationData && locationData.coordinates?.coordinates && Array.isArray(locationData.coordinates.coordinates) && locationData.coordinates.coordinates.length === 2) {
      // Handle nested coordinates structure
      const location = {
        blockNumber: parseInt(pickerValue.block),
        lotNumber: parseInt(pickerValue.lot),
        address: `Block ${pickerValue.block}, Lot ${pickerValue.lot}`,
        coordinates: locationData.coordinates.coordinates, // [longitude, latitude]
        markerUrl: locationData.marker_url || '/default-marker.png',
      };
      console.log("🎯 Destination selected with nested coordinates:", location);
      onDestinationSelected(location);
    } else {
      // Bloquer la sélection si pas de coordonnées valides
      console.error("❌ Invalid or missing coordinates for selected location:", locationData);
      alert("Invalid destination: coordinates not found. Please try again.");
      return;
    }
  };

  // Prepare selections for the picker
  const selections = {
    block: availableBlocks.map((block) => block.toString()),
    lot: isLotsLoading
      ? [""]
      : availableLots.map((lot) => lot.toString()),
  };

  // Determine loading state and errors
  const isLoading = isLotsLoading || isLocationLoading;
  const error = lotsError?.message || locationError?.message || "";
  
  // Validation stricte pour le bouton submit
  const hasValidCoordinates = locationData && (
    (Array.isArray(locationData.coordinates) && locationData.coordinates.length === 2) ||
    (locationData.coordinates?.coordinates && Array.isArray(locationData.coordinates.coordinates) && locationData.coordinates.coordinates.length === 2)
  );
  
  const canSubmit =
    pickerValue.block &&
    pickerValue.lot &&
    !isLotsLoading &&
    !isLocationLoading &&
    hasValidCoordinates;

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
                            {isLotsLoading && !option ? (
                              <span className={modalBaseStyles.welcomeLoadingText}>
                                <div style={{width: '16px', height: '16px', border: '2px solid #e5e7eb', borderTop: '2px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '8px'}}></div>
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
