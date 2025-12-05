import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import { router } from "./router";
import { NavigationProvider } from "./contexts/NavigationContext";
import { queryClient } from "./lib/queryClient";
import "@radix-ui/themes/styles.css"; // Radix base styles (imported first to allow overrides)
import "./styles/index.css"; // Centralized styles (overrides Radix)
import "./styles/animations.css"; // Centralized @keyframes

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <Theme>
      <NavigationProvider>
        <RouterProvider router={router} />
      </NavigationProvider>
    </Theme>
  </QueryClientProvider>,
);
