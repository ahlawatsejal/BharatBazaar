import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { buildApiUrl } from "../../config/apiConfig";

const shopLinks = [
  { label: "All Products", to: "/shop" },
  { label: "Pottery & Ceramics", to: "/shop?category=pottery-ceramics" },
  { label: "Handloom & Textiles", to: "/shop?category=handloom-textiles" },
  { label: "Jewellery & Accessories", to: "/shop?category=jewellery-accessories" },
  { label: "Home Décor", to: "/shop?category=home-decor" },
  { label: "Handcrafted Metalware", to: "/shop?category=handcrafted-metalware" },
];

const supportLinks = [
  { label: "Contact Us", to: "/info/contact" },
  { label: "Shipping Policy", to: "/info/shipping-policy" },
  { label: "Returns & Refunds", to: "/customer/returns" },
  { label: "Track My Order", to: "/customer/orders" },
  { label: "Terms & Conditions", to: "/info/terms" },
  { label: "Privacy Policy", to: "/info/privacy-policy" },
];

const aboutLinks = [
  { label: "Our Story", to: "/impact" },
  { label: "Meet the Artisans", to: "/artisans" },
  { label: "Craft Stories", to: "/craft-stories" },
  { label: "Become a Seller", to: "/seller/register" },
  { label: "Seller Sign In", to: "/login" },
];

const bottomLinks = [
  { label: "Privacy Policy", to: "/info/privacy-policy" },
  { label: "Terms & Conditions", to: "/info/terms" },
  { label: "Contact", to: "/info/contact" },
];

const projectTeam = [
  { name: "Sejal", role: "Team Member 1" },
  { name: "Shubham", role: "Team Member 2" },
  { name: "Vansh", role: "Team Member 3" },
];

const PROJECT_CONTACT_EMAIL = "shubhampolist151104@gmail.com";

