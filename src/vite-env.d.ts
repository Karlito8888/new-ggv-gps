/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

// iOS 13+ DeviceOrientationEvent type augmentation
interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

interface DeviceOrientationEventConstructor {
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
