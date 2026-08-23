import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * One-time confirmation that the app is usable without a network.
 *
 * There is deliberately no "a new version is available" branch any more: the service worker is
 * registered with `registerType: "autoUpdate"` and calls `skipWaiting()`, so a new build takes
 * over on its own and `needRefresh` never fires. Asking a visitor at the village gate to tap
 * "Update" before walking was how an installed PWA ended up serving a stale bundle.
 *
 * No periodic `registration.update()` either. The browser checks for a new worker on every
 * launch, which is the moment that matters for a session lasting a few minutes — and an update
 * found mid-walk would reload the page and throw away the active route.
 */
export function UpdateToast() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  if (!offlineReady) return null;

  return (
    <div className="update-toast">
      <div className="update-toast-content">
        <span className="update-toast-icon">✅</span>
        <span className="update-toast-text">
          App ready to work offline
          <span className="update-toast-tagalog">(Handa na offline)</span>
        </span>
      </div>
      <div className="update-toast-actions">
        <button
          className="update-toast-btn update-toast-btn-dismiss"
          onClick={() => setOfflineReady(false)}
        >
          OK (Sige)
        </button>
      </div>
    </div>
  );
}
