const reasons = [
  {
    icon: "✦",
    title: "Direct from the Artisan",
    body: "Every seller on BharatBazaar is a verified artisan, weaver or small business — not a reseller. Your purchase goes directly to the maker.",
  },
  {
    icon: "✦",
    title: "Celebrating Indian Heritage",
    body: "We highlight GI-tagged crafts, regional weaving traditions and endangered art forms — helping keep India's cultural legacy alive.",
  },
  {
    icon: "✦",
    title: "Authenticity Verified",
    body: "Products are reviewed by our team. QR codes on select items let you verify the artisan, origin and craft authenticity instantly.",
  },
  {
    icon: "✦",
    title: "Curated & Quality Assured",
    body: "We review every new seller and product listing before it goes live — no mass-produced goods, no counterfeits.",
  },
  {
    icon: "✦",
    title: "Transparent Reviews",
    body: "Only verified buyers can leave reviews. Our AI-powered sentiment analysis helps sellers improve and customers choose wisely.",
  },
  {
    icon: "✦",
    title: "Fair Trade Principles",
    body: "We charge low commission rates to ensure artisans keep more of their earnings, with timely, transparent payouts.",
  },
];

export default function WhySection() {
  return (
    <section style={{ background: "var(--brown-dark)" }} className="py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">

        <div className="text-center max-w-xl mx-auto mb-14">
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10.5px",
              fontWeight: "600",
              letterSpacing: "0.2em",
              color: "var(--gold)",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Our Promise
          </p>
          <h2
            style={{ fontFamily: "var(--font-serif)", color: "var(--cream)", fontSize: "clamp(1.7rem, 3vw, 2.4rem)", fontWeight: "700" }}
          >
            Why BharatBazaar?
          </h2>
          <span
            className="block mx-auto"
            style={{ width: "40px", height: "2px", background: "var(--gold)", margin: "12px auto 20px" }}
          />
          <p style={{ fontFamily: "var(--font-sans)", color: "rgba(248,245,240,0.6)", fontSize: "0.95rem", lineHeight: "1.65" }}>
            We built BharatBazaar on a simple belief: India's artisans deserve a world-class marketplace as much as any global brand.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reasons.map((r, i) => (
            <div
              key={i}
              className="p-6 sm:p-7 transition-all duration-200 hover:-translate-y-1"
              style={{ border: "1px solid rgba(248,245,240,0.1)", background: "rgba(248,245,240,0.04)" }}
            >
              <span style={{ color: "var(--gold)", fontSize: "18px", display: "block", marginBottom: "14px" }} aria-hidden="true">✦</span>
              <h3
                style={{ fontFamily: "var(--font-serif)", color: "var(--cream)", fontSize: "18px", fontWeight: "600", marginBottom: "10px" }}
              >
                {r.title}
              </h3>
              <p style={{ fontFamily: "var(--font-sans)", color: "rgba(248,245,240,0.58)", fontSize: "13.5px", lineHeight: "1.7" }}>
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
