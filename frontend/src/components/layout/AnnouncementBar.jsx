import { useState, useEffect } from "react";
import { adminService } from "../../services/adminService";

/**
 * AnnouncementBar — dismissible strip beneath the header.
 * Connected to saved PlatformSettings via /api/admin/public-settings/ with safe fallback.
 */
export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const [announcement, setAnnouncement] = useState({
    enabled: true,
    message: "Free shipping on orders above ₹999",
    type: "PROMOTION",
  });

  useEffect(() => {
    let mounted = true;
    adminService
      .getPublicPlatformSettings()
      .then((data) => {
        if (!mounted || !data) return;
        setAnnouncement({
          enabled: Boolean(data.announcement_enabled),
          message: data.announcement_message || "",
          type: data.announcement_type || "PROMOTION",
        });
      })
      .catch(() => {
        // Keep safe fallback if backend is unavailable
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!visible || !announcement.enabled || !announcement.message.trim()) {
    return null;
  }

  const bgColor =
    announcement.type === "NOTICE"
      ? "#7A2E1D"
      : announcement.type === "INFORMATION"
      ? "#2C2C2C"
      : "var(--brown-dark)";

  return (
    <div
      style={{
        background: bgColor,
        color: "rgba(248,245,240,0.92)",
        fontFamily: "var(--font-sans)",
        fontSize: "11.5px",
        letterSpacing: "0.04em",
      }}
      className="relative flex items-center justify-center px-10 py-2.5"
      role="banner"
    >
      <p>
        {announcement.message}&nbsp;·&nbsp;
        <a
          href="/shop"
          style={{
            color: "inherit",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            fontWeight: "600",
          }}
          className="hover:opacity-80 transition-opacity"
        >
          Shop now
        </a>
      </p>

      {/* Dismiss */}
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss announcement"
        style={{ color: "rgba(248,245,240,0.5)" }}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:text-[#F8F5F0] transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
