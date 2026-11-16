import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*.{ts,tsx,js,jsx,cjs,mjs,json}": "vp check --fix",
  },
  lint: {
    plugins: ["oxc", "typescript", "unicorn"],
    categories: {
      correctness: "warn",
    },
    env: {
      builtin: true,
    },
    ignorePatterns: [
      "**/dist",
      "**/dev-dist",
      "build",
      "**/node_modules",
      ".netlify",
      // Native and generated trees of the Expo app.
      "**/android/**",
      "**/ios/**",
      "**/.expo/**",
    ],
    overrides: [
      {
        files: ["**/*.{js,jsx,ts,tsx}"],
        rules: {
          "constructor-super": "error",
          "for-direction": "error",
          "getter-return": "error",
          "no-async-promise-executor": "error",
          "no-case-declarations": "error",
          "no-class-assign": "error",
          "no-compare-neg-zero": "error",
          "no-cond-assign": "error",
          "no-const-assign": "error",
          "no-constant-binary-expression": "error",
          "no-constant-condition": "error",
          "no-control-regex": "error",
          "no-debugger": "warn",
          "no-delete-var": "error",
          "no-dupe-class-members": "error",
          "no-dupe-else-if": "error",
          "no-dupe-keys": "error",
          "no-duplicate-case": "error",
          "no-empty": "error",
          "no-empty-character-class": "error",
          "no-empty-pattern": "error",
          "no-empty-static-block": "error",
          "no-ex-assign": "error",
          "no-extra-boolean-cast": "error",
          "no-fallthrough": "error",
          "no-func-assign": "error",
          "no-global-assign": "error",
          "no-import-assign": "error",
          "no-invalid-regexp": "error",
          "no-irregular-whitespace": "error",
          "no-loss-of-precision": "error",
          "no-misleading-character-class": "error",
          "no-new-native-nonconstructor": "error",
          "no-nonoctal-decimal-escape": "error",
          "no-obj-calls": "error",
          "no-prototype-builtins": "error",
          "no-redeclare": "error",
          "no-regex-spaces": "error",
          "no-self-assign": "error",
          "no-setter-return": "error",
          "no-shadow-restricted-names": "error",
          "no-sparse-arrays": "error",
          "no-this-before-super": "error",
          // TypeScript resolves identifiers (`tsc` and the type-aware pass), so no global list
          // is declared here.
          "no-undef": "off",
          "no-unexpected-multiline": "error",
          "no-unreachable": "error",
          "no-unsafe-finally": "error",
          "no-unsafe-negation": "error",
          "no-unsafe-optional-chaining": "error",
          "no-unused-labels": "error",
          "no-unused-private-class-members": "error",
          "no-unused-vars": [
            "error",
            {
              argsIgnorePattern: "^_",
              varsIgnorePattern: "^_",
            },
          ],
          "no-useless-backreference": "error",
          "no-useless-catch": "error",
          "no-useless-escape": "error",
          "no-with": "error",
          "require-yield": "error",
          "use-isnan": "error",
          "valid-typeof": "error",
          "no-console": [
            "warn",
            {
              allow: ["warn", "error", "info"],
            },
          ],
          "prefer-const": "error",
          "no-var": "error",
          eqeqeq: ["error", "always"],
          "no-eval": "error",
          "no-implied-eval": "error",
          "prefer-template": "warn",
          "react/rules-of-hooks": "error",
          "react/exhaustive-deps": "warn",
          "react/static-components": "error",
          "react/use-memo": "error",
          "react/preserve-manual-memoization": "error",
          "react/incompatible-library": "warn",
          "react/immutability": "error",
          "react/globals": "error",
          "react/refs": "error",
          "react/set-state-in-effect": "error",
          "react/error-boundaries": "error",
          "react/purity": "error",
          "react/set-state-in-render": "error",
          "react/unsupported-syntax": "warn",
          "react/only-export-components": [
            "warn",
            {
              allowConstantExport: true,
            },
          ],
        },
        env: {
          es2026: true,
        },
        plugins: ["react"],
      },
      {
        // Shared code runs on React Native too: no browser globals.
        files: ["packages/shared/**/*.{ts,tsx}"],
        rules: {
          "no-restricted-globals": ["error", "window", "document", "navigator", "location"],
        },
      },
      {
        // Expo app: eslint-config-expo ported to Oxlint (reference: ~/Bureau/myggv/vite.config.ts).
        // Later than the `**/*.{js,jsx,ts,tsx}` override above, so these values win in apps/mobile.
        files: ["apps/mobile/**"],
        plugins: ["import", "react"],
        // React Native globals, as declared by `eslint-config-expo`.
        env: {
          builtin: true,
          es2022: true,
          browser: true,
          commonjs: true,
        },
        globals: {
          __DEV__: "readonly",
          ErrorUtils: "readonly",
          clearImmediate: "readonly",
          process: "readonly",
          setImmediate: "readonly",
        },
        rules: {
          // eslint-config-expo: core and import.
          "import/named": "error",
          "import/namespace": "error",
          "import/default": "error",
          "import/export": "error",
          "import/no-named-as-default": "warn",
          "import/no-named-as-default-member": "warn",
          "import/no-duplicates": "warn",
          "import/first": "warn",
          eqeqeq: ["warn", "smart"],
          "no-extend-native": "warn",
          "no-extra-bind": "warn",
          "unicode-bom": ["warn", "never"],
          "no-unused-vars": [
            "warn",
            {
              vars: "all",
              args: "none",
              ignoreRestSiblings: true,
              caughtErrors: "all",
              caughtErrorsIgnorePattern: "^_",
            },
          ],
          "no-unused-expressions": ["warn", { allowShortCircuit: true, enforceForJSX: true }],
          "no-useless-constructor": "warn",
          // eslint-config-expo: typescript.
          "typescript/array-type": ["warn", { default: "array" }],
          "typescript/no-empty-object-type": "warn",
          "typescript/no-wrapper-object-types": "warn",
          "typescript/consistent-type-assertions": [
            "warn",
            { assertionStyle: "as", objectLiteralTypeAssertions: "allow" },
          ],
          "typescript/no-extra-non-null-assertion": "warn",
          // Metro resolves assets through static `require(...)`: there is no import form for them.
          "typescript/no-require-imports": "off",
          // eslint-config-expo: expo.
          "expo/use-dom-exports": "error",
          "expo/no-env-var-destructuring": "error",
          "expo/no-dynamic-env-var": "error",
          // eslint-config-expo: react.
          "react/display-name": "error",
          "react/jsx-key": "error",
          "react/jsx-no-comment-textnodes": "error",
          "react/jsx-no-duplicate-props": "error",
          "react/jsx-no-undef": "error",
          "react/no-children-prop": "error",
          "react/no-danger-with-children": "error",
          "react/no-direct-mutation-state": "error",
          "react/no-find-dom-node": "error",
          "react/no-is-mounted": "error",
          "react/no-render-return-value": "error",
          "react/no-string-refs": "error",
          "react/no-unescaped-entities": "error",
          "react/no-unknown-property": "warn",
          "react/no-unsafe": "off",
          "react/require-render-return": "error",
          // `react/immutability` and `react/purity` diverge from ESLint's `react-hooks/*` rules
          // (as in myggv), so the ESLint rule runs for those two.
          "react/immutability": "off",
          "react-hooks-js/immutability": "error",
          "react/purity": "off",
          "react-hooks-js/purity": "error",
          // Not enforced by the former `expo lint` (it reported none of them):
          // fire-and-forget Haptics/Linking/audio calls, `Sentry.ErrorBoundary`'s render prop,
          // and the module-level components of App.tsx.
          "typescript/no-floating-promises": "off",
          "typescript/unbound-method": "off",
          "react/only-export-components": "off",
        },
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
      "eslint-plugin-expo",
      // ESLint's react-hooks rules, for the two whose native port diverges (see apps/mobile below).
      { name: "react-hooks-js", specifier: "eslint-plugin-react-hooks" },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
    },
  },
  fmt: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    quoteProps: "as-needed",
    jsxSingleQuote: false,
    trailingComma: "es5",
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: "always",
    endOfLine: "lf",
    sortPackageJson: false,
    // Oxfmt skips git-ignored files, the `*` .gitignore inside each `*-out/` report folder
    // included: only tracked files it must not touch go here.
    ignorePatterns: [
      // Lockfile and manifests (bun writes them)
      "package.json",
      "bun.lock",
      // Generated / large JSON
      "apps/web/public/sprites/*.json",
      "apps/mobile/assets/data/",
    ],
  },
});
