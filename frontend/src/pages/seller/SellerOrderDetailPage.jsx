import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import SellerLayout from '../../components/seller/SellerLayout';
import { sellerService } from '../../services/sellerService';

const NEXT_STATUS_ACTIONS = {
  NEW: [
    { status: 'ACCEPTED', label: 'Accept Order', style: 'primary' },
    { status: 'CANCELLED', label: 'Cancel Item', style: 'danger' },
  ],
  ACCEPTED: [
    { status: 'PROCESSING', label: 'Start Processing', style: 'primary' },
    { status: 'CANCELLED', label: 'Cancel Item', style: 'danger' },
  ],
  PROCESSING: [
    { status: 'READY_TO_DISPATCH', label: 'Mark Ready to Dispatch', style: 'primary' },
    { status: 'CANCELLED', label: 'Cancel Item', style: 'danger' },
  ],
  READY_TO_DISPATCH: [
    { status: 'SHIPPED', label: 'Mark Shipped', style: 'primary' },
  ],
  SHIPPED: [
    { status: 'DELIVERED', label: 'Mark Delivered', style: 'success' },
  ],
  DELIVERED: [],
  CANCELLED: [],
};

const TIMELINE_STEPS = [
  { key: 'NEW', label: 'Placed' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'READY_TO_DISPATCH', label: 'Ready' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export default function SellerOrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [updatingItemId, setUpdatingItemId] = useState(null);

  // Shipment Modal State
  const [shipmentItem, setShipmentItem] = useState(null);
  const [shipmentForm, setShipmentForm] = useState({
    courier_name: '',
    tracking_number: '',
    tracking_url: '',
    estimated_delivery_date: '',
    shipment_notes: '',
  });
  const [shipmentError, setShipmentError] = useState('');
  const [savingShipment, setSavingShipment] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await sellerService.getOrderDetail(orderNumber);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Failed to load order details.');
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

  const handleStatusChange = async (itemId, targetStatus) => {
    try {
      setUpdatingItemId(itemId);
      setError('');
      setFeedback('');
      await sellerService.updateOrderItemStatus(orderNumber, itemId, targetStatus);
      setFeedback(`Item fulfillment status updated to ${targetStatus.replace(/_/g, ' ')}.`);
      await loadOrder();
    } catch (err) {
      setError(err.message || 'Could not update item status.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const openShipmentModal = (item) => {
    setShipmentItem(item);
    setShipmentForm({
      courier_name: item.courier_name || '',
      tracking_number: item.tracking_number || '',
      tracking_url: item.tracking_url || '',
      estimated_delivery_date: item.estimated_delivery_date || '',
      shipment_notes: item.shipment_notes || '',
    });
    setShipmentError('');
  };

  const handleShipmentSubmit = async (e) => {
    e.preventDefault();
    setShipmentError('');
    try {
      setSavingShipment(true);
      const payload = {
        courier_name: shipmentForm.courier_name.trim(),
        tracking_number: shipmentForm.tracking_number.trim(),
        tracking_url: shipmentForm.tracking_url.trim(),
        estimated_delivery_date: shipmentForm.estimated_delivery_date || null,
        shipment_notes: shipmentForm.shipment_notes.trim(),
      };
      await sellerService.updateOrderItemShipment(orderNumber, shipmentItem.id, payload);
      setFeedback(`Tracking information saved for "${shipmentItem.product_name}".`);
      setShipmentItem(null);
      await loadOrder();
    } catch (err) {
      setShipmentError(err.message || 'Failed to save shipment details.');
    } finally {
      setSavingShipment(false);
    }
  };

  const isPaid = order?.payment_status === 'PAID';

  return (
    <SellerLayout
      title={`Consignment #${orderNumber}`}
      subtitle="Manage your studio's ordered items, update fulfillment status, and enter courier tracking."
    >
      <div className="space-y-6">
        <div>
          <Link
            to="/seller/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A3728] hover:text-[#C0522B]"
          >
            ← Back to All Orders
          </Link>
        </div>

        {feedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback('')} className="font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div className="w-7 h-7 border-2 border-[#C0522B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#7A5C4A]">Loading consignment details...</p>
          </div>
        ) : !order ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <p className="text-sm font-bold text-[#2C2C2C]">Consignment Not Found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Header Banner */}
            <div className="p-5 bg-white rounded-sm border border-[#E8DED2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2
                    className="text-lg font-bold text-[#2C2C2C]"
                    style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                  >
                    Order #{order.order_number}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Payment: {order.payment_status}
                  </span>
                </div>
                <p className="text-xs text-[#7A5C4A] mt-1">
                  Placed on {new Date(order.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase tracking-wider text-[#7A5C4A] block">
                  Your Studio Subtotal
                </span>
                <span
                  className="text-xl font-bold text-[#C0522B]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  ₹{Number(order.seller_subtotal).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {!isPaid && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-sm text-xs">
                <strong>Payment Pending / Unpaid:</strong> You cannot accept, process, or dispatch items until customer payment is verified as <strong>PAID</strong>.
              </div>
            )}

            {order.order_status === 'CANCELLED' && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-sm text-xs">
                <strong>Order Cancelled:</strong> Fulfillment has been halted for this consignment.
                {isPaid && ' Customer payment remains recorded as PAID (awaiting refund confirmation).'}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Items & Fulfillment Controls (8 Cols) */}
              <div className="lg:col-span-8 space-y-4">
                {order.items?.map((item) => {
                  const actions = isPaid ? NEXT_STATUS_ACTIONS[item.fulfillment_status] || [] : [];
                  const stepIdx = TIMELINE_STEPS.findIndex((s) => s.key === item.fulfillment_status);
                  const isCancelled = item.fulfillment_status === 'CANCELLED';

                  return (
                    <div
                      key={item.id}
                      className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-4"
                    >
                      {/* Item Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-sm bg-[#FAF7F2] border border-[#E8DED2] overflow-hidden shrink-0">
                          {item.primary_image ? (
                            <img
                              src={item.primary_image}
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-[#8C7665]">
                              Craft
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-sm font-bold text-[#2C2C2C]"
                            style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                          >
                            {item.product_name}
                          </h3>
                          <p className="text-xs text-[#7A5C4A] mt-0.5">
                            Qty: <strong>{item.quantity}</strong> × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#C0522B]">
                            ₹{Number(item.line_total).toLocaleString('en-IN')}
                          </span>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4A3728] mt-1">
                            {item.fulfillment_status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Mini Progress Timeline */}
                      {isCancelled ? (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700 font-semibold">
                          This consignment item has been cancelled.
                        </div>
                      ) : (
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-[10px]">
                            {TIMELINE_STEPS.map((step, idx) => {
                              const done = stepIdx >= idx;
                              return (
                                <div key={step.key} className="flex-1 flex flex-col items-center relative">
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center font-bold border ${
                                      done
                                        ? 'bg-[#C0522B] border-[#C0522B] text-white'
                                        : 'bg-white border-[#D6CCC2] text-[#8C7665]'
                                    }`}
                                  >
                                    {done ? '✓' : idx + 1}
                                  </div>
                                  <span
                                    className={`mt-1 text-center ${
                                      done ? 'font-bold text-[#2C2C2C]' : 'text-[#8C7665]'
                                    }`}
                                  >
                                    {step.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Shipment Tracking Box */}
                      {(item.courier_name || item.tracking_number) && (
                        <div className="p-3 bg-[#FAF7F2] border border-[#E8DED2] rounded-sm text-xs space-y-1">
                          <p className="font-bold text-[#2C2C2C]">
                            Courier: {item.courier_name} • Tracking #: {item.tracking_number}
                          </p>
                          {item.tracking_url && (
                            <p>
                              <a
                                href={item.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#C0522B] underline font-semibold"
                              >
                                Track Consignment →
                              </a>
                            </p>
                          )}
                          {item.estimated_delivery_date && (
                            <p className="text-[#7A5C4A]">
                              Est. Delivery: {item.estimated_delivery_date}
                            </p>
                          )}
                          {item.shipment_notes && (
                            <p className="text-[#7A5C4A] italic">{item.shipment_notes}</p>
                          )}
                        </div>
                      )}

                      {/* Status & Shipment Action Buttons */}
                      <div className="pt-3 border-t border-[#F0EBE3] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {actions.map((act) => (
                            <button
                              key={act.status}
                              type="button"
                              disabled={updatingItemId === item.id}
                              onClick={() => handleStatusChange(item.id, act.status)}
                              className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                                act.style === 'danger'
                                  ? 'border border-red-200 text-red-700 hover:bg-red-50'
                                  : act.style === 'success'
                                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                  : 'text-white hover:opacity-90'
                              }`}
                              style={{
                                background: act.style === 'primary' ? '#C0522B' : undefined,
                              }}
                            >
                              {updatingItemId === item.id ? 'Updating...' : act.label}
                            </button>
                          ))}
                        </div>

                        {isPaid && !isCancelled && (
                          <button
                            type="button"
                            onClick={() => openShipmentModal(item)}
                            className="px-3 py-1.5 rounded-sm text-xs font-semibold border border-[#D6CCC2] text-[#2C2C2C] hover:bg-[#FAF7F2] cursor-pointer"
                          >
                            {item.tracking_number ? 'Edit Shipment / Tracking' : '+ Add Tracking Info'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Shipping Destination (4 Cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-5 bg-white rounded-sm border border-[#E8DED2]">
                  <h3
                    className="text-sm font-bold text-[#2C2C2C] pb-3 mb-3 border-b border-[#F0EBE3]"
                    style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                  >
                    Fulfillment Destination
                  </h3>
                  {order.shipping_address ? (
                    <div className="text-xs leading-relaxed text-[#4A3728] space-y-1">
                      <p className="font-bold text-[#2C2C2C]">{order.shipping_address.full_name}</p>
                      {order.shipping_address.phone_number && (
                        <p>Phone: {order.shipping_address.phone_number}</p>
                      )}
                      <p className="pt-1">{order.shipping_address.address_line_1}</p>
                      {order.shipping_address.address_line_2 && (
                        <p>{order.shipping_address.address_line_2}</p>
                      )}
                      <p>
                        {order.shipping_address.city}, {order.shipping_address.state} —{' '}
                        {order.shipping_address.postal_code}
                      </p>
                      <p>{order.shipping_address.country || 'India'}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-[#7A5C4A]">Address unavailable.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Shipment Tracking Modal ───────────────────────────────── */}
      {shipmentItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#D6CCC2] shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
              <div>
                <h3
                  className="text-base font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Consignment Tracking Details
                </h3>
                <p className="text-[11px] text-[#7A5C4A] mt-0.5">{shipmentItem.product_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShipmentItem(null)}
                className="text-[#7A5C4A] hover:text-[#2C2C2C] text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {shipmentError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs">
                {shipmentError}
              </div>
            )}

            <form onSubmit={handleShipmentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Courier / Delivery Partner *
                </label>
                <input
                  type="text"
                  required
                  value={shipmentForm.courier_name}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, courier_name: e.target.value })}
                  placeholder="e.g. Delhivery, BlueDart, India Post"
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Tracking Number *
                </label>
                <input
                  type="text"
                  required
                  value={shipmentForm.tracking_number}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, tracking_number: e.target.value })}
                  placeholder="AWB / Consignment ID"
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Tracking URL (Optional)
                </label>
                <input
                  type="url"
                  value={shipmentForm.tracking_url}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, tracking_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Estimated Delivery Date (Optional)
                </label>
                <input
                  type="date"
                  value={shipmentForm.estimated_delivery_date}
                  onChange={(e) =>
                    setShipmentForm({ ...shipmentForm, estimated_delivery_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Shipment Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  value={shipmentForm.shipment_notes}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, shipment_notes: e.target.value })}
                  placeholder="Fragile care, double-boxed..."
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0EBE3]">
                <button
                  type="button"
                  onClick={() => setShipmentItem(null)}
                  disabled={savingShipment}
                  className="px-4 py-2 text-xs font-semibold text-[#4A3728] hover:bg-[#FAF7F2] rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingShipment}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-sm cursor-pointer disabled:opacity-50"
                  style={{ background: '#C0522B' }}
                >
                  {savingShipment ? 'Saving...' : 'Save Tracking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}
