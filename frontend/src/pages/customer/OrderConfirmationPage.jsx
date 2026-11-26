import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import AnnouncementBar from '../../components/layout/AnnouncementBar';
import Footer from '../../components/layout/Footer';
import { orderService } from '../../services/orderService';
import { CRAFT_FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve()
      .then(() => {
        if (!isMounted) return null;
        setLoading(true);
        setError(null);
        return orderService.getOrderByNumber(orderNumber);
      })
      .then((data) => {
        if (isMounted && data !== null) {
          setOrder(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Failed to load order:', err);
          setError(err.message || 'Could not verify order confirmation.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [orderNumber]);

  const items = order?.items || [];
  const address = order?.shipping_address_snapshot || {};
  const isPaid = order?.payment_status === 'PAID';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF8F5' }}>
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 px-5 sm:px-8 lg:px-14 py-12 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA] animate-pulse">
            <div className="w-16 h-16 bg-[#EBE4DA] rounded-full mx-auto mb-4" />
            <div className="h-6 bg-[#EBE4DA] rounded w-64 mx-auto mb-2" />
            <div className="h-4 bg-[#EBE4DA] rounded w-48 mx-auto" />
          </div>
        ) : error || !order ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-rose-50 text-rose-700">
              ✕
            </div>
            <h1 className="font-serif text-2xl font-semibold text-[var(--brown-dark)] mb-2">
              Order Verification Pending
            </h1>
            <p className="text-xs text-[var(--brown-mid)] max-w-md mx-auto mb-6">
              {error || 'Unable to retrieve order details or order does not belong to your account.'}
            </p>
            <Link to="/shop" className="btn-primary text-xs py-2.5 px-6 inline-block">
              Return to Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-8" style={{ fontFamily: 'var(--font-sans)' }}>
            {/* Confirmation Banner */}
            <div className="p-8 text-center bg-white rounded-sm border border-[#EBE4DA]">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{
                  background: isPaid ? '#F0FDF4' : '#FFFBEB',
                  color: isPaid ? '#166534' : '#B45309',
                }}
              >
                <span className="text-2xl font-bold">{isPaid ? '✓' : '⏳'}</span>
              </div>

              <p
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '0.14em',
                  color: isPaid ? '#166534' : '#B45309',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                {isPaid ? 'Order Confirmed & Paid' : 'Payment Awaiting Confirmation'}
              </p>

              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--brown-dark)',
                  fontSize: 'clamp(26px, 3.5vw, 36px)',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                Thank You for Supporting India's Artisans
              </h1>

              <p className="text-xs text-[var(--brown-mid)] max-w-md mx-auto mb-4 leading-relaxed">
                Your order has been recorded. Our regional artisan workshops have been notified to begin careful packaging and dispatch.
              </p>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#FAF6F2] border border-[#EBE4DA] text-xs">
                <span className="text-[var(--brown-light)]">Order Reference:</span>
                <span className="font-mono font-bold text-[var(--brown-dark)]">{order.order_number}</span>
              </div>
            </div>

            {/* Order Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Delivery Destination */}
              <div className="p-6 bg-white rounded-sm border border-[#EBE4DA] text-xs">
                <h2 className="font-serif text-base font-semibold text-[var(--brown-dark)] pb-2 mb-3 border-b border-[#EBE4DA]">
                  Delivery Address
                </h2>
                <div className="text-[var(--brown-mid)] space-y-1 leading-relaxed">
                  <p className="font-bold text-[var(--brown-dark)]">{address.full_name}</p>
                  <p>📞 {address.phone_number}</p>
                  <p>
                    {address.address_line_1}
                    {address.address_line_2 ? `, ${address.address_line_2}` : ''}
                  </p>
                  <p>
                    {address.city}, {address.state} - {address.postal_code}
                  </p>
                  <p>{address.country || 'India'}</p>
                </div>
              </div>

              {/* Payment Info */}
              <div className="p-6 bg-white rounded-sm border border-[#EBE4DA] text-xs">
                <h2 className="font-serif text-base font-semibold text-[var(--brown-dark)] pb-2 mb-3 border-b border-[#EBE4DA]">
                  Payment Summary
                </h2>
                <div className="space-y-2 text-[var(--brown-mid)]">
                  <div className="flex justify-between">
                    <span>Payment Status:</span>
                    <span className="font-bold text-emerald-800 uppercase tracking-wider text-[11px]">
                      {order.payment_status}
                    </span>
                  </div>
                  {order.razorpay_payment_id && (
                    <div className="flex justify-between">
                      <span>Gateway Payment ID:</span>
                      <span className="font-mono text-[11px] text-[var(--brown-dark)]">
                        {order.razorpay_payment_id}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Articles Subtotal:</span>
                    <span>₹{Number(order.subtotal).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logistics & Shipping:</span>
                    <span>
                      {Number(order.shipping_amount) === 0 ? 'FREE' : `₹${Number(order.shipping_amount).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#EBE4DA] flex justify-between font-bold text-sm text-[var(--brown-dark)]">
                    <span>Total Paid:</span>
                    <span className="font-serif text-lg">₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchased Items */}
            <div className="p-6 bg-white rounded-sm border border-[#EBE4DA]">
              <h2 className="font-serif text-base font-semibold text-[var(--brown-dark)] pb-3 mb-4 border-b border-[#EBE4DA]">
                Purchased Handcrafted Articles ({items.length})
              </h2>

              <div className="divide-y divide-[#EBE4DA]">
                {items.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.primary_image || CRAFT_FALLBACK_IMAGE}
                        alt={item.product_name}
                        className="w-12 h-12 object-cover rounded-sm border border-[#EBE4DA]"
                        onError={(e) => handleImageError(e)}
                      />
                      <div>
                        <p className="font-medium text-[var(--brown-dark)]">{item.product_name}</p>
                        <p className="text-[11px] text-[var(--brown-light)]">
                          Maker: {item.seller_name || 'Artisan Workshop'} · Qty: {item.quantity}
                        </p>
                      </div>
                    </div>

                    <span className="font-serif font-bold text-[var(--brown-dark)]">
                      ₹{Number(item.line_total).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/customer/dashboard" className="btn-primary text-xs py-3 px-8 text-center w-full sm:w-auto">
                View My Customer Dashboard
              </Link>
              <Link
                to="/shop"
                className="text-xs font-semibold underline text-[var(--brown-dark)] hover:text-[var(--burgundy)] text-center py-2"
              >
                Continue Exploring Marketplace
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
