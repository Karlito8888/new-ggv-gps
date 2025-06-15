// Main App component - Refactored and modular
// Orchestrates all hooks and components for clean architecture

import { useEffect } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import DebugConsole from "./components/DebugConsole.jsx";
import MapContainer from "./components/MapContainer.jsx";
import ModalManager from "./components/ModalManager.jsx";

// Custom hooks
import useNavigationState from "./hooks/useNavigationState.js";
import useLocationTracking from "./hooks/useLocationTracking.js";
import useRouteManagement from "./hooks/useRouteManagement.js";
import useMapConfiguration from "./hooks/useMapConfiguration.js";
import useMapLibreSetup from "./hooks/useMapLibreSetup.js";

import "./App.css";

/**
 * Main App Component
 * Clean orchestrator that composes all functionality through hooks
 */
function App() {
  "use memo"; // React 19 compiler optimization

  // Initialize all custom hooks
  const navigationState = useNavigationState();
  const locationTracking = useLocationTracking();
  const routeManagement = useRouteManagement(locationTracking, navigationState);
  const mapConfig = useMapConfiguration(locationTracking, navigationState);
  const mapLibreSetup = useMapLibreSetup(mapConfig);

  // Auto-start location tracking when permission is granted
  useEffect(() => {
    // This will be handled by the ModalManager component
    // No need to override handlers here
  }, []);

  // Auto-create routes when destination is selected
  useEffect(() => {
    if (navigationState.destination && locationTracking.userLocation && !routeManagement.hasRoute) {
      console.log('🎯 Auto-creating route for new destination');
      routeManagement.createNewRoute(navigationState.destination, locationTracking.userLocation);
    }
  }, [
    navigationState.destination,
    locationTracking.userLocation,
    routeManagement.hasRoute,
    routeManagement.createNewRoute,
    routeManagement
  ]);

  // Cleanup on unmount
  useEffect(() => {
    const cleanup = () => {
      console.log('🧹 App cleanup');
      locationTracking.stopLocationTracking();
      mapLibreSetup.cleanupMapLibre();
    };
    
    return cleanup;
  }, [locationTracking, mapLibreSetup]);

  return (
    <>
      <Header />
      
      <main style={{ width: "100%", height: "100%", position: "relative" }}>
        {/* Debug Console */}
        <DebugConsole />
        
        {/* Main Map Container */}
        <MapContainer
          locationTracking={locationTracking}
          navigationState={navigationState}
          routeManagement={routeManagement}
          mapConfig={mapConfig}
          mapLibreSetup={mapLibreSetup}
        />
      </main>

      {/* Modal Management */}
      <ModalManager
        navigationState={navigationState}
        routeManagement={routeManagement}
        locationTracking={locationTracking}
      />
      
      <Footer />
    </>
  );
}

export default App;
