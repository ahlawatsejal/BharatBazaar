import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { productService } from "../../services/productService";
import { customerService } from "../../services/customerService";
import { useAuth } from "../../context/useAuth";
import ProductCard from "../common/ProductCard";

export default function FeaturedProducts() {
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(new Set());

  useEffect(() => {
    let active = true;
    productService
      .getFeaturedProducts()
      .then(async (data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        if (list.length > 0) {
          setProducts(list.slice(0, 8));
        } else {
          const fallbackData = await productService.getProducts({ ordering: "price" });
          if (!active) return;
          const fallbackList = Array.isArray(fallbackData) ? fallbackData : fallbackData?.results || [];
          setProducts(fallbackList.slice(0, 8));
        }
      })
      .catch(() => {
        if (active) setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "CUSTOMER") return;
    let active = true;
    customerService
      .getWishlistIds()
      .then((ids) => {
        if (active && Array.isArray(ids)) setWishlist(new Set(ids));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.role]);

  const toggleWishlist = async (id) => {
    if (!isAuthenticated || user?.role !== "CUSTOMER") return;
    const exists = wishlist.has(id);
    try {
      if (exists) {
        await customerService.removeFromWishlist(id);
        setWishlist((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        await customerService.addToWishlist(id);
        setWishlist((prev) => new Set(prev).add(id));
      }
    } catch {
      // Ignore wishlist error
    }
  };

  return (
    <section id="products" style={{ background: "var(--cream-warm)" }} className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10 sm:mb-12">
          <div>
            <p className="section-eyebrow">Handpicked Treasures</p>
            <h2 className="section-title">Best Sellers &amp; Featured</h2>
            <span className="divider-gold" />
          </div>
          <Link
            to="/shop"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.14em",
              color: "var(--burgundy)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
            className="hover:opacity-70 transition-opacity flex items-center gap-1"
          >
            View all products →
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-80 animate-pulse bg-[#E8DED2]" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="border border-[#E8DED2] bg-white p-8 text-center">
            <p className="text-sm text-[#7A5C4A] mb-3">
              Featured artisan products will appear here as workshops publish their collections.
            </p>
            <Link to="/shop" className="btn-primary">
              Browse Marketplace
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={wishlist.has(product.id)}
                onWishlistToggle={toggleWishlist}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
