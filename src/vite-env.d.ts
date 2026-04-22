/// <reference types="vite/client" />

// vite-plugin-pwa virtual module declarations
declare module "virtual:pwa-register/react" {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  }
  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, (value: boolean) => void];
    offlineReady: [boolean, (value: boolean) => void];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}

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
