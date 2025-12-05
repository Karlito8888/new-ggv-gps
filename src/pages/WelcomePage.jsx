import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import Picker from "react-mobile-picker";
import ggvLogo from "../assets/img/ggv.png";
import Button from "../components/ui/button";
import { useAvailableBlocks, useAvailableLots, useLocation } from "../hooks/useLocations";
import styles from "../components/ui/modal-base.module.css";
import { overlayVariants, modalVariants, slideUpVariants } from "../lib/animations";

/**
 * Welcome Page - Destination selection
 * User selects block and lot to navigate to
 */
export default function WelcomePage() {
  const navigate = useNavigate();
  const { setDestination, setOrientationEnabled } = useOutletContext();

  const [pickerValue, setPickerValue] = useState({
    block: "",
    lot: "",
  });

  // Get available blocks
  const { data: availableBlocks = [] } = useAvailableBlocks();

  // Dynamic retrieval of lots based on selected block
  const {
    data: availableLots = [],
    isLoading: isLotsLoading,
    error: lotsError,
  } = useAvailableLots(pickerValue.block);

  // Get coordinates for selected destination
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
      const lotExists = availableLots.some((lot) => lot.toString() === currentLot);

      // If no lot selected or lot no longer exists, take the first one
      if (!currentLot || !lotExists) {
        setPickerValue((prev) => ({
          ...prev,
          lot: availableLots[0].toString(),
        }));
      }
    } else if (pickerValue.block && !isLotsLoading) {
      // If no lots available, reset lot
      setPickerValue((prev) => ({
        ...prev,
        lot: "",
      }));
    }
  }, [availableBlocks, availableLots, isLotsLoading, pickerValue.block, pickerValue.lot]);

  // Request device orientation permission (iOS only, must be triggered by user gesture)
  const requestOrientationPermission = async () => {
    // Check if iOS requestPermission is available
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        console.log("iOS DeviceOrientation permission:", permission);
        return permission === "granted";
      } catch (error) {
        console.warn("DeviceOrientation permission request failed:", error);
        return false;
      }
    }
    // Android/Desktop - no permission needed, return true
    return true;
  };

  // Handle destination selection
  const handleSubmitDestination = async (e) => {
    e.preventDefault();

    if (!pickerValue.block || !pickerValue.lot) {
      return;
    }

    // Validate coordinates before proceeding
    let coordinates = null;

    if (
      locationData?.coordinates &&
      Array.isArray(locationData.coordinates) &&
      locationData.coordinates.length === 2
    ) {
      coordinates = locationData.coordinates;
    } else if (
      locationData?.coordinates?.coordinates &&
      Array.isArray(locationData.coordinates.coordinates) &&
      locationData.coordinates.coordinates.length === 2
    ) {
      coordinates = locationData.coordinates.coordinates;
    }

    if (!coordinates) {
      console.error("Invalid or missing coordinates for selected location:", locationData);
      alert("Invalid destination: coordinates not found. Please try again.");
      return;
    }

    // Request orientation permission and enable orientation automatically
    // iOS: Shows native permission dialog (must happen on user gesture)
    // Android: No dialog needed, just enable
    const permissionGranted = await requestOrientationPermission();
    if (permissionGranted) {
      setOrientationEnabled(true);
    }

    const location = {
      blockNumber: parseInt(pickerValue.block),
      lotNumber: parseInt(pickerValue.lot),
      address: `Block ${pickerValue.block}, Lot ${pickerValue.lot}`,
      coordinates: coordinates,
      markerUrl: locationData.marker_url || "/default-marker.png",
    };

    console.log("Destination selected:", location);
    setDestination(location);

    // Navigate with destination in URL params for persistence
    navigate(`/navigate?block=${pickerValue.block}&lot=${pickerValue.lot}`);
  };

  // Prepare selections for the picker
  const selections = {
    block: availableBlocks.map((block) => block.toString()),
    lot: isLotsLoading ? [""] : availableLots.map((lot) => lot.toString()),
  };

  // Determine loading state and errors
  const isLoading = isLotsLoading || isLocationLoading;
  const error = lotsError?.message || locationError?.message || "";

  // Validate for submit button
  const hasValidCoordinates =
    locationData &&
    ((Array.isArray(locationData.coordinates) && locationData.coordinates.length === 2) ||
      (locationData.coordinates?.coordinates &&
        Array.isArray(locationData.coordinates.coordinates) &&
        locationData.coordinates.coordinates.length === 2));

  const canSubmit =
    pickerValue.block &&
    pickerValue.lot &&
    !isLotsLoading &&
    !isLocationLoading &&
    hasValidCoordinates;

  return (
    <motion.div
      className={styles.pageOverlay}
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className={styles.pageContent}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className={styles.dialogHeader}>
          <h1 className="sr-only">Select Destination</h1>
        </div>

        <motion.img
          src={ggvLogo}
          alt="Garden Grove Village Logo"
          className={styles.modalLogo}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        />

        <motion.p
          className={styles.modalDescription}
          variants={slideUpVariants}
          initial="hidden"
          animate="visible"
        >
          Where would you like to go
          <br />
          in Garden Grove Village ?
        </motion.p>

        <form onSubmit={(e) => e.preventDefault()} className={styles.modalForm}>
          <motion.div
            className={styles.welcomePickerContainer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div className={styles.welcomeMobilePickerWrapper}>
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
                          className={`${styles.welcomePickerItem} ${
                            selected ? styles.welcomePickerItemSelected : ""
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
                          className={`${styles.welcomePickerItem} ${
                            selected ? styles.welcomePickerItemSelected : ""
                          }`}
                        >
                          {isLotsLoading && !option ? (
                            <span className={styles.welcomeLoadingText}>
                              <div
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  border: "2px solid #e5e7eb",
                                  borderTop: "2px solid #10b981",
                                  borderRadius: "50%",
                                  animation: "spin 1s linear infinite",
                                  display: "inline-block",
                                  marginRight: "8px",
                                }}
                              />
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
          </motion.div>

          {error && (
            <motion.div
              className={styles.errorMessage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p>{error}</p>
            </motion.div>
          )}

          <div className={styles.modalActions}>
            <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
              <Button
                onClick={handleSubmitDestination}
                disabled={!canSubmit || isLoading}
                preset="surface"
                className={styles.gpsCustomButton}
                style={{ width: "auto" }}
              >
                <span className={styles.permissionEmojiMirrored}>🛵💨</span>
              </Button>
            </motion.div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
