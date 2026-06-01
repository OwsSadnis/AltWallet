import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

const DISMISSED_KEY = "aw_update_banner_dismissed";

export function UpdateBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === "true"
  );

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        setInterval(async () => {
          if (!(!r.installing && navigator.onLine)) return;
          await r.update();
        }, 30 * 1000);
      }
    },
  });

  if (!needRefresh || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
    setNeedRefresh(false);
  };

  return (
    <div className="aw-update-banner">
      <span className="aw-update-banner-text">
        Updates were recently added — click to refresh. Your scan results are saved in History.
      </span>
      <div className="aw-update-banner-actions">
        <button
          className="aw-update-banner-btn"
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, "true");
            setNeedRefresh(false);
            updateServiceWorker(true);
          }}
        >
          Refresh ↻
        </button>
        <button
          className="aw-update-banner-dismiss"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
