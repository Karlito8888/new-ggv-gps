const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);
// The village tileset, the glyph PBFs and the sprite PNGs (renamed `.sprite`, see mapAssets.ts)
// ship inside the app as assets.
config.resolver.assetExts.push("pmtiles", "pbf", "sprite");

module.exports = config;
