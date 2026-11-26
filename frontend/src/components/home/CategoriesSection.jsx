import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { productService } from "../../services/productService";
import { CRAFT_FALLBACK_IMAGE, handleImageError } from "../../utils/imageFallback";

const FALLBACK_IMAGE = CRAFT_FALLBACK_IMAGE;

const CATEGORY_IMAGE_MAP = {
  "handcrafted-metalware": "/categories/handcrafted-metalware.jpg",
  "handloom-textiles": "/categories/handloom-textiles.jpg",
  "home-decor": "/categories/home-decor.jpg",
  "jewellery-accessories": "/categories/jewellery-accessories.jpg",
  "paintings-art": "/categories/paintings-art.jpg",
  "pottery-ceramics": "/categories/pottery-ceramics.jpg",
};

export default function CategoriesSection() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    productService
      .getCategories()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        setCategories(list.filter((c) => c.is_active !== false));
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load craft categories right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="categories" style={{ background: "var(--cream)" }} className="py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">

        {/* Header */}
        <div className="mb-10 sm:mb-12">
          <p className="section-eyebrow">Browse</p>
          <h2 className="section-title">Shop by Category</h2>
          <span className="divider-gold" />
          <p className="section-subtitle">
            From handloom sarees to hand-thrown pottery — explore every craft tradition India has to offer.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4" aria-busy="true">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse"
                style={{ aspectRatio: "3/4", background: "var(--cream-mid)" }}
              />
            ))}
          </div>
        )}

        {/* Error / Empty State */}
        {!loading && (error || categories.length === 0) && (
          <div
            className="border p-8 text-center"
            style={{ background: "var(--cream-mid)", borderColor: "#E8DED2" }}
          >
            <p
              style={{
                fontFamily: "var(--font-sans)",
                color: "var(--text-secondary)",
                fontSize: "14px",
                marginBottom: "14px",
              }}
            >
              {error || "No active craft categories are currently available."}
            </p>
            <Link
              to="/shop"
              className="inline-block px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-90"
              style={{ background: "var(--burgundy)", color: "#fff", fontFamily: "var(--font-sans)" }}
            >
              Browse All Products
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && categories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {categories.map((cat) => {
              const count = typeof cat.product_count === "number" ? cat.product_count : 0;
              const imageSrc = cat.image_url || CATEGORY_IMAGE_MAP[cat.slug] || FALLBACK_IMAGE;
              return (
                <Link
                  key={cat.id}
                  to={`/shop?category=${encodeURIComponent(cat.slug)}`}
                  className="card-lift group relative block overflow-hidden border border-[#EAE2D8]"
                  style={{
                    aspectRatio: "3/4",
                    background: "var(--surface-elevated)",
                  }}
                  aria-label={`Browse ${cat.name}`}
                >
                  {/* Image */}
                  <img
                    src={imageSrc}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => handleImageError(e, FALLBACK_IMAGE)}
                  />
                  {/* Overlay */}
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(28,10,8,0.82) 38%, transparent 70%)" }}
                  />
                  {/* Text */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <p
                      style={{
                        fontFamily: "var(--font-serif)",
                        color: "#F8F5F0",
                        fontSize: "13px",
                        fontWeight: "600",
                        lineHeight: 1.3,
                        marginBottom: "3px",
                      }}
                    >
                      {cat.name}
                    </p>
                    <p
                      style={{
                        color: "rgba(248,245,240,0.65)",
                        fontSize: "10px",
                        fontFamily: "var(--font-sans)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {count} {count === 1 ? "Product" : "Products"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
