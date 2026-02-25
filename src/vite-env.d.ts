/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

// iOS 13+ DeviceOrientationEvent type augmentations
// Declaration merge: adds webkitCompassHeading to all DeviceOrientationEvent instances
interface DeviceOrientationEvent {
  readonly webkitCompassHeading?: number;
}

// iOS 13+ static method type for DeviceOrientationEvent constructor
// Used inline via: DeviceOrientationEvent as unknown as { requestPermission?: ... }
interface DeviceOrientationEventWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

// PNG/MP3 asset module declarations (Vite handles these, but explicit for strict mode)
declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.mp3" {
  const src: string;
  export default src;
}
