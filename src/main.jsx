import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import { router } from "./router";
import { NavigationProvider } from "./contexts/NavigationContext";
import { queryClient } from "./lib/queryClient";
import "./styles/index.css"; // Centralized styles
import "./styles/animations.css"; // Centralized @keyframes
import "@radix-ui/themes/styles.css";

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <Theme>
      <NavigationProvider>
        <RouterProvider router={router} />
      </NavigationProvider>
    </Theme>
  </QueryClientProvider>,
);
