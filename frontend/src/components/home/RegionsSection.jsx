import { regions } from "../../data/regions";
import { handleImageError } from "../../utils/imageFallback";

export default function RegionsSection() {
  return (
    <section style={{ background: "var(--cream-warm)" }} className="py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">

        <div className="mb-10 sm:mb-12">
          <p className="section-eyebrow">Craft Map of India</p>
          <h2 className="section-title">Explore India's Regions</h2>
          <span className="divider-gold" />
          <p className="section-subtitle">
            India's craft traditions are as diverse as its geography. Each region has a story woven into every product.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {regions.map((region) => (
            <a
              key={region.id}
              href={`/shop?state=${encodeURIComponent(region.state)}`}
              className="card-lift group relative block overflow-hidden"
              style={{ minHeight: "260px" }}
              aria-label={`Explore ${region.craft} from ${region.state}`}
            >
              <img
                src={region.image}
                alt={`${region.craft} from ${region.state}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={(e) => handleImageError(e)}
              />
              {/* Overlay */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(20,8,5,0.90) 48%, rgba(0,0,0,0.25) 100%)" }}
              />
              {/* State pill */}
              <div
                className="absolute top-3 left-3 px-2.5 py-1 text-white text-[10px] font-bold tracking-widest uppercase"
                style={{ background: region.color, fontFamily: "var(--font-sans)", opacity: 0.92 }}
              >
                {region.state}
              </div>
              {/* Text */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p
                  style={{ fontFamily: "var(--font-serif)", color: "#F8F5F0", fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}
                >
                  {region.craft}
                </p>
                <p style={{ color: "rgba(248,245,240,0.65)", fontSize: "11px", fontFamily: "var(--font-sans)" }}>
                  {region.tagline}
                </p>
                <p
                  style={{ color: "var(--gold-light)", fontSize: "10px", fontFamily: "var(--font-sans)", letterSpacing: "0.1em", fontWeight: "600", marginTop: "8px" }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  Explore →
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
