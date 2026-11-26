import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import AnnouncementBar from '../../components/layout/AnnouncementBar';
import Footer from '../../components/layout/Footer';
import { useCart } from '../../context/useCart';
import { useAuth } from '../../context/useAuth';
import { CRAFT_FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';

export default function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { cart, loading, updateQuantity, removeItem, clearCart } = useCart();
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const items = cart?.items || [];
  const subtotal = Number(cart?.subtotal || 0);
  const shippingAmount = Number(cart?.shipping_amount || 0);
  const totalAmount = Number(cart?.total_amount || 0);
  const isFreeShipping = subtotal >= 999;
  const amountToFreeShipping = Math.max(0, 999 - subtotal);

  const handleQuantityChange = async (itemId, newQuantity) => {
    setActionError(null);
    setUpdatingItemId(itemId);
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (err) {
      setActionError(err.message || 'Could not update item quantity.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setActionError(null);
    setUpdatingItemId(itemId);
    try {
      await removeItem(itemId);
    } catch (err) {
      setActionError(err.message || 'Could not remove item from cart.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleClearCart = async () => {
    setActionError(null);
    try {
      await clearCart();
    } catch (err) {
      setActionError(err.message || 'Could not clear shopping cart.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF8F5' }}>
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 px-5 sm:px-8 lg:px-14 py-8 max-w-7xl mx-auto w-full">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-xs mb-6"
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
          <span style={{ color: 'var(--brown-dark)', fontWeight: '600' }}>Shopping Bag</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-[#EBE4DA]">
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
              Direct Artisan Order
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                color: 'var(--brown-dark)',
                fontSize: 'clamp(26px, 3.5vw, 36px)',
                fontWeight: '600',
              }}
            >
              Your Shopping Bag
            </h1>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-xs text-[var(--brown-light)] hover:text-rose-700 underline font-medium self-start sm:self-auto cursor-pointer"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Clear Entire Bag
            </button>
          )}
        </div>

        {/* Global Error Notice */}
        {actionError && (
          <div
            className="mb-6 p-4 rounded-sm text-xs flex items-center justify-between"
            style={{
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
              color: '#9F1239',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Unauthenticated notice */}
        {!isAuthenticated ? (
          <div
            className="p-12 text-center rounded-sm border border-[#EBE4DA] bg-white my-8 max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-[#FAF4ED] text-[var(--burgundy)]">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--brown-dark)] mb-2">
              Sign In to View Your Bag
            </h2>
            <p className="text-xs text-[var(--brown-mid)] max-w-sm mx-auto mb-6">
              Please sign in to your customer account to access your curated artisan shopping bag, calculate live shipping, and proceed to checkout.
            </p>
            <Link to="/login?redirect=/cart" className="btn-primary text-xs py-3 px-8 inline-block">
              Sign In to Your Account
            </Link>
          </div>
        ) : loading && !cart ? (
          /* Loading Skeleton */
          <div className="space-y-4 max-w-4xl">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-5 bg-white rounded-sm border border-[#EBE4DA] flex gap-4 animate-pulse"
              >
                <div className="w-24 h-24 bg-[#EBE4DA] rounded-sm flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-[#EBE4DA] rounded w-1/3" />
                  <div className="h-3 bg-[#EBE4DA] rounded w-1/4" />
                  <div className="h-5 bg-[#EBE4DA] rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty Bag State */
          <div
            className="p-12 text-center rounded-sm border border-[#EBE4DA] bg-white my-8 max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-[#FAF4ED] text-[var(--burgundy)]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                color: 'var(--brown-dark)',
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '8px',
              }}
            >
              Your Shopping Bag is Empty
            </h2>
            <p className="text-xs text-[var(--brown-mid)] max-w-sm mx-auto mb-6">
              You haven't added any handcrafted Indian textiles, ceramics, or artisanal treasures to your bag yet.
            </p>
            <Link to="/shop" className="btn-primary text-xs py-3 px-8 inline-block">
              Explore Artisan Marketplace
            </Link>
          </div>
        ) : (
          /* Cart Items & Order Summary Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Cart Items (8 Cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Free shipping progress notification */}
              <div
                className="p-3.5 rounded-sm border text-xs"
                style={{
                  background: isFreeShipping ? '#F0FDF4' : '#FFFBF5',
                  borderColor: isFreeShipping ? '#BBF7D0' : '#FDE68A',
                  color: isFreeShipping ? '#166534' : '#92400E',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {isFreeShipping ? (
                  <span>✦ Congratulations! Your order qualifies for <strong>Free Express Shipping</strong> across India.</span>
                ) : (
                  <span>
                    Add <strong>₹{amountToFreeShipping.toLocaleString('en-IN')}</strong> more of artisanal goods to enjoy <strong>Free Shipping</strong> (orders above ₹999).
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="divide-y divide-[#EBE4DA] border border-[#EBE4DA] bg-white rounded-sm">
                {items.map((item) => {
                  const prod = item.product || {};
                  const isUpdating = updatingItemId === item.id;
                  const unitPrice = Number(item.unit_price || 0);
                  const lineTotal = Number(item.line_total || 0);

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                      style={{ opacity: isUpdating ? 0.6 : 1 }}
                    >
                      {/* Thumbnail */}
                      <Link
                        to={`/product/${prod.slug || prod.id}`}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm overflow-hidden bg-[#FAF8F5] border border-[#EBE4DA] flex-shrink-0"
                      >
                        <img
                          src={prod.primary_image || CRAFT_FALLBACK_IMAGE}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                          onError={(e) => handleImageError(e)}
                        />
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0" style={{ fontFamily: 'var(--font-sans)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--burgundy)] mb-0.5">
                          {prod.craft_type || 'Indian Handcrafted'}
                        </p>
                        <Link
                          to={`/product/${prod.slug || prod.id}`}
                          className="font-serif text-base font-semibold text-[var(--brown-dark)] hover:text-[var(--burgundy)] transition-colors line-clamp-1"
                        >
                          {prod.name}
                        </Link>
                        <p className="text-xs text-[var(--brown-light)] mt-0.5 mb-2">
                          by <span className="font-medium text-[var(--brown-mid)]">{prod.seller_store_name || 'Artisan Workshop'}</span>
                          {prod.origin_state && ` · ${prod.origin_state}`}
                        </p>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--brown-dark)]">
                            ₹{unitPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] text-[var(--brown-light)]">each</span>
                        </div>
                      </div>

                      {/* Quantity Controls & Line Total */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 sm:gap-2">
                        {/* Quantity Counter */}
                        <div
                          className="flex items-center border border-[#D6CCC2] rounded-sm bg-white"
                          style={{ fontFamily: 'var(--font-sans)' }}
                        >
                          <button
                            type="button"
                            disabled={item.quantity <= 1 || isUpdating}
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="w-8 h-8 flex items-center justify-center text-xs font-semibold hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-[var(--brown-dark)]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={item.quantity >= (prod.available_stock || 99) || isUpdating}
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="w-8 h-8 flex items-center justify-center text-xs font-semibold hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right">
                          <span
                            className="block font-serif font-bold text-base text-[var(--brown-dark)]"
                          >
                            ₹{lineTotal.toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-[11px] text-[var(--brown-light)] hover:text-rose-700 underline cursor-pointer"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Continue Shopping Button */}
              <div className="pt-2">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--burgundy)] hover:underline"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  ← Continue Exploring Crafts
                </Link>
              </div>
            </div>

            {/* Right Column: Order Summary (4 Cols) */}
            <div className="lg:col-span-4">
              <div
                className="p-6 rounded-sm border border-[#EBE4DA] bg-white sticky top-24"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <h2 className="font-serif text-lg font-semibold text-[var(--brown-dark)] pb-4 mb-4 border-b border-[#EBE4DA]">
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs mb-6">
                  <div className="flex justify-between text-[var(--brown-mid)]">
                    <span>Subtotal ({cart?.total_items || 0} items)</span>
                    <span className="font-medium text-[var(--brown-dark)]">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-[var(--brown-mid)]">
                    <span>Shipping Charges</span>
                    <span className="font-medium">
                      {shippingAmount === 0 ? (
                        <span className="text-emerald-700 font-semibold">FREE</span>
                      ) : (
                        `₹${shippingAmount.toLocaleString('en-IN')}`
                      )}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-[#EBE4DA] flex justify-between items-baseline">
                    <span className="text-sm font-bold text-[var(--brown-dark)]">
                      Estimated Total
                    </span>
                    <span className="font-serif text-xl font-bold text-[var(--brown-dark)]">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[var(--brown-light)] italic">
                    Includes all applicable taxes and direct artisan logistics support.
                  </p>
                </div>

                {/* Checkout CTA */}
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  style={{
                    background: 'var(--burgundy)',
                    color: '#FFFFFF',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '12px',
                    fontWeight: '700',
                    letterSpacing: '0.12em',
                  }}
                  className="w-full py-3.5 rounded-sm uppercase transition-opacity hover:opacity-90 cursor-pointer flex items-center justify-center gap-2 mb-4"
                >
                  <span>Proceed to Checkout</span>
                  <span>→</span>
                </button>

                {/* Trust Badges */}
                <div className="pt-4 border-t border-[#EBE4DA] space-y-2 text-[11px] text-[var(--brown-light)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--gold)]">✓</span>
                    <span>100% Genuine Handcrafted Goods</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--gold)]">✓</span>
                    <span>Direct Artisan Workshop Dispatch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--gold)]">✓</span>
                    <span>Secure Encrypted Razorpay Checkout</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
