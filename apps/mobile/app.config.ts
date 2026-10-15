import type { ExpoConfig } from "expo/config";

/**
 * The three builds of the app, keyed by `APP_VARIANT`. Each has its own name, application id and
 * URL scheme so they can sit side by side on one phone.
 * @see https://docs.expo.dev/tutorial/eas/multiple-app-variants.md
 */
const variants = {
  development: { name: "MyGGV GPS (Dev)", id: "com.myggv.gps.dev", scheme: "myggv-gps-dev" },
  preview: {
    name: "MyGGV GPS (Preview)",
    id: "com.myggv.gps.preview",
    scheme: "myggv-gps-preview",
  },
  production: { name: "MyGGV GPS", id: "com.myggv.gps", scheme: "myggv-gps" },
};

/** An unset `APP_VARIANT` is the development build, so a bare `expo run:android` never gets the production id. */
const requestedVariant = process.env.APP_VARIANT || "development";
if (!Object.hasOwn(variants, requestedVariant)) {
  throw new Error(
    `APP_VARIANT must be one of ${Object.keys(variants).join(", ")}, got "${requestedVariant}"`
  );
}
const variant = variants[requestedVariant as keyof typeof variants];

/** The one UI face. A package specifier resolves from the project root under the hoisted linker. */
const madimi = "@expo-google-fonts/madimi-one/400Regular/MadimiOne_400Regular.ttf";

/**
 * - `expo-dev-client` is listed only to set `addGeneratedScheme`: only the development build,
 *   the one with a dev client, gets the generated `exp+<slug>` scheme.
 * - `expo-font` embeds Madimi One at build time (Android XML font family `Madimi One`; iOS reads
 *   the family name from the file).
 * - Location is foreground only: no background keys, and the "Always" and motion purpose strings
 *   the `expo-location` plugin adds by default are removed (`false`), since nothing requests them.
 * - `blockedPermissions` drops what the prebuild template declares and this app never uses.
 * - `platforms` is pinned to the native targets: unset, `web` is added whenever `react-dom` is
 *   installed, and the hoisted `node_modules` holds the copy `apps/web` depends on.
 */
const config: ExpoConfig = {
  name: variant.name,
  slug: "myggv-gps",
  owner: "charles88888",
  version: "1.0.0",
  orientation: "portrait",
  platforms: ["ios", "android"],
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  scheme: variant.scheme,
  ios: {
    bundleIdentifier: variant.id,
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: variant.id,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundImage: "./assets/android-background.png",
      monochromeImage: "./assets/android-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    blockedPermissions: [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
  },
  plugins: [
    ["expo-dev-client", { addGeneratedScheme: requestedVariant === "development" }],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "MyGGV GPS uses your location to guide you to your destination inside Garden Grove Village.",
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        motionUsagePermission: false,
      },
    ],
    [
      "expo-font",
      {
        android: {
          fonts: [{ fontFamily: "Madimi One", fontDefinitions: [{ path: madimi, weight: 400 }] }],
        },
        ios: { fonts: [madimi] },
      },
    ],
    [
      "@sentry/react-native/expo",
      { url: "https://de.sentry.io/", organization: "charles-bourgault", project: "myggv-gps" },
    ],
    "@maplibre/maplibre-react-native",
  ],
  experiments: { reactCompiler: true },
  extra: { eas: { projectId: "9e1644f0-44ba-4e4d-bb14-792ab39cb3b5" } },
};

export default config;
