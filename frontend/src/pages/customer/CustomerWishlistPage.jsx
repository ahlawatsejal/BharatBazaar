import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../components/customer/CustomerLayout';
import WishlistProductCard from '../../components/customer/WishlistProductCard';
import { customerService } from '../../services/customerService';
import { useCart } from '../../context/useCart';

export default function CustomerWishlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [addingId, setAddingId] = useState(null);

  const { addToCart } = useCart();

  const loadWishlist = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await customerService.getWishlist();
      setItems(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve wishlist items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadWishlist();
    });
    return () => {
      active = false;
    };
  }, []);

  const handleRemove = async (productId) => {
    try {
      await customerService.removeFromWishlist(productId);
      setItems((prev) => prev.filter((item) => (item.product?.id || item.product) !== productId));
      setFeedback('Item removed from your curated wishlist.');
    } catch (err) {
      setError(err.message || 'Unable to remove item.');
    }
  };

  const handleAddToCart = async (product) => {
    try {
      setAddingId(product.id);
      await addToCart(product.id, 1);
      setFeedback(`"${product.name}" added to your shopping bag.`);
    } catch (err) {
      setError(err.message || 'Failed to add item to shopping bag.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <CustomerLayout
      title="Curated Wishlist"
      subtitle="Your personally saved heritage handicrafts and artisan creations."
    >
      <div className="space-y-6">
        {feedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback('')}
              className="text-emerald-600 hover:text-emerald-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
            <div className="inline-block animate-spin w-8 h-8 border-3 border-[var(--burgundy)] border-t-transparent rounded-full mb-3" />
            <p className="text-xs text-[var(--brown-mid)]">Fetching curated favorites...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#FAF8F5] border border-[#EBE4DA] flex items-center justify-center text-[var(--brown-mid)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3
              className="text-base font-semibold text-[var(--brown-dark)]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Your Wishlist is Empty
            </h3>
            <p className="text-xs text-[var(--brown-mid)] mt-1 max-w-sm mx-auto">
              Save handwoven textiles, blue pottery, and heirloom jewellery to revisit whenever inspiration strikes.
            </p>
            <Link
              to="/shop"
              className="mt-4 inline-block px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-sm cursor-pointer"
              style={{ background: 'var(--burgundy)' }}
            >
              Explore Artisan Catalogue
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[var(--brown-mid)]">
                Showing <strong className="text-[var(--brown-dark)]">{items.length}</strong> wishlisted masterpieces
              </p>
              <Link
                to="/shop"
                className="text-xs font-semibold text-[var(--burgundy)] hover:underline"
              >
                + Discover More Crafts
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => (
                <WishlistProductCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onAddToCart={handleAddToCart}
                  isAddingToCart={addingId === (item.product?.id || item.product)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
