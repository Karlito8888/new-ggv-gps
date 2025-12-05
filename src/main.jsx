import { createRoot } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import App from "./App";
import "@radix-ui/themes/styles.css"; // Radix base styles
import "./styles/index.css"; // Centralized Tailwind styles
import "./styles/animations.css"; // Centralized @keyframes
import "./styles/app.css"; // New app-specific styles

/**
 * Main Entry Point
 *
 * Simplified from old architecture:
 * - ❌ No RouterProvider (react-router-dom removed)
 * - ❌ No QueryClientProvider (@tanstack/react-query removed)
 * - ❌ No NavigationProvider (context removed)
 * - ✅ Just Theme + App
 */

createRoot(document.getElementById("root")).render(
  <Theme>
    <App />
  </Theme>,
);
