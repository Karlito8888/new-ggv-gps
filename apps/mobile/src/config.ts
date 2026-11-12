// Public values (an endpoint URL and a write-only DSN), so plain constants: Expo `.env` files are
// not selected per build mode (official env-vars guide), and constants cannot ship a dev URL by
// accident.

/** Same deployment as the web app's `VITE_CONVEX_URL` (apps/web/.env.production). */
export const CONVEX_URL = "https://elegant-dalmatian-876.eu-west-1.convex.cloud";

/** Sentry project `myggv-gps`. A DSN only allows sending events. */
export const SENTRY_DSN =
  "https://d4f463f83fd1593ae56367c450179752@o4511598149173248.ingest.de.sentry.io/4512248828919888";

/**
 * Version floor (`{ minIos, minAndroid }`), served with the web app (`apps/web/public`). A build
 * below its platform's floor shows a blocking update screen; raise a floor only to retire a version.
 */
export const APP_CONFIG_URL = "https://myggvgps.charlesbourgault.com/app-config.json";

export const STORE_URL = {
  ios: "https://apps.apple.com/app/id6822344962",
  android: "https://play.google.com/store/apps/details?id=com.myggv.gps",
};
