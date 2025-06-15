// Modal management component
// Handles conditional rendering of all application modals

import LocationPermissionModal from './LocationPermissionModal.jsx';
import WelcomeModal from './WelcomeModal.jsx';
import ArrivalModal from './ArrivalModal.jsx';
import { useAvailableBlocks } from '../hooks/useAvailableBlocks.js';

/**
 * Modal Manager Component
 * Centralized modal rendering based on navigation state
 * @param {Object} props - Component props
 * @param {Object} props.navigationState - Navigation state hook data
 * @param {Object} props.routeManagement - Route management hook data
 * @returns {JSX.Element|null} Modal component or null
 */
function ModalManager({ navigationState, routeManagement, locationTracking }) {
  const {
    navigationState: currentState,
    destination,
    handlers,
  } = navigationState;

  const { createExitRoute } = routeManagement;
  const { startLocationTracking } = locationTracking;

  // Get available blocks for WelcomeModal
  const {
    availableBlocks,
    isLoading: _isLoading,
    error: _blocksError,
  } = useAvailableBlocks();

  /**
   * Handle location permission granted
   * Start location tracking and call original handler
   */
  const handleLocationPermissionGranted = (position) => {
    handlers.onLocationPermissionGranted(position);
    startLocationTracking();
  };

  /**
   * Handle exit village action
   * Creates exit route and updates destination
   */
  const handleExitVillage = async () => {
    try {
      const exitDestination = await createExitRoute();
      if (exitDestination) {
        // Update navigation state with exit destination
        navigationState.setDestination(exitDestination);
        handlers.onExitVillage();
      }
    } catch (error) {
      console.error('❌ Error creating exit route:', error);
    }
  };

  // Render appropriate modal based on current state
  switch (currentState) {
    case 'permission':
      return (
        <LocationPermissionModal
          onPermissionGranted={handleLocationPermissionGranted}
          onPermissionDenied={handlers.onLocationPermissionDenied}
        />
      );

    case 'welcome':
      return (
        <WelcomeModal
          onDestinationSelected={handlers.onDestinationSelected}
          onCancel={handlers.onBackToPermission}
          availableBlocks={availableBlocks}
        />
      );

    case 'arrived':
      return destination ? (
        <ArrivalModal
          destination={destination}
          onNewDestination={handlers.onNewDestination}
          onExitVillage={handleExitVillage}
          onClose={handlers.onBackToNavigation}
        />
      ) : null;

    case 'navigating':
    default:
      return null;
  }
}

export default ModalManager;