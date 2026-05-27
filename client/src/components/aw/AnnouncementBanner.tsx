import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Announcement {
  id: string;
  message: string;
  active: boolean;
  expires_at: string | null;
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success && d.announcement) {
          const a: Announcement = d.announcement;
          const key = `dismissed_announcement_${a.id}`;
          if (sessionStorage.getItem(key)) {
            setDismissed(true);
          }
          setAnnouncement(a);
        }
      })
      .catch(() => null);
  }, []);

  if (!announcement || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(`dismissed_announcement_${announcement.id}`, "1");
    setDismissed(true);
  };

  return (
    <div
      style={{
        background: "#854d0e",
        borderBottom: "1px solid #a16207",
      }}
      className="flex items-center justify-between gap-4 px-4 py-2.5"
    >
      <p
        className="text-[13px] font-medium flex-1 text-center"
        style={{ color: "#fef08a" }}
      >
        {announcement.message}
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: "#fef08a" }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
