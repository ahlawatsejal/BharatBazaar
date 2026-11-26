import { handleImageError } from "../../utils/imageFallback";

export default function SellerCTASection() {
  return (
    <section style={{ background: "var(--cream-warm)" }} className="py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
        <div
          className="relative overflow-hidden"
          style={{ background: "var(--burgundy)", minHeight: "400px" }}
        >
          {/* Background texture image */}
          <img
            src="/hero-clean.jpg"
            alt="Artisan at work"
            className="absolute inset-0 w-full h-full object-cover opacity-15"
            onError={(e) => handleImageError(e)}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(157,41,77,0.97) 50%, rgba(157,41,77,0.75) 100%)" }}
          />

          {/* Content */}
          <div className="relative z-10 p-8 sm:p-12 lg:p-16 max-w-2xl">
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "10.5px",
                fontWeight: "600",
                letterSpacing: "0.2em",
                color: "rgba(255,255,255,0.7)",
                textTransform: "uppercase",
                marginBottom: "14px",
              }}
            >
              Join 12,000+ Artisans
            </p>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                color: "#F8F5F0",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: "800",
                lineHeight: 1.18,
                marginBottom: "18px",
              }}
            >
              Your craft deserves<br />a bigger audience.
            </h2>
            <p
              style={{ fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.78)", fontSize: "15px", lineHeight: "1.72", marginBottom: "28px", maxWidth: "440px" }}
            >
              Whether you're a master weaver, a pottery studio or a home-based artisan —
              BharatBazaar gives you the tools to build a real online business.
            </p>

            <ul style={{ marginBottom: "32px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                "Free storefront setup with your own branding",
                "Low 8% commission — one of the lowest in India",
                "Dedicated seller dashboard with analytics",
                "Direct bank payouts within 48 hours of delivery",
              ].map(item => (
                <li
                  key={item}
                  style={{ fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.88)", fontSize: "13.5px", display: "flex", alignItems: "flex-start", gap: "10px" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginTop: "2px", flexShrink: 0 }} aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <a
              href="/seller/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--cream)",
                color: "var(--burgundy)",
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "14px 32px",
                transition: "background 0.18s, transform 0.14s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--cream)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              START SELLING ON BHARATBAZAAR
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
