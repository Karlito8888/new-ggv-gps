// Default configuration constants for MapLibre GL JS
// Centralized constants to avoid duplication across components

// Default coordinates for Garden Grove Village
export const DEFAULT_COORDS = {
  latitude: 14.347872973134175,
  longitude: 120.95134859887523,
};

// Map zoom levels for different navigation states
export const ZOOM_LEVELS = {
  welcome: 16.5,
  navigating: 18,
  default: 16,
};

// Map pitch angles for different states
export const PITCH_ANGLES = {
  welcome: 45,
  navigating: 60,
  default: 0,
};

// Map interaction settings
export const MAP_INTERACTIONS = {
  touchZoomRotate: true,
  doubleClickZoom: true,
  dragPan: true,
  scrollZoom: true,
  touchPitch: true,
};

// Geolocation options
export const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 1000,
};

// Map control positions
export const CONTROL_POSITIONS = {
  geolocate: 'bottom-left',
  navigation: 'bottom-right',
  mapType: 'top-right',
  loading: 'top-left',
  newDestination: 'top-center',
};