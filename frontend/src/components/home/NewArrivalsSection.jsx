import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../../services/productService';
import { customerService } from '../../services/customerService';
import { useAuth } from '../../context/useAuth';
import ProductCard from '../common/ProductCard';

export default function NewArrivalsSection() {
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const scrollRef = useRef(null);

  useEffect(() => {
    let active = true;
    productService
      .getProducts({ ordering: '-created_at' })
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        setProducts(list.slice(0, 10));
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
    if (!isAuthenticated || user?.role !== 'CUSTOMER') return;
    let active = true;
    customerService
      .getWishlistIds()
      .then((ids) => {
        if (active && Array.isArray(ids)) setWishlistIds(new Set(ids));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.role]);

  const handleWishlistToggle = async (productId) => {
    if (!isAuthenticated || user?.role !== 'CUSTOMER') return;
    const exists = wishlistIds.has(productId);
    try {
      if (exists) {
        await customerService.removeFromWishlist(productId);
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await customerService.addToWishlist(productId);
        setWishlistIds((prev) => new Set(prev).add(productId));
      }
    } catch {
      // Ignore wishlist toggle errors
    }
  };

  const scrollByAmount = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction * 340, behavior: 'smooth' });
  };

  return (
    <section id="new-arrivals" style={{ background: 'var(--cream-warm)' }} className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <p className="section-eyebrow">Just In From Workshops</p>
            <h2 className="section-title">New Arrivals &amp; Trending</h2>
            <span className="divider-gold" />
          </div>

          <div className="flex items-center gap-3">
            {products.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollByAmount(-1)}
                  aria-label="Scroll new arrivals left"
                  className="w-9 h-9 border border-[#D4C8B8] bg-white flex items-center justify-center text-[#2F211B] hover:text-[#9D294D] transition-colors cursor-pointer"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => scrollByAmount(1)}
                  aria-label="Scroll new arrivals right"
                  className="w-9 h-9 border border-[#D4C8B8] bg-white flex items-center justify-center text-[#2F211B] hover:text-[#9D294D] transition-colors cursor-pointer"
                >
                  ›
                </button>
              </div>
            )}
            <Link
              to="/shop?ordering=-created_at"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.14em',
                color: 'var(--burgundy)',
                textTransform: 'uppercase',
              }}
              className="hover:opacity-75 transition-opacity whitespace-nowrap"
            >
              Shop New Arrivals →
            </Link>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-80 animate-pulse bg-[#E8DED2]" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="border border-[#E8DED2] bg-white p-8 text-center">
            <p className="text-sm text-[#7A5C4A] mb-3">
              New handcrafted arrivals are being curated from our artisan studios.
            </p>
            <Link to="/shop" className="btn-primary">
              Explore Catalogue
            </Link>
          </div>
        )}

        {/* Horizontal Scroll Shelf */}
        {!loading && products.length > 0 && (
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'thin' }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="min-w-[260px] sm:min-w-[285px] max-w-[300px] flex-shrink-0 snap-start"
              >
                <ProductCard
                  product={{ ...product, badge: product.badge || 'New Arrival' }}
                  isWishlisted={wishlistIds.has(product.id)}
                  onWishlistToggle={handleWishlistToggle}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
