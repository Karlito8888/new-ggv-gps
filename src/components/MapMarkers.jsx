// Map markers component
// Handles rendering of all markers (destination, user, POIs, blocks)

import { Marker } from "react-map-gl/maplibre";
import { publicPois } from "../data/public-pois.js";
import { blocks } from "../data/blocks.js";
import { getPolygonCenter } from '../lib/mapUtils.js';

/**
 * Map Markers Component
 * Renders all map markers based on navigation state
 * @param {Object} props - Component props
 * @param {Object} props.locationTracking - Location tracking hook data
 * @param {Object} props.navigationState - Navigation state hook data
 * @returns {JSX.Element} Markers JSX
 */
function MapMarkers({ locationTracking, navigationState }) {
  const { userLocation } = locationTracking;
  const { destination, isNavigatingState } = navigationState;

  return (
    <>
      {/* Destination Marker */}
      {destination && (
        <Marker
          longitude={destination.coordinates[0]}
          latitude={destination.coordinates[1]}
          anchor="bottom"
        >
          <div className="destination-marker">
            <div className="destination-marker-pin">
              <div className="destination-marker-center"></div>
            </div>
          </div>
        </Marker>
      )}

      {/* User Location Marker (only during navigation) */}
      {userLocation && isNavigatingState && (
        <Marker
          longitude={userLocation.longitude}
          latitude={userLocation.latitude}
          anchor="center"
        >
          <div className="user-location-marker">
            <div className="user-location-pin">
              <div className="user-location-arrow"></div>
            </div>
          </div>
        </Marker>
      )}

      {/* POI Markers (only during navigation) */}
      {isNavigatingState &&
        publicPois.map((poi) => (
          <Marker
            key={poi.name}
            longitude={poi.coords[0]}
            latitude={poi.coords[1]}
          >
            <img
              src={poi.icon}
              alt={poi.name}
              style={{ width: "50px", height: "auto" }}
              title={poi.name}
            />
          </Marker>
        ))}

      {/* Block Number Labels (only during navigation) */}
      {isNavigatingState &&
        blocks.map((block) => {
          // Skip blocks without names or green blocks (likely parks/common areas)
          if (!block.name || block.color === "#19744B") return null;

          const center = getPolygonCenter(block.coords);

          return (
            <Marker
              key={`block-${block.name}`}
              longitude={center[0]}
              latitude={center[1]}
              anchor="center"
            >
              <div className="block-label">{block.name}</div>
            </Marker>
          );
        })}
    </>
  );
}

export default MapMarkers;