export default function Footer() {
  const [siteInfo, setSiteInfo] = useState({
    marketplace_name: "BharatBazaar",
    marketplace_tagline: "India's Artisans",
    marketplace_description:
      "India's curated marketplace for authentic handmade products from artisans, weavers and local MSMEs across every state.",
    support_email: "",
    support_phone: "",
    website_url: "",
    instagram_url: "",
    facebook_url: "",
    linkedin_url: "",
  });
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let mounted = true;
    adminService
      .getPublicPlatformSettings()
      .then((data) => {
        if (mounted && data) setSiteInfo((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.split("@")[1]?.includes(".")) {
      setFeedback({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(buildApiUrl("newsletter/subscribe/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 201) {
        setEmail("");
        setFeedback({
          type: "success",
          text: data.message || data.detail || "Thank you for subscribing to BharatBazaar updates.",
        });
      } else if (response.status === 200) {
        setEmail("");
        setFeedback({
          type: "info",
          text: data.message || data.detail || "This email is already subscribed to BharatBazaar updates.",
        });
      } else if (response.status === 429) {
        setFeedback({
          type: "error",
          text: "Too many subscription attempts. Please try again in a minute.",
        });
      } else {
        const emailErr = Array.isArray(data.email) ? data.email[0] : data.email;
        setFeedback({
          type: "error",
          text: emailErr || data.message || data.detail || "Unable to subscribe right now. Please try again.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while subscribing. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const socialLinks = [
    { label: "IG", url: siteInfo.instagram_url, name: "Instagram" },
    { label: "FB", url: siteInfo.facebook_url, name: "Facebook" },
    { label: "IN", url: siteInfo.linkedin_url, name: "LinkedIn" },
    { label: "WEB", url: siteInfo.website_url, name: "Website" },
  ].filter((s) => Boolean(s.url));

  return (
    <footer style={{ background: "#1A100C", color: "rgba(248,245,240,0.6)" }} className="pt-16 pb-6">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">

          {/* Brand column */}
          <div>
            <div className="mb-5 flex flex-col items-center text-center">
              <span
                style={{ fontFamily: "var(--font-sans)", color: "var(--burgundy)", fontSize: "14px", fontWeight: "700", letterSpacing: "0.22em", display: "block" }}
              >
                {(siteInfo.marketplace_name || "BHARATBAZAAR").toUpperCase()}
              </span>
              <span
                style={{ fontFamily: "var(--font-sans)", color: "rgba(248,245,240,0.4)", fontSize: "9px", letterSpacing: "0.18em", display: "block" }}
              >
                {(siteInfo.marketplace_tagline || "INDIA'S ARTISANS").toUpperCase()}
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", lineHeight: "1.72", color: "rgba(248,245,240,0.5)", marginBottom: "14px" }}>
              {siteInfo.marketplace_description}
            </p>
            {(siteInfo.support_email || siteInfo.support_phone) && (
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "11.5px", color: "rgba(248,245,240,0.5)", marginBottom: "16px" }} className="space-y-0.5">
                {siteInfo.support_email && <p>{siteInfo.support_email}</p>}
                {siteInfo.support_phone && <p>{siteInfo.support_phone}</p>}
              </div>
            )}
            <p style={{ fontFamily: "var(--font-sans)", color: "var(--gold)", fontSize: "9.5px", fontWeight: "600", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "12px" }}>
              Connect
            </p>
            {socialLinks.length > 0 ? (
              <div className="flex gap-2.5">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.name}
                    style={{ fontFamily: "var(--font-sans)", color: "rgba(248,245,240,0.5)", border: "1px solid rgba(248,245,240,0.15)", fontSize: "9.5px", fontWeight: "700", letterSpacing: "0.08em" }}
                    className="w-8 h-8 flex items-center justify-center hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition-colors"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            ) : (
              <Link
                to="/info/contact"
                style={{ fontFamily: "var(--font-sans)", color: "rgba(248,245,240,0.55)", fontSize: "12.5px" }}
                className="inline-block underline hover:text-[color:var(--gold)] transition-colors"
              >
                Contact &amp; Support Details
              </Link>
            )}
          </div>

          {/* Shop */}
          <div>
            <h4 style={{ fontFamily: "var(--font-sans)", color: "#F8F5F0", fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "16px" }}>
              Shop
            </h4>
            <ul style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {shopLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    style={{ fontFamily: "var(--font-sans)", color: "rgba(248,245,240,0.62)", fontSize: "13px" }}
                    className="hover:text-[#F8F5F0] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About BharatBazaar */}
          <div>
            <h4 style={{ fontFamily: "var(--font-sans)", color: "#F8F5F0", fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "16px" }}>
              About BharatBazaar
            </h4>
            <ul style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {aboutLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    style={{ fontFamily: "var(--font-sans)", color: "rgba(248,245,240,0.62)", fontSize: "13px" }}
                    className="hover:text-[#F8F5F0] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Support + Newsletter */}
          <div>
            <h4 style={{ fontFamily: "var(--font-sans)", color: "#F8F5F0", fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "16px" }}>
              Customer Support
            </h4>
            <ul style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
              {supportLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    style={{ fontFamily: "var(--font-sans)", color: "rgba(248,245,240,0.62)", fontSize: "13px" }}
                    className="hover:text-[#F8F5F0] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p style={{ fontFamily: "var(--font-sans)", color: "var(--gold)", fontSize: "9.5px", fontWeight: "700", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "10px" }}>
              Newsletter
            </p>
            <form onSubmit={handleNewsletterSubmit} noValidate>
              <div className="flex">
                <input
                  id="footer-newsletter-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  aria-label="Newsletter email address"
                  disabled={submitting}
                  style={{ flex: 1, background: "rgba(248,245,240,0.07)", border: "1px solid rgba(248,245,240,0.12)", borderRight: "none", padding: "9px 12px", color: "#fff", fontFamily: "var(--font-sans)", fontSize: "12px", outline: "none" }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: "var(--burgundy)", color: "#fff", fontFamily: "var(--font-sans)", fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.1em", padding: "9px 14px" }}
                  className="hover:brightness-90 transition-all uppercase disabled:opacity-60"
                >
                  {submitting ? "..." : "Join"}
                </button>
              </div>
              {feedback && (
                <p
                  role={feedback.type === "error" ? "alert" : "status"}
                  className="mt-2 text-[11.5px]"
                  style={{
                    fontFamily: "var(--font-sans)",
                    color:
                      feedback.type === "error"
                        ? "#FCA5A5"
                        : feedback.type === "success"
                        ? "#86EFAC"
                        : "#FDE68A",
                  }}
                >
                  {feedback.text}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Project Team & Contact Us */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-white/10 items-start">
          <div className="md:col-span-2">
            <h4
              style={{
                fontFamily: "var(--font-sans)",
                color: "var(--gold)",
                fontSize: "10.5px",
                fontWeight: "700",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Project Team
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {projectTeam.map((member) => (
                <div
                  key={member.name}
                  className="px-4 py-3"
                  style={{
                    background: "rgba(248,245,240,0.03)",
                    border: "1px solid rgba(248,245,240,0.12)",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      color: "#F8F5F0",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    {member.name} — {member.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4
              style={{
                fontFamily: "var(--font-sans)",
                color: "var(--gold)",
                fontSize: "10.5px",
                fontWeight: "700",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Contact Us
            </h4>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "12.5px",
                color: "rgba(248,245,240,0.55)",
                marginBottom: "6px",
              }}
            >
              Project Contact Email
            </p>
            <a
              href={`mailto:${PROJECT_CONTACT_EMAIL}`}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "13px",
                color: "#F8F5F0",
              }}
              className="inline-block underline break-all hover:text-[color:var(--gold)] transition-colors"
            >
              {PROJECT_CONTACT_EMAIL}
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "rgba(248,245,240,0.3)" }}>
            © {new Date().getFullYear()} {siteInfo.marketplace_name || "BharatBazaar"}. All rights reserved. Supporting India's artisan economy.
          </p>
          <div className="flex gap-5">
            {bottomLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "rgba(248,245,240,0.3)" }}
                className="hover:text-[rgba(248,245,240,0.6)] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
