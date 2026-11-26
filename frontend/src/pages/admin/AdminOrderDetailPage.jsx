import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

function getOrderStatusBadge(status) {
  switch (status) {
    case 'DELIVERED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'SHIPPED':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'PROCESSING':
    case 'CONFIRMED':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-[#F2ECE4] text-[#7A5C4A] border-[#E8DED2]';
  }
}

function getFulfillmentBadge(status) {
  switch (status) {
    case 'DELIVERED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'SHIPPED':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'READY_TO_DISPATCH':
    case 'PROCESSING':
    case 'ACCEPTED':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-[#F2ECE4] text-[#7A5C4A] border-[#E8DED2]';
  }
}

function getPaymentStatusBadge(status) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REFUNDED':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'FAILED':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-amber-50 text-amber-800 border-amber-200';
  }
}

function formatCurrency(val) {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminOrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminService.getOrderDetail(orderNumber);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadOrder();
    });
    return () => {
      active = false;
    };
  }, [loadOrder]);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Link
            to="/admin/orders"
            className="text-xs font-semibold text-[#7A5C4A] hover:text-[#C0522B]"
          >
            ← Back to All Orders
          </Link>
          <span className="text-[11px] font-semibold text-[#7A5C4A] bg-[#FAF7F2] border border-[#E8DED2] px-2.5 py-1 rounded-sm">
            Read-Only Admin Oversight
          </span>
        </div>

        {loading ? (
          <div className="p-10 bg-white rounded-sm border border-[#E8DED2] text-center text-xs text-[#7A5C4A]">
            Loading order details...
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadOrder}
              className="underline font-semibold ml-3 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : !order ? (
          <div className="p-10 bg-white rounded-sm border border-[#E8DED2] text-center text-xs text-[#7A5C4A]">
            Order not found.
          </div>
        ) : (
          <>
            {/* Header Card */}
            <div className="p-6 bg-white rounded-sm border border-[#E8DED2] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C0522B]">
                  Parent Order Reference
                </span>
                <h1
                  className="text-2xl font-bold text-[#2C2C2C] mt-1"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  {order.order_number}
                </h1>
                <p className="text-xs text-[#7A5C4A] mt-1">
                  Placed on{' '}
                  {new Date(order.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                    Payment Status
                  </span>
                  <span
                    className={`inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded border ${getPaymentStatusBadge(
                      order.payment_status
                    )}`}
                  >
                    {order.payment_status}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                    Parent Order Status
                  </span>
                  <span
                    className={`inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded border ${getOrderStatusBadge(
                      order.order_status
                    )}`}
                  >
                    {order.order_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Grid: Customer, Shipping Address, Payment Reference, Cancellation/Refund */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Info */}
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-2">
                <div className="flex items-center justify-between border-b border-[#F0EBE3] pb-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
                    Customer Information
                  </h2>
                  {order.customer?.id && (
                    <Link
                      to={`/admin/customers/${order.customer.id}`}
                      className="text-[11px] font-semibold text-[#C0522B] hover:underline"
                    >
                      View Profile →
                    </Link>
                  )}
                </div>
                <div className="text-xs space-y-1 text-[#4A3728]">
                  <p>
                    <span className="text-[#7A5C4A]">Name:</span>{' '}
                    <strong className="text-[#2C2C2C]">{order.customer?.full_name}</strong>
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Email:</span> {order.customer?.email}
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Phone:</span>{' '}
                    {order.customer?.phone_number || '—'}
                  </p>
                </div>
              </div>

              {/* Shipping Address Snapshot */}
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] border-b border-[#F0EBE3] pb-2">
                  Shipping Address Snapshot
                </h2>
                {order.shipping_address_snapshot ? (
                  <div className="text-xs space-y-1 text-[#4A3728]">
                    <p className="font-semibold text-[#2C2C2C]">
                      {order.shipping_address_snapshot.full_name}
                    </p>
                    <p>{order.shipping_address_snapshot.address_line_1}</p>
                    {order.shipping_address_snapshot.address_line_2 && (
                      <p>{order.shipping_address_snapshot.address_line_2}</p>
                    )}
                    <p>
                      {order.shipping_address_snapshot.city},{' '}
                      {order.shipping_address_snapshot.state} —{' '}
                      {order.shipping_address_snapshot.postal_code}
                    </p>
                    <p className="text-[#7A5C4A]">
                      Phone: {order.shipping_address_snapshot.phone_number}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#7A5C4A]">No address snapshot available.</p>
                )}
              </div>

              {/* Payment Reference */}
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] border-b border-[#F0EBE3] pb-2">
                  Payment Transaction Reference
                </h2>
                <div className="text-xs space-y-1.5 text-[#4A3728]">
                  <p>
                    <span className="text-[#7A5C4A]">Razorpay Order ID:</span>{' '}
                    <code className="bg-[#FAF7F2] px-1.5 py-0.5 rounded text-[11px]">
                      {order.payment_reference?.razorpay_order_id || '—'}
                    </code>
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Razorpay Payment ID:</span>{' '}
                    <code className="bg-[#FAF7F2] px-1.5 py-0.5 rounded text-[11px]">
                      {order.payment_reference?.razorpay_payment_id || '—'}
                    </code>
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Signature Verification:</span>{' '}
                    {order.payment_reference?.signature_verified ? (
                      <span className="text-emerald-700 font-semibold">Verified Server-Side</span>
                    ) : (
                      <span className="text-[#7A5C4A]">Not Verified / Pending</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Cancellation & Refund Info */}
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] border-b border-[#F0EBE3] pb-2">
                  Cancellation &amp; Refund Status
                </h2>
                <div className="text-xs space-y-1.5 text-[#4A3728]">
                  <p>
                    <span className="text-[#7A5C4A]">Order Cancelled:</span>{' '}
                    <strong>
                      {order.cancellation_refund_info?.is_cancelled ? 'Yes' : 'No'}
                    </strong>
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Refund State:</span>{' '}
                    <span className="font-semibold">
                      {order.cancellation_refund_info?.refund_state || 'NOT_CANCELLED'}
                    </span>
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Cancelled Line Items:</span>{' '}
                    {order.cancellation_refund_info?.cancelled_items_count ?? 0} of{' '}
                    {order.cancellation_refund_info?.total_items_count ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Multi-Vendor Seller Fulfillment Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Seller Consignments &amp; Item Fulfillment
                </h2>
                <span className="text-xs text-[#7A5C4A]">
                  {(order.seller_groups || []).length}{' '}
                  {(order.seller_groups || []).length === 1 ? 'artisan store' : 'artisan stores'}
                </span>
              </div>

              {(order.seller_groups || []).map((group) => (
                <div
                  key={group.seller_id}
                  className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden"
                >
                  <div className="px-5 py-3.5 bg-[#FAF7F2] border-b border-[#E8DED2] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Link
                        to={`/admin/sellers/${group.seller_id}`}
                        className="text-sm font-bold text-[#2C2C2C] hover:text-[#C0522B]"
                      >
                        {group.store_name}
                      </Link>
                      {(group.city || group.state) && (
                        <span className="text-[11px] text-[#7A5C4A] ml-2">
                          ({[group.city, group.state].filter(Boolean).join(', ')})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#4A3728]">
                      {group.item_count} {group.item_count === 1 ? 'item' : 'items'} · Store Subtotal:{' '}
                      <strong className="text-[#2C2C2C]">{formatCurrency(group.subtotal)}</strong>
                    </div>
                  </div>

                  <div className="divide-y divide-[#F0EBE3]">
                    {(group.items || []).map((item) => (
                      <div key={item.id} className="p-4 space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {item.primary_image ? (
                              <img
                                src={item.primary_image}
                                alt={item.product_name}
                                className="w-12 h-12 object-cover rounded-sm border border-[#E8DED2] shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-[#FAF7F2] border border-[#E8DED2] rounded-sm shrink-0" />
                            )}
                            <div>
                              <p className="text-xs font-bold text-[#2C2C2C]">
                                {item.product_name}
                              </p>
                              <p className="text-[11px] text-[#7A5C4A]">
                                {item.craft_type ? `${item.craft_type} · ` : ''}
                                Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${getFulfillmentBadge(
                                item.fulfillment_status
                              )}`}
                            >
                              Item: {item.fulfillment_status}
                            </span>
                            <span className="text-xs font-bold text-[#2C2C2C]">
                              {formatCurrency(item.line_total)}
                            </span>
                          </div>
                        </div>

                        {/* Shipment / Tracking Details */}
                        {(item.courier_name ||
                          item.tracking_number ||
                          item.tracking_url ||
                          item.shipment_notes) && (
                          <div className="mt-2 p-2.5 bg-[#FAF7F2] border border-[#E8DED2] rounded-sm text-[11px] text-[#4A3728] flex flex-wrap gap-x-5 gap-y-1">
                            {item.courier_name && (
                              <span>
                                <strong className="text-[#2C2C2C]">Courier:</strong>{' '}
                                {item.courier_name}
                              </span>
                            )}
                            {item.tracking_number && (
                              <span>
                                <strong className="text-[#2C2C2C]">Tracking #:</strong>{' '}
                                {item.tracking_number}
                              </span>
                            )}
                            {item.tracking_url && (
                              <a
                                href={item.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#C0522B] font-semibold hover:underline"
                              >
                                Track Shipment ↗
                              </a>
                            )}
                            {item.estimated_delivery_date && (
                              <span>
                                <strong className="text-[#2C2C2C]">Est. Delivery:</strong>{' '}
                                {item.estimated_delivery_date}
                              </span>
                            )}
                            {item.shipment_notes && (
                              <span className="w-full text-[#7A5C4A]">
                                Notes: {item.shipment_notes}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Financial Breakdown */}
            <div className="p-5 bg-white rounded-sm border border-[#E8DED2] flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-xs">
                <div className="flex justify-between text-[#4A3728]">
                  <span>Items Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#4A3728]">
                  <span>Shipping</span>
                  <span>{formatCurrency(order.shipping_amount)}</span>
                </div>
                <div className="flex justify-between text-[#4A3728]">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E8DED2] text-sm font-bold text-[#2C2C2C]">
                  <span>Grand Total</span>
                  <span className="text-[#C0522B]">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
