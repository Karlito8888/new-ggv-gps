const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);
// The village tileset and the glyph PBFs ship inside the app as assets.
config.resolver.assetExts.push("pmtiles", "pbf");

module.exports = config;
