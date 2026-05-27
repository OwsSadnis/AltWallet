import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdateBanner() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "fit-content",
        maxWidth: 560,
        zIndex: 9999,
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        justifyContent: "space-between",
        padding: "12px 16px",
        // Responsive width on small screens via inline calc fallback isn't possible,
        // so we clamp via maxWidth + left/right padding on the viewport.
      }}
    >
      <span style={{ color: "#ccc", fontSize: 13, flexShrink: 1 }}>
        Updates were recently added — click to refresh. Your scan results are saved in History.
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => updateServiceWorker(true)}
          style={{
            background: "#1D9E75",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "4px 12px",
            fontSize: 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Refresh ↻
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          style={{
            background: "none",
            border: "none",
            color: "#555",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
            padding: "0 2px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
