import { createBrowserRouter } from "react-router-dom";
import MapLayout from "./layouts/MapLayout";
import GpsPermissionPage from "./pages/GpsPermissionPage";
import WelcomePage from "./pages/WelcomePage";
import NavigatePage from "./pages/NavigatePage";
import ArrivedPage from "./pages/ArrivedPage";
import ExitCompletePage from "./pages/ExitCompletePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MapLayout />,
    children: [
      {
        index: true,
        element: <GpsPermissionPage />,
      },
      {
        path: "welcome",
        element: <WelcomePage />,
      },
      {
        path: "navigate",
        element: <NavigatePage />,
      },
      {
        path: "arrived",
        element: <ArrivedPage />,
      },
      {
        path: "exit-complete",
        element: <ExitCompletePage />,
      },
    ],
  },
]);
