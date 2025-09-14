import React from "react";
import { Marker } from "react-map-gl/maplibre";
import { publicPois } from "../data/public-pois";
import { blocks } from "../data/blocks";
import styles from './mapMarkers.module.css';

export function MapMarkers({
  destination,
  getPolygonCenter
}) {
  return (
    <>
      {/* Destination marker - avec validation selon la documentation MapLibre */}
      {destination && destination.coordinates && Array.isArray(destination.coordinates) && destination.coordinates.length === 2 && (
        <Marker
          longitude={destination.coordinates[0]}
          latitude={destination.coordinates[1]}
          anchor="bottom"
        >
          <div className={styles.destinationMarker}>
            <div className={styles.destinationMarkerPin}>
              <div className={styles.destinationMarkerCenter}></div>
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
            <div className={styles.blockLabel}>{block.name}</div>
          </Marker>
        );
      })}
    </>
  );
}
