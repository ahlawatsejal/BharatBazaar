import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/useCart';
import { useAuth } from '../../context/useAuth';
import { CRAFT_FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';

const FALLBACK_IMAGE = CRAFT_FALLBACK_IMAGE;

// Reusable Product Card — supports both live API product entities and showcase items
export default function ProductCard({ product, isWishlisted, onWishlistToggle }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [adding, setAdding] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const imageUrl =
    product.primary_image ||
    (Array.isArray(product.images) && product.images[0]?.image_url) ||
    product.image ||
    FALLBACK_IMAGE;

  const craftLabel =
    product.craft_type ||
    product.craft ||
    (typeof product.category === 'object' ? product.category?.name : product.category) ||
    "Handcrafted";

  const artisanName =
    (typeof product.seller === 'object'
      ? product.seller?.store_name || product.seller?.business_name
      : null) ||
    product.artisan ||
    "BharatBazaar Artisan";

  const regionLabel =
    product.origin_state
      ? (product.origin_city ? `${product.origin_city}, ${product.origin_state}` : product.origin_state)
      : (product.region || "India");

  // Determine current selling price and strike-through original price
  let currentPrice = Number(product.price || 0);
  let originalPrice = null;

  if (product.discount_price && Number(product.discount_price) > 0) {
    currentPrice = Number(product.discount_price);
    originalPrice = Number(product.price);
  } else if (product.originalPrice) {
    originalPrice = Number(product.originalPrice);
  }

  const discount =
    product.discount_percentage ||
    (originalPrice && originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : null);

  const rating = product.rating || null;
  const reviews = product.reviews || null;
  const badge = product.badge || (product.is_featured ? "Featured" : null);
  const productKey = product.slug || product.id;
  const isOutOfStock = product.available_stock !== undefined && product.available_stock <= 0;
  const isDemo = Boolean(product.isDemo);

  const handleQuickAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDemo) {
      navigate(`/product/${productKey}`);
      return;
    }

    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (isOutOfStock || adding) return;

    try {
      setAdding(true);
      await addToCart(product.id, 1);
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 2000);
    } catch {
      // Navigate to product detail if stock/validation notice needs user attention
      navigate(`/product/${productKey}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <article
      className="card-lift flex flex-col h-full"
      style={{
        background: "#fff",
        border: "1px solid var(--cream-dark)",
      }}
    >
      {/* Image */}
      <Link
        to={`/product/${productKey}`}
        className="relative overflow-hidden block"
        style={{ aspectRatio: "4/3" }}
      >
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
          onError={(e) => handleImageError(e, FALLBACK_IMAGE)}
        />

        {/* Badge */}
        {badge && (
          <span
            style={{
              background: isDemo ? "#4A3728" : "var(--burgundy)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: "9.5px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              padding: "3px 8px",
            }}
            className="absolute top-3 left-3 uppercase"
          >
            {badge}
          </span>
        )}

        {/* Discount */}
        {discount && (
          <span
            style={{
              background: "var(--brown-dark)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: "9.5px",
              fontWeight: "700",
              padding: "3px 7px",
            }}
            className="absolute top-3 right-12 uppercase"
          >
            −{discount}%
          </span>
        )}

        {/* Wishlist */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onWishlistToggle) onWishlistToggle(product.id);
          }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center transition-all cursor-pointer"
          style={{
            background: isWishlisted ? "var(--burgundy)" : "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={isWishlisted ? "#fff" : "none"}
            stroke={isWishlisted ? "#fff" : "var(--brown-mid)"}
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "9.5px",
            fontWeight: "600",
            letterSpacing: "0.14em",
            color: "var(--burgundy)",
            textTransform: "uppercase",
            marginBottom: "5px",
          }}
        >
          {craftLabel}
        </p>

        <Link to={`/product/${productKey}`}>
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--brown-dark)",
              fontSize: "15px",
              fontWeight: "600",
              lineHeight: 1.35,
              marginBottom: "5px",
            }}
            className="line-clamp-2 hover:text-[var(--burgundy)] transition-colors"
          >
            {product.name}
          </h3>
        </Link>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            color: "var(--brown-light)",
            fontSize: "11.5px",
            marginBottom: "10px",
          }}
        >
          by {artisanName} · {regionLabel}
        </p>

        {rating && (
          <div className="flex items-center gap-1.5 mb-3">
            <span style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: "12px", fontWeight: "600" }}>
              ★ {rating}
            </span>
            {reviews && (
              <span style={{ color: "var(--brown-light)", fontSize: "11px", fontFamily: "var(--font-sans)" }}>
                ({reviews})
              </span>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-2 mt-auto mb-4">
          <span
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--brown-dark)",
              fontSize: "18px",
              fontWeight: "700",
            }}
          >
            ₹{currentPrice.toLocaleString("en-IN")}
          </span>
          {originalPrice && (
            <span
              style={{
                color: "var(--brown-light)",
                fontSize: "12px",
                fontFamily: "var(--font-sans)",
                textDecoration: "line-through",
              }}
            >
              ₹{originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* Separate View Product & Add to Cart Actions */}
        <div className="flex items-center gap-2">
          <Link
            to={`/product/${productKey}`}
            className="btn-primary flex-1 justify-center text-[11px] py-2.5"
          >
            VIEW PRODUCT
          </Link>

          {!isDemo && (
            <button
              type="button"
              onClick={handleQuickAddToCart}
              disabled={isOutOfStock || adding}
              title={isOutOfStock ? "Out of Stock" : "Add to Shopping Bag"}
              className="px-3 py-2.5 border text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              style={{
                borderColor: addedFeedback ? "#2D8A4E" : "var(--brown-dark)",
                color: addedFeedback ? "#2D8A4E" : "var(--brown-dark)",
                background: addedFeedback ? "#ECFDF5" : "transparent",
                fontFamily: "var(--font-sans)",
              }}
            >
              {adding ? "..." : addedFeedback ? "✓" : isOutOfStock ? "Sold" : "+ Bag"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
