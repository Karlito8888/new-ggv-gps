// Expo's flat config. The repo-root config ignores apps/mobile/**: this one governs it.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Metro resolves assets through static `require(...)`: there is no import form for them.
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  { ignores: ["android/*", "ios/*", ".expo/*"] },
]);
