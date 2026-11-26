import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import AnnouncementBar from '../../components/layout/AnnouncementBar';
import Footer from '../../components/layout/Footer';
import ProductCard from '../../components/common/ProductCard';
import { productService } from '../../services/productService';
import { featuredProducts as demoProducts } from '../../data/products';
import { useCart } from '../../context/useCart';
import { useAuth } from '../../context/useAuth';
import { CRAFT_FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [cartToast, setCartToast] = useState(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Fetch product detail on slug change
  useEffect(() => {
    let isMounted = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    Promise.resolve()
      .then(() => {
        if (!isMounted) return null;
        setLoading(true);
        setError(null);
        setQuantity(1);
        setActiveImageIndex(0);
        return productService.getProductBySlug(slug);
      })
      .then((data) => {
        if (isMounted && data !== null) {
          setProduct(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          // If viewing a demonstration showcase item (demo-*), locate its showcase record cleanly
          if (slug && slug.startsWith('demo-')) {
            const demoMatch = demoProducts.find((p) => p.slug === slug);
            if (demoMatch) {
              setProduct({
                ...demoMatch,
                seller: { store_name: demoMatch.artisan, city: demoMatch.origin_city, state: demoMatch.origin_state },
                images: [{ id: 'demo-main', image_url: demoMatch.primary_image, alt_text: demoMatch.name }],
                related_products: demoProducts.filter((p) => p.slug !== slug).slice(0, 4),
              });
              setLoading(false);
              return;
            }
          }
          console.warn('Error fetching product:', err);
          setError(err.message || 'Product not found or currently unavailable.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Gallery images collection
  const galleryImages = [];
  if (product) {
    if (product.primary_image) {
      galleryImages.push({
        id: 'primary',
        image_url: product.primary_image,
        alt_text: product.name,
      });
    }
    if (Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (img.image_url && img.image_url !== product.primary_image) {
          galleryImages.push(img);
        }
      });
    }
    // Fallback image if none specified
    if (galleryImages.length === 0) {
      galleryImages.push({
        id: 'placeholder',
        image_url: CRAFT_FALLBACK_IMAGE,
        alt_text: product.name,
      });
    }
  }

  const currentImage = galleryImages[activeImageIndex] || galleryImages[0];

  // Quantity handlers bounded by available_stock
  const handleQuantityDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleQuantityIncrease = () => {
    if (product && product.available_stock) {
      setQuantity((prev) => Math.min(product.available_stock, prev + 1));
    }
  };

  // Add to cart action (Live backend integration)
  const handleAddToCart = async () => {
    if (!product || product.available_stock <= 0) return;
    if (product.isDemo) {
      setCartToast({
        type: 'error',
        title: 'Showcase Preview Item',
        message: 'This is a demonstration showcase item. Live checkout is enabled for approved seller products.',
      });
      setTimeout(() => setCartToast(null), 5000);
      return;
    }
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    try {
      await addToCart(product.id, quantity);
      setCartToast({
        type: 'success',
        title: 'Added to Bag',
        message: `${quantity} × "${product.name}" added to your shopping bag.`,
      });
      setTimeout(() => setCartToast(null), 5000);
    } catch (err) {
      setCartToast({
        type: 'error',
        title: 'Notice',
        message: err.message || 'Could not add product to cart. Please try again.',
      });
      setTimeout(() => setCartToast(null), 5000);
    }
  };

  // Pricing calculations
  const sellingPrice = product?.discount_price ? Number(product.discount_price) : Number(product?.price || 0);
  const originalPrice = product?.discount_price ? Number(product.price) : null;
  const discountPercent = product?.discount_percentage;
  const isOutOfStock = product && product.available_stock <= 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF8F5' }}>
      <AnnouncementBar />
      <Navbar />

      {/* ─── Cart Notice Toast ────────────────────────────────────── */}
      {cartToast && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-md px-5 py-4 rounded-sm shadow-xl flex items-start gap-3 transition-all"
          style={{
            background: 'var(--brown-dark)',
            color: '#FAF8F5',
            border: `1px solid ${cartToast.type === 'error' ? '#E11D48' : 'var(--gold)'}`,
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
          }}
        >
          <span
            className="text-base font-bold mt-0.5"
            style={{ color: cartToast.type === 'error' ? '#FDA4AF' : 'var(--gold)' }}
          >
            {cartToast.type === 'error' ? '⚠' : '✓'}
          </span>
          <div className="flex-1">
            <p
              className="font-semibold text-xs tracking-wider uppercase"
              style={{ color: cartToast.type === 'error' ? '#FDA4AF' : 'var(--gold)' }}
            >
              {cartToast.title}
            </p>
            <p className="text-xs text-[#EAE2D8] mt-0.5">{cartToast.message}</p>
            {cartToast.type === 'success' && (
              <Link
                to="/cart"
                className="inline-block mt-2 text-xs font-bold text-[var(--gold)] underline hover:opacity-80"
              >
                View Shopping Bag →
              </Link>
            )}
          </div>
          <button
            onClick={() => setCartToast(null)}
            className="text-[#EAE2D8] hover:text-white text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Loading Skeleton State ───────────────────────────────── */}
      {loading ? (
        <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 lg:px-14 py-12 flex-1">
          <div className="h-4 bg-[#EBE4DA] rounded w-64 mb-8 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <div className="w-full bg-[#EBE4DA] rounded-sm mb-4 animate-pulse" style={{ aspectRatio: '4/3' }} />
              <div className="flex gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="w-20 h-20 bg-[#EBE4DA] rounded-sm animate-pulse" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 space-y-4">
              <div className="h-4 bg-[#EBE4DA] rounded w-32 animate-pulse" />
              <div className="h-8 bg-[#EBE4DA] rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-[#EBE4DA] rounded w-48 animate-pulse" />
              <div className="h-8 bg-[#EBE4DA] rounded w-40 mt-6 animate-pulse" />
              <div className="h-24 bg-[#EBE4DA] rounded w-full mt-6 animate-pulse" />
              <div className="h-12 bg-[#EBE4DA] rounded w-full mt-6 animate-pulse" />
            </div>
          </div>
        </div>
      ) : error || !product ? (
        /* ─── Error / 404 Not Found State ────────────────────────── */
        <div className="max-w-3xl mx-auto w-full px-5 py-24 text-center flex-1">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-[#F3ECE4] text-[var(--burgundy)]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              color: 'var(--brown-dark)',
              fontSize: '28px',
              fontWeight: '600',
              marginBottom: '10px',
            }}
          >
            Artisanal Craft Not Found
          </h1>
          <p
            className="text-sm max-w-md mx-auto mb-8"
            style={{ color: 'var(--brown-mid)', fontFamily: 'var(--font-sans)' }}
          >
            {error || "The product you are seeking may have been retired or is currently awaiting artisan restock."}
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/shop')}
              className="btn-primary text-xs py-2.5 px-6"
            >
              Back to Shop Catalogue
            </button>
            <Link
              to="/"
              className="text-xs font-semibold underline text-[var(--brown-dark)] hover:text-[var(--burgundy)]"
            >
              Return Home
            </Link>
          </div>
        </div>
      ) : (
        /* ─── Main Product Detail View ────────────────────────────── */
        <main className="flex-1 px-5 sm:px-8 lg:px-14 py-8">
          <div className="max-w-7xl mx-auto">
            {/* ── Breadcrumb ── */}
            <nav
              className="flex items-center gap-2 text-xs mb-8 overflow-x-auto whitespace-nowrap pb-1"
              style={{ color: 'var(--brown-light)', fontFamily: 'var(--font-sans)' }}
            >
              <Link to="/" className="hover:text-[var(--burgundy)] transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link to="/shop" className="hover:text-[var(--burgundy)] transition-colors">
                Shop
              </Link>
              <span>/</span>
              {product.category && (
                <>
                  <Link
                    to={`/shop?category=${product.category.slug}`}
                    className="hover:text-[var(--burgundy)] transition-colors"
                  >
                    {product.category.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span style={{ color: 'var(--brown-dark)', fontWeight: '600' }} className="truncate max-w-xs">
                {product.name}
              </span>
            </nav>

            {/* ── Top Section: Gallery + Product Info ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              {/* ── B. Product Image Gallery (7 Cols on desktop) ── */}
              <div className="lg:col-span-7 flex flex-col">
                {/* Main Hero Image */}
                <div
                  className="relative overflow-hidden rounded-sm bg-white border border-[#EBE4DA] group cursor-zoom-in"
                  style={{ aspectRatio: '4/3' }}
                  onClick={() => setIsZoomOpen(true)}
                  title="Click to view high-resolution image"
                >
                  <img
                    src={currentImage?.image_url}
                    alt={currentImage?.alt_text || product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => handleImageError(e)}
                  />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                    {product.is_featured && (
                      <span
                        style={{
                          background: 'var(--burgundy)',
                          color: '#fff',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '10px',
                          fontWeight: '700',
                          letterSpacing: '0.1em',
                          padding: '4px 10px',
                        }}
                        className="uppercase rounded-xs"
                      >
                        Featured Craft
                      </span>
                    )}
                    {discountPercent && (
                      <span
                        style={{
                          background: 'var(--brown-dark)',
                          color: '#fff',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '4px 8px',
                        }}
                        className="uppercase rounded-xs"
                      >
                        −{discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  {/* Zoom indicator button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsZoomOpen(true);
                    }}
                    aria-label="Enlarge image"
                    className="absolute bottom-3 right-3 p-2 bg-white/90 rounded border border-[#EBE4DA] text-[var(--brown-dark)] hover:bg-white transition-opacity opacity-80 group-hover:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>

                  {/* Previous / Next Controls if multiple images */}
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) =>
                            prev === 0 ? galleryImages.length - 1 : prev - 1
                          );
                        }}
                        aria-label="Previous photograph"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/85 hover:bg-white text-[var(--brown-dark)] rounded-full flex items-center justify-center shadow-md transition-opacity"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) =>
                            prev === galleryImages.length - 1 ? 0 : prev + 1
                          );
                        }}
                        aria-label="Next photograph"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/85 hover:bg-white text-[var(--brown-dark)] rounded-full flex items-center justify-center shadow-md transition-opacity"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails row */}
                {galleryImages.length > 1 && (
                  <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-2">
                    {galleryImages.map((img, idx) => {
                      const isSelected = idx === activeImageIndex;
                      return (
                        <button
                          key={img.id || idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-sm border-2 transition-all cursor-pointer bg-white"
                          style={{
                            borderColor: isSelected ? 'var(--burgundy)' : '#EBE4DA',
                            opacity: isSelected ? 1 : 0.7,
                          }}
                        >
                          <img
                            src={img.image_url}
                            alt={img.alt_text || `Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── C & D. Product Information & Purchase Controls (5 Cols) ── */}
              <div className="lg:col-span-5 flex flex-col">
                {/* Craft Origin Eyebrow */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px',
                      fontWeight: '700',
                      letterSpacing: '0.14em',
                      color: 'var(--burgundy)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {product.craft_type || 'Indian Handcrafted'}
                  </p>

                  {product.sku && (
                    <span className="text-[10px] text-[var(--brown-light)] font-mono">
                      SKU: {product.sku}
                    </span>
                  )}
                </div>

                {/* Product Title */}
                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--brown-dark)',
                    fontSize: 'clamp(24px, 3vw, 32px)',
                    fontWeight: '600',
                    lineHeight: '1.25',
                    marginBottom: '8px',
                  }}
                >
                  {product.name}
                </h1>

                {/* Artisan & Location Line */}
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--brown-mid)',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  by{' '}
                  <span className="font-semibold text-[var(--brown-dark)]">
                    {product.seller?.store_name || 'Verified Artisan Workshop'}
                  </span>
                  {' '}·{' '}
                  <span>
                    {product.origin_city ? `${product.origin_city}, ` : ''}{product.origin_state || 'India'}
                  </span>
                </p>

                {/* Pricing Box */}
                <div
                  className="p-4 rounded-sm mb-6 flex items-baseline gap-3 border border-[#EBE4DA] bg-white"
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      color: 'var(--brown-dark)',
                      fontSize: '28px',
                      fontWeight: '700',
                    }}
                  >
                    ₹{sellingPrice.toLocaleString('en-IN')}
                  </span>

                  {originalPrice && (
                    <span
                      style={{
                        color: 'var(--brown-light)',
                        fontSize: '16px',
                        textDecoration: 'line-through',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      ₹{originalPrice.toLocaleString('en-IN')}
                    </span>
                  )}

                  {discountPercent && (
                    <span
                      style={{
                        color: 'var(--burgundy)',
                        fontSize: '12px',
                        fontWeight: '700',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Save ₹{(originalPrice - sellingPrice).toLocaleString('en-IN')} ({discountPercent}%)
                    </span>
                  )}
                </div>

                {/* Stock Status Indicator */}
                <div className="flex items-center gap-2 mb-6 text-xs" style={{ fontFamily: 'var(--font-sans)' }}>
                  {isOutOfStock ? (
                    <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                      Currently Out of Stock
                    </span>
                  ) : product.available_stock <= 5 ? (
                    <span className="flex items-center gap-1.5 text-amber-800 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                      Only {product.available_stock} pieces left — order soon
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                      In Stock ({product.available_stock} units available)
                    </span>
                  )}
                </div>

                {/* Short Description */}
                {product.short_description && (
                  <p
                    className="text-xs leading-relaxed mb-6"
                    style={{ color: 'var(--brown-mid)', fontFamily: 'var(--font-sans)' }}
                  >
                    {product.short_description}
                  </p>
                )}

                {/* ── Purchase Controls ── */}
                <div className="space-y-4 pt-4 border-t border-[#EBE4DA] mb-8">
                  {/* Quantity Selector */}
                  <div className="flex items-center gap-4">
                    <span
                      className="text-xs font-semibold uppercase tracking-wider text-[var(--brown-dark)]"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Quantity:
                    </span>
                    <div
                      className="flex items-center border border-[#D6CCC2] rounded-sm bg-white"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      <button
                        type="button"
                        onClick={handleQuantityDecrease}
                        disabled={quantity <= 1 || isOutOfStock}
                        aria-label="Decrease quantity"
                        className="w-9 h-9 flex items-center justify-center text-sm font-semibold hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-xs font-bold text-[var(--brown-dark)]">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={handleQuantityIncrease}
                        disabled={quantity >= product.available_stock || isOutOfStock}
                        aria-label="Increase quantity"
                        className="w-9 h-9 flex items-center justify-center text-sm font-semibold hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    {product.available_stock > 0 && (
                      <span className="text-[11px] text-[var(--brown-light)]">
                        Max: {product.available_stock}
                      </span>
                    )}
                  </div>

                  {/* Buttons Row */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isOutOfStock}
                      style={{
                        background: isOutOfStock ? '#A89F91' : 'var(--burgundy)',
                        color: '#FFFFFF',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '12px',
                        fontWeight: '700',
                        letterSpacing: '0.12em',
                      }}
                      className="flex-1 py-3.5 px-6 rounded-sm uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsWishlisted((prev) => !prev)}
                      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                      className="p-3.5 border border-[#D6CCC2] rounded-sm bg-white hover:border-[var(--burgundy)] transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill={isWishlisted ? 'var(--burgundy)' : 'none'}
                        stroke={isWishlisted ? 'var(--burgundy)' : 'var(--brown-mid)'}
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Direct Guarantee Box */}
                <div
                  className="p-4 rounded-sm border border-[#EBE4DA] bg-[#FFFBF7] text-xs space-y-2.5"
                  style={{ fontFamily: 'var(--font-sans)', color: 'var(--brown-mid)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--gold)] font-bold text-sm">✦</span>
                    <span>Direct Artisan Craft: Handcrafted in {product.origin_state || 'India'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--gold)] font-bold text-sm">✦</span>
                    <span>Safe packaging tailored for delicate handmade articles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--gold)] font-bold text-sm">✦</span>
                    <span>Fair pricing: 100% of seller proceeds support the maker</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── E. Product Information Tabs ───────────────────────────── */}
            <section className="mt-16 pt-8 border-t border-[#EBE4DA]">
              {/* Tab Navigation */}
              <div className="flex items-center gap-4 border-b border-[#EBE4DA] overflow-x-auto pb-1">
                {[
                  { id: 'description', label: 'Craft Story & Description' },
                  { id: 'specifications', label: 'Specifications & Materials' },
                  { id: 'shipping', label: 'Shipping & Delivery' },
                  { id: 'returns', label: 'Returns & Authenticity' },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '13px',
                        fontWeight: isActive ? '700' : '500',
                        color: isActive ? 'var(--burgundy)' : 'var(--brown-mid)',
                        borderBottom: isActive ? '2px solid var(--burgundy)' : '2px solid transparent',
                      }}
                      className="pb-3 px-2 whitespace-nowrap transition-colors cursor-pointer"
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Panels */}
              <div className="py-6 max-w-4xl" style={{ fontFamily: 'var(--font-sans)' }}>
                {activeTab === 'description' && (
                  <div className="text-sm leading-relaxed text-[var(--brown-dark)] space-y-4 whitespace-pre-line">
                    <p>{product.description || 'No detailed story provided yet for this handmade piece.'}</p>
                  </div>
                )}

                {activeTab === 'specifications' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-white rounded border border-[#EBE4DA]">
                      <span className="text-[var(--brown-light)] block mb-1 uppercase tracking-wider text-[10px]">
                        Craft Tradition
                      </span>
                      <span className="font-semibold text-[var(--brown-dark)] text-sm">
                        {product.craft_type || 'Artisanal'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-white rounded border border-[#EBE4DA]">
                      <span className="text-[var(--brown-light)] block mb-1 uppercase tracking-wider text-[10px]">
                        Artisan Location
                      </span>
                      <span className="font-semibold text-[var(--brown-dark)] text-sm">
                        {product.origin_city ? `${product.origin_city}, ` : ''}{product.origin_state || 'India'}
                      </span>
                    </div>

                    {product.materials && (
                      <div className="p-3.5 bg-white rounded border border-[#EBE4DA]">
                        <span className="text-[var(--brown-light)] block mb-1 uppercase tracking-wider text-[10px]">
                          Materials
                        </span>
                        <span className="font-semibold text-[var(--brown-dark)] text-sm">
                          {product.materials}
                        </span>
                      </div>
                    )}

                    {product.dimensions && (
                      <div className="p-3.5 bg-white rounded border border-[#EBE4DA]">
                        <span className="text-[var(--brown-light)] block mb-1 uppercase tracking-wider text-[10px]">
                          Dimensions / Size
                        </span>
                        <span className="font-semibold text-[var(--brown-dark)] text-sm">
                          {product.dimensions}
                        </span>
                      </div>
                    )}

                    {product.care_instructions && (
                      <div className="sm:col-span-2 p-3.5 bg-white rounded border border-[#EBE4DA]">
                        <span className="text-[var(--brown-light)] block mb-1 uppercase tracking-wider text-[10px]">
                          Care Recommendations
                        </span>
                        <span className="text-[var(--brown-mid)] text-xs leading-relaxed">
                          {product.care_instructions}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="text-xs space-y-3 text-[var(--brown-mid)] leading-relaxed">
                    <p>
                      <strong>Origin Workshop Dispatch:</strong> This item is dispatched directly from{' '}
                      <span className="text-[var(--brown-dark)] font-semibold">
                        {product.seller?.store_name}
                      </span>{' '}
                      in {product.origin_city || product.origin_state || 'India'}.
                    </p>
                    <p>
                      {product.shipping_info ||
                        'Standard artisan processing takes 2 to 4 business days, followed by nationwide delivery within 4 to 7 working days via registered surface and air cargo.'}
                    </p>
                    <p className="text-[var(--brown-light)]">
                      Free shipping applies to eligible orders above ₹999 across India.
                    </p>
                  </div>
                )}

                {activeTab === 'returns' && (
                  <div className="text-xs space-y-3 text-[var(--brown-mid)] leading-relaxed">
                    <p>
                      {product.returns_info ||
                        'Because each article is handmade by traditional craftspeople, natural variations in weave, dye, and glaze are celebrated hallmarks of Indian artisanal work. Exchanges are honored for items damaged during transit.'}
                    </p>
                    <p className="text-[var(--brown-light)]">
                      Please retain the original packaging and contact customer support within 7 days of delivery.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ── F. Artisan / Seller Section ───────────────────────────── */}
            {product.seller && (
              <section
                className="mt-14 p-6 sm:p-8 rounded-sm border border-[#EBE4DA] bg-white"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="max-w-2xl">
                    <p
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '0.14em',
                        color: 'var(--burgundy)',
                        textTransform: 'uppercase',
                        marginBottom: '6px',
                      }}
                    >
                      Meet the Artisan Workshop
                    </p>
                    <h3
                      style={{
                        fontFamily: 'var(--font-serif)',
                        color: 'var(--brown-dark)',
                        fontSize: '22px',
                        fontWeight: '600',
                        marginBottom: '6px',
                      }}
                    >
                      {product.seller.store_name}
                    </h3>
                    <p className="text-xs text-[var(--brown-light)] mb-3">
                      📍 {product.seller.city ? `${product.seller.city}, ` : ''}{product.seller.state || 'India'}
                      {product.seller.craft_category && ` · Specializing in ${product.seller.craft_category}`}
                    </p>
                    <p className="text-xs text-[var(--brown-mid)] leading-relaxed">
                      {product.seller.business_description ||
                        `An authentic regional workshop dedicated to preserving the ${product.craft_type || 'traditional craft'} heritage through ethical production and master artisan craftsmanship.`}
                    </p>
                  </div>

                  <Link
                    to={`/shop?state=${encodeURIComponent(product.seller.state || product.origin_state || '')}`}
                    className="btn-primary text-xs py-2.5 px-5 whitespace-nowrap self-start md:self-center"
                  >
                    View Region's Crafts →
                  </Link>
                </div>
              </section>
            )}

            {/* ── G. Authenticity Section ───────────────────────────────── */}
            <section
              className="mt-14 p-6 sm:p-8 rounded-sm border border-[#E2D5C3] bg-[#F7F2EB]"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              <div className="max-w-3xl">
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: '700',
                    letterSpacing: '0.16em',
                    color: 'var(--burgundy)',
                    textTransform: 'uppercase',
                  }}
                >
                  Authenticity Pledge
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--brown-dark)',
                    fontSize: '24px',
                    fontWeight: '600',
                    marginTop: '4px',
                    marginBottom: '10px',
                  }}
                >
                  Know the Story Behind Your Craft
                </h3>
                <p className="text-xs text-[var(--brown-mid)] leading-relaxed mb-4">
                  Every product listed on BharatBazaar represents genuine Indian craftsmanship. We work directly with verified artisan cooperatives, self-help groups, and local MSMEs to protect India's generational heritage.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                  <div className="p-3.5 bg-white/80 rounded border border-[#E2D5C3]">
                    <span className="block text-xs font-bold text-[var(--brown-dark)] mb-1">
                      Craft Origin
                    </span>
                    <span className="text-xs text-[var(--brown-mid)]">
                      {product.origin_city ? `${product.origin_city}, ` : ''}{product.origin_state || 'India'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-white/80 rounded border border-[#E2D5C3]">
                    <span className="block text-xs font-bold text-[var(--brown-dark)] mb-1">
                      Authenticity Status
                    </span>
                    <span className="text-xs text-[var(--burgundy)] font-medium">
                      Verification feature coming soon
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── H. Customer Reviews ───────────────────────────────────── */}
            <section className="mt-14 pt-8 border-t border-[#EBE4DA]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      color: 'var(--brown-dark)',
                      fontSize: '22px',
                      fontWeight: '600',
                    }}
                  >
                    Customer Reviews
                  </h3>
                  <p className="text-xs text-[var(--brown-light)] mt-1" style={{ fontFamily: 'var(--font-sans)' }}>
                    Verified feedback from Indian craft patrons
                  </p>
                </div>
              </div>

              {Array.isArray(product.reviews) && product.reviews.length > 0 ? (
                <div className="space-y-4">
                  {product.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 rounded-sm border border-[#EBE4DA] bg-white space-y-3"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center text-[var(--gold)] text-sm">
                            {'★'.repeat(rev.rating)}
                            <span className="text-[#E2D8CC]">{'★'.repeat(Math.max(0, 5 - rev.rating))}</span>
                          </div>
                          <span className="text-xs font-semibold text-[var(--brown-dark)]">
                            {rev.customer_name || 'Artisan Patron'}
                          </span>
                          {rev.is_verified_purchase && (
                            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-sm">
                              ✓ Verified Purchase
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--brown-light)]">
                          {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-IN') : ''}
                        </span>
                      </div>

                      {rev.title && (
                        <h4 className="font-serif text-sm font-semibold text-[var(--brown-dark)]">
                          {rev.title}
                        </h4>
                      )}
                      <p className="text-xs text-[var(--brown-mid)] leading-relaxed whitespace-pre-line">
                        {rev.comment}
                      </p>

                      {rev.seller_reply && (
                        <div className="mt-3 p-3.5 rounded-sm bg-[#FAF7F2] border-l-2 border-[#C0522B]">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C0522B]">
                              Response from {product.seller?.store_name || 'Artisan Studio'}
                            </span>
                            {rev.seller_replied_at && (
                              <span className="text-[10px] text-[var(--brown-light)]">
                                {new Date(rev.seller_replied_at).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--brown-dark)] leading-relaxed">
                            {rev.seller_reply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="p-8 text-center rounded-sm border border-[#EBE4DA] bg-white"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-[#FAF4ED] text-[var(--gold)]">
                    ★
                  </div>
                  <h4 className="font-serif text-base font-semibold text-[var(--brown-dark)] mb-1">
                    No Customer Reviews Yet
                  </h4>
                  <p className="text-xs text-[var(--brown-mid)] max-w-md mx-auto">
                    Be the first verified customer to share feedback for this authentic piece once you receive your order.
                  </p>
                </div>
              )}
            </section>

            {/* ── I. Related Products ───────────────────────────────────── */}
            {Array.isArray(product.related_products) && product.related_products.length > 0 && (
              <section className="mt-16 pt-8 border-t border-[#EBE4DA]">
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '0.14em',
                        color: 'var(--burgundy)',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      Curated Discovery
                    </p>
                    <h3
                      style={{
                        fontFamily: 'var(--font-serif)',
                        color: 'var(--brown-dark)',
                        fontSize: '24px',
                        fontWeight: '600',
                      }}
                    >
                      More from this Craft Tradition
                    </h3>
                  </div>

                  {product.category && (
                    <Link
                      to={`/shop?category=${product.category.slug}`}
                      className="text-xs font-bold text-[var(--burgundy)] uppercase tracking-wider hover:underline"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      View All →
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {product.related_products.map((relProduct) => (
                    <ProductCard
                      key={relProduct.id || relProduct.slug}
                      product={relProduct}
                      isWishlisted={false}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      )}

      {/* ─── High-Resolution Zoom Lightbox Modal ──────────────────── */}
      {isZoomOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white p-2 rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsZoomOpen(false)}
              aria-label="Close zoom"
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
            >
              ✕
            </button>
            <img
              src={currentImage.image_url}
              alt={currentImage.alt_text || product?.name}
              className="max-h-[85vh] w-auto mx-auto object-contain"
            />
            <div className="text-center py-2 text-xs text-[var(--brown-mid)] font-serif">
              {product?.name} · {product?.craft_type}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
