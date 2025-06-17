import { useState } from "react";
import { supabase } from "../lib/supabase";
import ggvLogo from "../assets/img/ggv.png";
import "./WelcomeModal.css";

const WelcomeModal = ({
  onDestinationSelected,
  onCancel,
  availableBlocks = [],
}) => {
  const [blockNumber, setBlockNumber] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!blockNumber || !lotNumber) {
      setError("Please select a block number and enter a lot number");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("block", parseInt(blockNumber))
        .eq("lot", parseInt(lotNumber))
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setError(
            `No destination found for\nblock ${blockNumber}, lot ${lotNumber}`
          );
        } else {
          throw error;
        }
        return;
      }

      if (
        !data.coordinates ||
        !data.coordinates.coordinates ||
        data.coordinates.coordinates.length !== 2
      ) {
        setError("Invalid coordinates for this destination");
        return;
      }

      onDestinationSelected({
        blockNumber: parseInt(blockNumber),
        lotNumber: parseInt(lotNumber),
        coordinates: data.coordinates.coordinates,
        address: data.address || `Block ${blockNumber}, Lot ${lotNumber}`,
        data: data,
      });
    } catch (error) {
      console.error("Error while searching for destination:", error);
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="welcome-modal-overlay">
      <div className="welcome-modal">
        <div className="modal-content">
          <h2 className="modal-title">Welcome to</h2>
          <img
            src={ggvLogo}
            alt="Garden Grove Village Logo"
            className="modal-logo"
          />
          <p className="modal-description">
            Where would you like to go
            <br />
            in Garden Grove Village?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="block" className="form-label">
              Block Number
            </label>
            {/* <select
              id="block"
              value={blockNumber}
              onChange={(e) => setBlockNumber(e.target.value)}
              className="form-input"
              required
            >
              <option value="">Select a block</option>
              {availableBlocks.map((block) => (
                <option key={block} value={block}>
                  Block {block}
                </option>
              ))}
            </select> */}
            <select
              id="block"
              value={blockNumber}
              onChange={(e) => setBlockNumber(e.target.value)}
              className="form-input"
              style={{ border: "3px solid #8EB458" }}
              required
            >
              <option value="" disabled={true}>
                Select a block
              </option>
              {availableBlocks.map((block) => (
                <option key={block} value={block}>
                  Block {block}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="lot" className="form-label">
              Lot Number
            </label>
            <input
              type="number"
              id="lot"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="Ex: 123"
              min="1"
              className="form-input"
              style={{ border: "3px solid #A2B855" }}
              required
            />
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={onCancel}
              className="modal-button secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !blockNumber || !lotNumber}
              className="modal-button primary"
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Ok...
                </>
              ) : (
                // "Start"
                <span className="span-mirror">🛵💨</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WelcomeModal;
