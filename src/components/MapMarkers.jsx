import React from "react";
import { Marker } from "react-map-gl/maplibre";
import { publicPois } from "../data/public-pois";
import { blocks } from "../data/blocks";
import stopLogo from "../assets/img/stop.png";

export function MapMarkers({ 
  destination, 
  getPolygonCenter, 
  navigationState,
  handleNewDestination 
}) {
  return (
    <>
      {/* Destination marker */}
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

      {/* User marker is now handled by showUserLocation of GeolocateControl */}

      {/* POI display - always visible */}
      {publicPois.map((poi) => (
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

      {/* Block number display - always visible */}
      {blocks.map((block) => {
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

      {/* New destination button during navigation */}
      {navigationState === "navigating" && (
        <div className="new-destination-control">
          <button
            onClick={handleNewDestination}
            className="new-destination-button"
            title="New destination"
          >
            <img src={stopLogo} alt="Nouvelle destination" />
          </button>
        </div>
      )}
    </>
  );
}