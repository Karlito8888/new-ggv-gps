// Unified bearing management system
import { calculateBearing, bearingToDirection } from './geometry.js';

/**
 * Types de bearings utilisés dans l'application
 */
export const BEARING_TYPES = {
  DEVICE: 'device',           // Orientation du device (boussole)
  DESTINATION: 'destination', // Direction vers la destination
  RELATIVE: 'relative'        // Bearing relatif pour les instructions
};

/**
 * Gestionnaire centralisé des bearings
 */
export class BearingManager {
  constructor() {
    this.bearings = {
      [BEARING_TYPES.DEVICE]: 0,
      [BEARING_TYPES.DESTINATION]: 0,
      [BEARING_TYPES.RELATIVE]: 0
    };
    this.listeners = new Map();
  }

  /**
   * Met à jour un bearing spécifique
   * @param {string} type - Type de bearing (BEARING_TYPES)
   * @param {number} value - Valeur en degrés (0-360)
   */
  setBearing(type, value) {
    if (!Object.values(BEARING_TYPES).includes(type)) {
      console.warn(`Type de bearing invalide: ${type}`);
      return;
    }

    const normalizedValue = (value + 360) % 360;
    const oldValue = this.bearings[type];
    
    if (oldValue !== normalizedValue) {
      this.bearings[type] = normalizedValue;
      this.notifyListeners(type, normalizedValue, oldValue);
    }
  }

  /**
   * Récupère un bearing spécifique
   * @param {string} type - Type de bearing
   * @returns {number} Valeur en degrés
   */
  getBearing(type) {
    return this.bearings[type] || 0;
  }

  /**
   * Calcule et met à jour le bearing vers la destination
   * @param {number} userLat - Latitude utilisateur
   * @param {number} userLon - Longitude utilisateur
   * @param {number} destLat - Latitude destination
   * @param {number} destLon - Longitude destination
   */
  updateDestinationBearing(userLat, userLon, destLat, destLon) {
    const bearing = calculateBearing(userLat, userLon, destLat, destLon);
    this.setBearing(BEARING_TYPES.DESTINATION, bearing);
    
    // Calculer automatiquement le bearing relatif
    const deviceBearing = this.getBearing(BEARING_TYPES.DEVICE);
    const relativeBearing = (bearing - deviceBearing + 360) % 360;
    this.setBearing(BEARING_TYPES.RELATIVE, relativeBearing);
    
    return {
      destination: bearing,
      relative: relativeBearing,
      direction: bearingToDirection(bearing)
    };
  }

  /**
   * Met à jour le bearing du device et recalcule le bearing relatif
   * @param {number} deviceBearing - Orientation du device
   */
  updateDeviceBearing(deviceBearing) {
    this.setBearing(BEARING_TYPES.DEVICE, deviceBearing);
    
    // Recalculer le bearing relatif si on a une destination
    const destinationBearing = this.getBearing(BEARING_TYPES.DESTINATION);
    if (destinationBearing !== 0) {
      const relativeBearing = (destinationBearing - deviceBearing + 360) % 360;
      this.setBearing(BEARING_TYPES.RELATIVE, relativeBearing);
    }
  }

  /**
   * Ajoute un listener pour les changements de bearing
   * @param {string} type - Type de bearing à écouter
   * @param {Function} callback - Fonction appelée lors du changement
   */
  addListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
  }

  /**
   * Supprime un listener
   * @param {string} type - Type de bearing
   * @param {Function} callback - Fonction à supprimer
   */
  removeListener(type, callback) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(callback);
    }
  }

  /**
   * Notifie les listeners d'un changement
   * @private
   */
  notifyListeners(type, newValue, oldValue) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach(callback => {
        try {
          callback(newValue, oldValue, type);
        } catch (error) {
          console.error(`Erreur dans listener bearing ${type}:`, error);
        }
      });
    }
  }

  /**
   * Remet à zéro tous les bearings
   */
  reset() {
    Object.keys(this.bearings).forEach(type => {
      this.setBearing(type, 0);
    });
  }

  /**
   * Récupère tous les bearings actuels
   * @returns {Object} Objet contenant tous les bearings
   */
  getAllBearings() {
    return { ...this.bearings };
  }
}

// Instance singleton
export const bearingManager = new BearingManager();

// Fonctions utilitaires pour compatibilité
export function updateDeviceBearing(bearing) {
  bearingManager.updateDeviceBearing(bearing);
}

export function updateDestinationBearing(userLat, userLon, destLat, destLon) {
  return bearingManager.updateDestinationBearing(userLat, userLon, destLat, destLon);
}

export function getDeviceBearing() {
  return bearingManager.getBearing(BEARING_TYPES.DEVICE);
}

export function getDestinationBearing() {
  return bearingManager.getBearing(BEARING_TYPES.DESTINATION);
}

export function getRelativeBearing() {
  return bearingManager.getBearing(BEARING_TYPES.RELATIVE);
}