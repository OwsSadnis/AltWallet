import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdateBanner() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        setInterval(async () => {
          if (!(!r.installing && navigator.onLine)) return;
          await r.update();
        }, 30 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="aw-update-banner">
      <span className="aw-update-banner-text">
        Updates were recently added — click to refresh. Your scan results are saved in History for Pro & Business users.
      </span>
      <div className="aw-update-banner-actions">
        <button
          className="aw-update-banner-btn"
          onClick={() => updateServiceWorker(true)}
        >
          Refresh ↻
        </button>
        <button
          className="aw-update-banner-dismiss"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
