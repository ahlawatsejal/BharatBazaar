import { Link } from 'react-router-dom';

export default function WishlistProductCard({ item, onRemove, onAddToCart, isAddingToCart }) {
  const product = item.product || {};
  const isOutOfStock = product.available_stock !== undefined && product.available_stock <= 0;

  return (
    <div className="group rounded-sm border border-[#EBE4DA] bg-white overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image Container */}
      <div className="relative aspect-square bg-[#F7F4EE] overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0].image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--brown-light)]">
            <svg className="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[11px] font-medium tracking-wide">Artisan Craft</span>
          </div>
        )}

        {/* Quick remove button */}
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          title="Remove from Wishlist"
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white text-[var(--brown-mid)] hover:text-red-600 shadow-sm transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {isOutOfStock && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-black/70 text-white">
            Sold Out
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Craft & Origin */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--brown-light)]">
            <span>{product.craft_type || 'Handcrafted'}</span>
            {product.origin_state && (
              <>
                <span>•</span>
                <span>{product.origin_state}</span>
              </>
            )}
          </div>

          {/* Product Name */}
          <Link
            to={`/product/${product.slug}`}
            className="block mt-1 text-sm font-semibold text-[var(--brown-dark)] hover:text-[var(--burgundy)] transition-colors line-clamp-2"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {product.name}
          </Link>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F2ECE4]">
          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            <span
              className="text-base font-bold"
              style={{ color: 'var(--burgundy)', fontFamily: 'var(--font-serif)' }}
            >
              ₹{Number(product.discount_price || product.price || 0).toLocaleString('en-IN')}
            </span>
            {product.discount_price && product.price > product.discount_price && (
              <span className="text-xs text-[var(--brown-light)] line-through">
                ₹{Number(product.price).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Add to Bag CTA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={isOutOfStock || isAddingToCart}
              className="flex-1 py-2 px-3 rounded-sm text-xs font-semibold uppercase tracking-wider text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: isOutOfStock ? '#A89F91' : 'var(--burgundy)' }}
            >
              {isAddingToCart ? 'Adding...' : isOutOfStock ? 'Sold Out' : 'Add to Bag'}
            </button>
            <Link
              to={`/product/${product.slug}`}
              className="p-2 rounded-sm border border-[#D6CCC2] text-[var(--brown-dark)] hover:bg-[#FAF8F5] transition-colors"
              title="View Details"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
