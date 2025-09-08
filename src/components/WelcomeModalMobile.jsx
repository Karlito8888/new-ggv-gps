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

const WelcomeModalMobile = ({
  isOpen,
  onDestinationSelected,
  onCancel,
  onOrientationToggle,
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
      setPickerValue(prev => ({
        ...prev,
        block: defaultBlock,
      }));
      return;
    }

    // Handle lots when they are loaded
    if (availableLots.length > 0) {
      const currentLot = pickerValue.lot;
      const lotExists = availableLots.some(lot => lot.toString() === currentLot);

      // If no lot selected or lot no longer exists, take the first one
      if (!currentLot || !lotExists) {
        setPickerValue(prev => ({
          ...prev,
          lot: availableLots[0].toString()
        }));
      }
    } else if (pickerValue.block && !isLotsLoading) {
      // Si pas de lots disponibles, reset le lot
      setPickerValue(prev => ({
        ...prev,
        lot: ""
      }));
    }
  }, [availableBlocks, availableLots, isLotsLoading, pickerValue.block, pickerValue.lot]);

  // Gestion de la soumission avec orientation iOS native
  const handleSubmitWithOrientation = async (e) => {
    e.preventDefault();

    if (!pickerValue.block || !pickerValue.lot) {
      return;
    }

    try {
      // 1. ÉTAPE 1: Refetch destination data
      const result = await refetchLocation();
      
      if (result.data) {
        // 2. ÉTAPE 2: Trigger destination selection (déclenche GPS automatiquement)
        onDestinationSelected(result.data);
        
        // 3. ÉTAPE 3: Attendre un petit délai pour que le GPS se déclenche d'abord
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 4. ÉTAPE 4: PUIS demander orientation iOS (dialogue natif)
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
          try {
            console.log('🧭 Requesting iOS orientation permission in user click context');
            const permission = await DeviceOrientationEvent.requestPermission();
            console.log('🧭 iOS orientation permission result:', permission);
            
            // Si accordée, activer l'orientation
            if (permission === 'granted' && onOrientationToggle) {
              onOrientationToggle(true);
            }
          } catch (orientationError) {
            console.warn('⚠️ iOS orientation permission failed:', orientationError);
            // Pas grave - l'utilisateur peut utiliser OrientationToggle plus tard
          }
        } else {
          // Android ou desktop - pas de dialogue nécessaire
          if (onOrientationToggle && typeof onOrientationToggle === 'function') {
            console.log('🧭 Auto-triggering orientation (non-iOS device)');
            onOrientationToggle(true);
          }
        }
      }
    } catch (error) {
      console.error("Error while searching for destination:", error);
    }
  };

  // Prepare selections for the picker
  const selections = {
    block: availableBlocks.map(block => block.toString()),
    lot: isLotsLoading ? ["Loading..."] : availableLots.map(lot => lot.toString()),
  };

  // Determine loading state and errors
  const isLoading = isLocationLoading;
  const error = locationError?.message || lotsError?.message || "";
  const canSubmit = pickerValue.block && pickerValue.lot && !isLotsLoading && pickerValue.lot !== "Loading...";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="welcome-modal mobile-picker-modal">
        <DialogHeader className="modal-content">
          <DialogTitle className="modal-title">Welcome to</DialogTitle>
          <img
            src={ggvLogo}
            alt="Garden Grove Village Logo"
            className="modal-logo"
          />
          <DialogDescription className="modal-description">
            Where would you like to go
            <br />
            in Garden Grove Village?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className="modal-form">
          <div className="picker-container">
            <div className="picker-labels">
              <div className="picker-label">🏢 Block</div>
              <div className="picker-label">🏠 Lot</div>
            </div>
            
            <div className="mobile-picker-wrapper">
              <Picker
                value={pickerValue}
                onChange={setPickerValue}
                height={180}
                itemHeight={45}
                wheelMode="natural"
              >
                <Picker.Column name="block">
                  {selections.block.map(option => (
                    <Picker.Item key={option} value={option}>
                      {({ selected }) => (
                        <div className={`picker-item ${selected ? 'selected' : ''}`}>
                          Block {option}
                        </div>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>
                
                <Picker.Column name="lot">
                  {selections.lot.map(option => (
                    <Picker.Item key={option} value={option}>
                      {({ selected }) => (
                        <div className={`picker-item ${selected ? 'selected' : ''}`}>
                          {option === "Loading..." ? (
                            <span className="loading-text">
                              <div className="mini-spinner"></div>
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
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          <div className="modal-actions">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="modal-button secondary"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitWithOrientation}
              disabled={isLoading || !canSubmit}
              className="modal-button primary"
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Loading...
                </>
              ) : (
                <span className="span-mirror">🛵💨</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModalMobile;
