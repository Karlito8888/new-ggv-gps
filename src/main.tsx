import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/app.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </ErrorBoundary>
);
