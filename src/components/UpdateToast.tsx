import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Toast notification that appears when a new version of the app is available.
 * Uses vite-plugin-pwa's virtual:pwa-register/react hook.
 *
 * - User clicks "Update" → new SW activates → page reloads with latest version
 * - User clicks "Dismiss" → toast closes, user keeps current version until next visit
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Periodically check for updates every hour
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  const handleClose = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const show = offlineReady || needRefresh;

  if (!show) return null;

  return (
    <div className="update-toast">
      <div className="update-toast-content">
        <span className="update-toast-icon">{offlineReady && !needRefresh ? "✅" : "🔄"}</span>
        <span className="update-toast-text">
          {offlineReady && !needRefresh ? "App ready to work offline" : "New version available"}
          <span className="update-toast-tagalog">
            {offlineReady && !needRefresh ? "(Handa na offline)" : "(May bagong bersyon)"}
          </span>
        </span>
      </div>
      <div className="update-toast-actions">
        {needRefresh && (
          <button className="update-toast-btn update-toast-btn-primary" onClick={handleUpdate}>
            Update
          </button>
        )}
        <button className="update-toast-btn update-toast-btn-dismiss" onClick={handleClose}>
          {needRefresh ? "Later" : "OK"}
        </button>
      </div>
    </div>
  );
}
