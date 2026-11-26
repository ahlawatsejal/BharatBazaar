import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sellerService } from "../../services/sellerService";
import { handleImageError } from "../../utils/imageFallback";

export default function ArtisansSection() {
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    sellerService
      .getPublicArtisans()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        setArtisans(list.slice(0, 6));
      })
      .catch(() => {
        if (active) setArtisans([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="artisans" style={{ background: "var(--cream-warm)" }} className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
        <div className="text-center max-w-xl mx-auto mb-12 sm:mb-14">
          <p className="section-eyebrow" style={{ textAlign: "center" }}>
            The People Behind the Product
          </p>
          <h2 className="section-title" style={{ textAlign: "center" }}>
            Featured Artisans
          </h2>
          <span className="divider-gold mx-auto" style={{ margin: "10px auto 20px" }} />
          <p className="section-subtitle" style={{ margin: "0 auto", textAlign: "center" }}>
            Every product on BharatBazaar is crafted by verified Indian workshops and artisan studios.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-80 animate-pulse bg-[#E8DED2]" />
            ))}
          </div>
        )}

        {!loading && artisans.length === 0 && (
          <div className="border border-[#E8DED2] bg-white p-8 text-center">
            <p className="text-sm text-[#7A5C4A] mb-4">
              Verified artisan studios are onboarding soon.
            </p>
            <Link to="/artisans" className="btn-primary">
              Explore Artisan Directory
            </Link>
          </div>
        )}

        {!loading && artisans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {artisans.map((artisan) => {
              const storeName = artisan.store_name || artisan.business_name || "Artisan Studio";
              const location = [artisan.city, artisan.state].filter(Boolean).join(", ") || "India";
              const story =
                artisan.business_description ||
                artisan.description ||
                "Verified BharatBazaar artisan workshop preserving traditional Indian craft.";
              const imageSrc = artisan.store_logo || artisan.banner_image || "/hero-clean.jpg";

              return (
                <article
                  key={artisan.id}
                  className="card-lift overflow-hidden bg-white border border-[#E8DED2]"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={imageSrc}
                      alt={storeName}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                      onError={(e) => handleImageError(e)}
                    />
                    {artisan.craft_category && (
                      <div
                        className="absolute top-4 left-4 px-3 py-1 text-white text-[10px] font-bold tracking-widest uppercase"
                        style={{ background: "var(--burgundy)", fontFamily: "var(--font-sans)" }}
                      >
                        {artisan.craft_category}
                      </div>
                    )}
                  </div>

                  <div className="p-5 sm:p-6">
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        color: "var(--brown-dark)",
                        fontSize: "19px",
                        fontWeight: "700",
                      }}
                      className="mb-1.5"
                    >
                      {storeName}
                    </h3>
                    <p
                      style={{
                        color: "var(--brown-light)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "11.5px",
                      }}
                      className="mb-3 flex items-center gap-1.5"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{location}</span>
                    </p>
                    <p
                      style={{
                        color: "var(--brown-mid)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "13.5px",
                        lineHeight: "1.6",
                      }}
                      className="mb-4 line-clamp-3"
                    >
                      {story}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-[#F0EBE3]">
                      <span style={{ color: "var(--brown-light)", fontSize: "11px" }}>
                        {typeof artisan.product_count === "number"
                          ? `${artisan.product_count} products`
                          : "Verified Studio"}
                      </span>
                      <Link
                        to={`/shop?seller=${artisan.id}`}
                        style={{
                          color: "var(--burgundy)",
                          fontFamily: "var(--font-sans)",
                          fontSize: "11px",
                          fontWeight: "700",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                        className="hover:opacity-75 transition-opacity"
                      >
                        Explore Store →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="text-center mt-10">
          <Link to="/artisans" className="btn-primary px-10 py-3.5">
            EXPLORE ALL ARTISANS
          </Link>
        </div>
      </div>
    </section>
  );
}
