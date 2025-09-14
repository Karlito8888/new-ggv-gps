import { useEffect } from "react";

/**
 * Hook pour gérer les interactions avec les SymbolLayer
 * @param {Object} mapRef - Référence MapLibre
 * @param {Function} onPoiClick - Callback pour le clic sur POI
 * @param {Function} onDestinationClick - Callback pour le clic sur destination
 */
export function useSymbolLayerInteractions(mapRef, onPoiClick, onDestinationClick) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Gestionnaire de clic pour les POI
    const handlePoiClick = (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      if (feature.properties.type === 'poi' && onPoiClick) {
        onPoiClick(feature.properties);
      }
    };

    // Gestionnaire de clic pour la destination
    const handleDestinationClick = (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      if (feature.properties.type === 'destination' && onDestinationClick) {
        onDestinationClick(feature.properties);
      }
    };

    // Ajouter les écouteurs d'événements
    if (onPoiClick) {
      map.on('click', 'poi-symbols', handlePoiClick);
    }
    
    if (onDestinationClick) {
      map.on('click', 'destination-symbol', handleDestinationClick);
    }

    // Effets de survol
    map.on('mouseenter', 'poi-symbols', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'poi-symbols', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', 'destination-symbol', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'destination-symbol', () => {
      map.getCanvas().style.cursor = '';
    });

    // Nettoyage
    return () => {
      if (onPoiClick) {
        map.off('click', 'poi-symbols', handlePoiClick);
      }
      
      if (onDestinationClick) {
        map.off('click', 'destination-symbol', handleDestinationClick);
      }
      
      map.off('mouseenter', 'poi-symbols');
      map.off('mouseleave', 'poi-symbols');
      map.off('mouseenter', 'destination-symbol');
      map.off('mouseleave', 'destination-symbol');
    };
  }, [mapRef, onPoiClick, onDestinationClick]);
}