import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return; // Carte déjà initialisée
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json', // Style par défaut
      center: [2.3522, 46.6034], // Centre sur la France
      zoom: 5
    });

    // Ajout des contrôles de navigation
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => map.current?.remove();
  }, []);

  return (
    <div className="app">
      <div ref={mapContainer} className="map-container" />
      <button 
        className="fullscreen-btn"
        onClick={() => document.body.requestFullscreen()}
      >
        Plein écran
      </button>
      <div className="gps-info">
        <span id="speed">Vitesse: 0 km/h</span>
        <span id="accuracy">Précision: --</span>
      </div>
    </div>
  );
}

export default App
