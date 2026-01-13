import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/app.css";

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silent fail - SW is optional enhancement
    });
  });
}

createRoot(document.getElementById("root")).render(<App />);
