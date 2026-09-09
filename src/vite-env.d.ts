/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Exposé par `src/lib/trace.ts` en DEV ou sous `?trace=1`, pour que la capture CDP puisse
// lire la trace avec `tab.evaluate(() => window.__trace)`.
interface Window {
  __trace?: import("./lib/trace").TraceEvent[];
}

declare const __APP_VERSION__: string;
