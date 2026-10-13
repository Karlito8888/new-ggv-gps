import { createRoot } from "react-dom/client";
import { startTrace, type TraceEvent } from "@ggv/shared";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/app.css";

declare global {
  /** Read by the CDP capture: `tab.evaluate(() => window.__trace)`. */
  interface Window {
    __trace?: TraceEvent[];
  }
}

// Trace recording is off in production unless asked for with `?trace=1`.
if (import.meta.env.DEV || location.search.includes("trace=1")) window.__trace = startTrace();

const root = createRoot(document.getElementById("root")!);

// `new ConvexReactClient(undefined)` throws at module scope — before render — so the
// ErrorBoundary below is never mounted and the user gets a white screen. That is the worst
// possible first-run failure for an app entered by scanning a QR code, so the construction is
// guarded and falls back to static markup. A malformed-but-plausible URL is a different case:
// it throws later, from the lazy `get sync()` during render, where the boundary does catch it.
let convex: ConvexReactClient;
try {
  convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
} catch (error) {
  console.error("Convex client could not be created", error);
  root.render(
    <div className="overlay">
      <div className="modal error-modal">
        <h1>Configuration error</h1>
        <p className="overlay-tagalog">(May problema sa configuration)</p>
        <p className="overlay-description">
          MyGGV GPS is missing its backend address, so it cannot load the village map data.
          <span className="tagalog-inline">
            Kulang ang address ng backend ng MyGGV GPS, hindi ma-load ang datos ng village.
          </span>
        </p>
      </div>
    </div>
  );
  throw error;
}

root.render(
  <ErrorBoundary>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </ErrorBoundary>
);
