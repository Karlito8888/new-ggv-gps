import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  {
    ignores: [
      "dist",
      "dev-dist",
      "scripts",
      "build",
      "node_modules",
      ".netlify",
      "_bmad",
      "_bmad-output",
      "docs",
    ],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        __APP_VERSION__: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Base ESLint rules
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Best practices
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^[A-Z_]|^m(otion)?$",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "warn",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "prefer-template": "warn",

      // React rules
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Disable formatting rules (handled by Prettier)
      indent: "off",
      quotes: "off",
      semi: "off",
      "comma-dangle": "off",
      "object-curly-spacing": "off",
      "space-before-function-paren": "off",
      "keyword-spacing": "off",
      "space-before-blocks": "off",
    },
  },
];
