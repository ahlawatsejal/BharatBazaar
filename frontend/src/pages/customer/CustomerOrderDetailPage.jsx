import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import CustomerLayout from '../../components/customer/CustomerLayout';
import OrderStatusTimeline from '../../components/customer/OrderStatusTimeline';
import { orderService } from '../../services/orderService';
import { customerService } from '../../services/customerService';

export default function CustomerOrderDetailPage() {
  const { orderNumber } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState('');

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await orderService.getOrderByNumber(orderNumber);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve order details.');
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    let active = true;
    if (orderNumber) {
      Promise.resolve().then(() => {
        if (active) loadOrder();
      });
    }
    return () => {
      active = false;
    };
  }, [orderNumber, loadOrder]);

  const handleCancelOrder = async () => {
    try {
      setIsCancelling(true);
      setError('');
      await customerService.cancelOrder(orderNumber);
      setCancelSuccess('Order has been successfully cancelled and payment status updated to Refunded.');
      setShowCancelModal(false);
      // Reload order state
      await loadOrder();
    } catch (err) {
      setError(err.message || 'Unable to cancel order.');
      setShowCancelModal(false);
    } finally {
      setIsCancelling(false);
    }
  };

  const canCancel = order && ['PENDING', 'CONFIRMED'].includes(order.order_status);

  return (
    <CustomerLayout
      title={`Order #${orderNumber}`}
      subtitle="View artisan consignment details, delivery updates, and tracking."
    >
      {/* Top back navigation */}
      <div className="mb-6">
        <Link
          to="/customer/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brown-dark)] hover:text-[var(--burgundy)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to All Orders
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
          <div className="inline-block animate-spin w-8 h-8 border-3 border-[var(--burgundy)] border-t-transparent rounded-full mb-3" />
          <p className="text-xs text-[var(--brown-mid)]">Fetching consignment details...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs">
          <p className="font-semibold mb-1">Notice</p>
          <p>{error}</p>
          <button
            type="button"
            onClick={loadOrder}
            className="mt-3 underline font-semibold text-red-800 cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      ) : !order ? (
        <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
          <p className="text-sm font-semibold text-[var(--brown-dark)]">Order Not Found</p>
          <p className="text-xs text-[var(--brown-light)] mt-1">
            We could not find an order matching #{orderNumber}.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {cancelSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
              <span>{cancelSuccess}</span>
              <button
                type="button"
                onClick={() => setCancelSuccess('')}
                className="text-emerald-600 hover:text-emerald-800 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Timeline */}
          <OrderStatusTimeline status={order.order_status} />

          {/* Summary Banner */}
          <div className="p-5 rounded-sm border border-[#EBE4DA] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--brown-dark)', fontFamily: 'var(--font-serif)' }}
                >
                  Order #{order.order_number}
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    order.payment_status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.payment_status === 'REFUNDED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Payment: {order.payment_status}
                </span>
                {order.order_status === 'CANCELLED' && order.payment_status === 'PAID' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    Awaiting Refund Confirmation
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--brown-light)] mt-1">
                Placed on{' '}
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Cancel Action */}
            {canCancel && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="self-start md:self-auto px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 border border-red-200 rounded-sm hover:bg-red-50 transition-colors cursor-pointer"
              >
                Cancel Consignment
              </button>
            )}
          </div>

          {/* Items & Shipping Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Products (8 Cols) */}
            <div className="lg:col-span-8 rounded-sm border border-[#EBE4DA] bg-white p-5">
              <h3
                className="text-sm font-semibold pb-3 mb-4 border-b border-[#F2ECE4]"
                style={{ color: 'var(--brown-dark)', fontFamily: 'var(--font-serif)' }}
              >
                Consignment Items ({order.items?.length || 0})
              </h3>

              <div className="divide-y divide-[#F2ECE4]">
                {order.items?.map((item) => {
                  const steps = ['NEW', 'ACCEPTED', 'PROCESSING', 'READY_TO_DISPATCH', 'SHIPPED', 'DELIVERED'];
                  const labels = ['Placed', 'Accepted', 'Processing', 'Ready', 'Shipped', 'Delivered'];
                  const itemStatus = item.fulfillment_status || 'NEW';
                  const currentStepIdx = steps.indexOf(itemStatus);
                  const imgSrc = item.primary_image || item.product_image;

                  return (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                      <div className="flex items-center gap-4">
                        {/* Item Image */}
                        <div className="w-16 h-16 rounded-sm bg-[#F7F4EE] border border-[#EBE4DA] overflow-hidden shrink-0">
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--brown-light)]">
                              <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Item Info */}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/product/${item.product_slug || ''}`}
                            className="text-sm font-semibold text-[var(--brown-dark)] hover:text-[var(--burgundy)] transition-colors line-clamp-1"
                            style={{ fontFamily: 'var(--font-serif)' }}
                          >
                            {item.product_name}
                          </Link>
                          <p className="text-xs text-[var(--brown-light)] mt-0.5">
                            Crafted by: <span className="text-[var(--brown-mid)] font-medium">{item.seller_name || 'Artisan Partner'}</span>
                          </p>
                          <p className="text-xs text-[var(--brown-mid)] mt-1">
                            Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                          </p>
                        </div>

                        {/* Line Total */}
                        <div className="text-right shrink-0">
                          <span
                            className="text-sm font-bold block"
                            style={{ color: 'var(--burgundy)', fontFamily: 'var(--font-serif)' }}
                          >
                            ₹{Number(item.line_total || item.total_price || item.unit_price * item.quantity).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brown-mid)]">
                            {itemStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Seller-Specific Item Fulfillment Timeline */}
                      {itemStatus === 'CANCELLED' ? (
                        <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-[11px] rounded-sm">
                          This item consignment was cancelled.
                        </div>
                      ) : (
                        <div className="bg-[#FAF8F5] p-3 rounded-sm border border-[#F2ECE4]">
                          <div className="flex items-center justify-between text-[10px]">
                            {steps.map((sKey, idx) => {
                              const done = currentStepIdx >= idx;
                              return (
                                <div key={sKey} className="flex-1 flex flex-col items-center">
                                  <div
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                      done ? 'text-white' : 'bg-white border border-[#D6CCC2] text-[#8C7665]'
                                    }`}
                                    style={{ background: done ? 'var(--burgundy)' : undefined }}
                                  >
                                    {done ? '✓' : idx + 1}
                                  </div>
                                  <span className={`mt-1 ${done ? 'font-semibold text-[var(--brown-dark)]' : 'text-[#8C7665]'}`}>
                                    {labels[idx]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {(item.courier_name || item.tracking_number) && (
                            <div className="mt-2.5 pt-2 border-t border-[#EBE4DA] text-[11px] text-[var(--brown-mid)] flex flex-wrap items-center justify-between gap-2">
                              <span>
                                <strong>{item.courier_name}</strong> • Tracking: <span className="font-mono">{item.tracking_number}</span>
                                {item.estimated_delivery_date ? ` • Est. Delivery: ${item.estimated_delivery_date}` : ''}
                              </span>
                              {item.tracking_url && (
                                <a
                                  href={item.tracking_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-[var(--burgundy)] underline"
                                >
                                  Track Shipment →
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipping & Payment (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Delivery Address */}
              <div className="p-5 rounded-sm border border-[#EBE4DA] bg-white">
                <h3
                  className="text-sm font-semibold pb-3 mb-3 border-b border-[#F2ECE4]"
                  style={{ color: 'var(--brown-dark)', fontFamily: 'var(--font-serif)' }}
                >
                  Delivery Destination
                </h3>
                {(order.shipping_address_snapshot || order.shipping_address) ? (
                  <div className="text-xs leading-relaxed text-[var(--brown-mid)]">
                    {(() => {
                      const addr = order.shipping_address_snapshot || order.shipping_address;
                      return (
                        <>
                          <p className="font-semibold text-[var(--brown-dark)]">{addr.full_name}</p>
                          <p>{addr.phone_number}</p>
                          <p className="mt-1">{addr.address_line_1}</p>
                          {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                          <p>
                            {addr.city}, {addr.state} — {addr.postal_code}
                          </p>
                          <p>{addr.country || 'India'}</p>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--brown-light)]">Address snapshot unavailable.</p>
                )}
              </div>

              {/* Payment & Invoice Breakdown */}
              <div className="p-5 rounded-sm border border-[#EBE4DA] bg-white">
                <h3
                  className="text-sm font-semibold pb-3 mb-3 border-b border-[#F2ECE4]"
                  style={{ color: 'var(--brown-dark)', fontFamily: 'var(--font-serif)' }}
                >
                  Patron Invoice Summary
                </h3>

                <div className="space-y-2 text-xs text-[var(--brown-mid)]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Artisan Logistics & Packaging</span>
                    <span className="text-emerald-700 font-medium">Complimentary</span>
                  </div>
                  <div className="pt-2 border-t border-[#F2ECE4] flex justify-between font-bold text-sm">
                    <span style={{ color: 'var(--brown-dark)' }}>Total Paid</span>
                    <span style={{ color: 'var(--burgundy)', fontFamily: 'var(--font-serif)' }}>
                      ₹{Number(order.total_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F2ECE4] text-[11px] text-[var(--brown-light)]">
                  <p>Gateway Reference:</p>
                  <p className="font-mono text-[var(--brown-dark)] truncate">
                    {order.razorpay_payment_id || 'Pending / Not Assigned'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#D6CCC2] shadow-xl">
            <h3
              className="text-base font-semibold text-[var(--brown-dark)] mb-2"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Cancel Consignment #{orderNumber}?
            </h3>
            <p className="text-xs text-[var(--brown-mid)] leading-relaxed mb-4">
              {order.payment_status === 'PAID'
                ? `Cancelling will halt fulfillment with our artisan workshops and release inventory. Your captured payment of ₹${Number(
                    order.total_amount
                  ).toLocaleString(
                    'en-IN'
                  )} will remain recorded as PAID and awaiting refund confirmation until confirmed by the payment provider.`
                : 'Cancelling will halt fulfillment with our artisan workshops.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F2ECE4]">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="px-4 py-2 text-xs font-semibold text-[var(--brown-dark)] hover:bg-[#FAF8F5] rounded-sm transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
