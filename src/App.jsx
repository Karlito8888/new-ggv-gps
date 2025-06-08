import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (map.current) return; // Carte déjà initialisée
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [2.3522, 46.6034],
      zoom: 17,
      pitch: 60,
      bearing: 0,
      antialias: true
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      map.current.addSource('gps-position', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.current.addLayer({
        id: 'gps-point',
        type: 'circle',
        source: 'gps-position',
        paint: {
          'circle-radius': 10,
          'circle-color': '#4285F4'
        }
      });

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          setPosition(pos.coords);
          
          map.current.getSource('gps-position').setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: coords }
            }]
          });

          map.current.flyTo({
            center: coords,
            bearing: pos.coords.heading || 0,
            pitch: 60,
            essential: true
          });
        },
        (err) => console.error('Erreur GPS:', err),
        { enableHighAccuracy: true }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    });

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
