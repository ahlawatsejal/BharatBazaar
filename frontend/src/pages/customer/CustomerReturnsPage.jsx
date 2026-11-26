import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../components/customer/CustomerLayout';
import { orderService } from '../../services/orderService';
import { customerService } from '../../services/customerService';

const REASON_OPTIONS = [
  { value: 'TRANSIT_DAMAGE', label: 'Item damaged or cracked during transit' },
  { value: 'WRONG_ITEM', label: 'Different article received than ordered' },
  { value: 'WEAVE_DEFECT', label: 'Significant structural or weave tear' },
  { value: 'SIZE_MISMATCH', label: 'Sizing differs from product specification' },
  { value: 'OTHER', label: 'Other handcrafted concern' },
];

function getStatusBadge(status) {
  switch (status) {
    case 'APPROVED':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REJECTED':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-amber-50 text-amber-800 border-amber-200';
  }
}

export default function CustomerReturnsPage() {
  const [eligibleItems, setEligibleItems] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [selectedItemKey, setSelectedItemKey] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [ordersData, returnsData] = await Promise.all([
        orderService.getOrderHistory(),
        customerService.getReturnRequests(),
      ]);

      const ordersList = Array.isArray(ordersData) ? ordersData : ordersData?.results || [];
      const returnsList = Array.isArray(returnsData) ? returnsData : returnsData?.results || [];
      setReturnRequests(returnsList);

      const blockedItemIds = new Set(
        returnsList
          .filter((r) => ['PENDING', 'APPROVED', 'COMPLETED'].includes(r.status))
          .map((r) => r.order_item_id)
      );

      const items = [];
      ordersList.forEach((ord) => {
        if (ord.payment_status !== 'PAID' || ord.order_status === 'CANCELLED') return;
        (ord.items || []).forEach((it) => {
          const isDelivered =
            it.fulfillment_status === 'DELIVERED' ||
            (ord.order_status === 'DELIVERED' && it.fulfillment_status !== 'CANCELLED');
          if (isDelivered && !blockedItemIds.has(it.id)) {
            items.push({
              key: `${ord.order_number}::${it.id}`,
              order_number: ord.order_number,
              order_item_id: it.id,
              product_name: it.product_name,
              quantity: it.quantity,
              line_total: it.line_total,
              seller_name: it.seller_name || 'Artisan Store',
            });
          }
        });
      });
      setEligibleItems(items);
    } catch (err) {
      setError(err.message || 'Unable to load return requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!selectedItemKey || !reason) {
      setSubmitError('Please select an eligible item and a return reason.');
      return;
    }

    const [order_number, rawItemId] = selectedItemKey.split('::');
    try {
      setSubmitting(true);
      const res = await customerService.submitReturnRequest({
        order_number,
        order_item_id: Number(rawItemId),
        reason,
        description: description.trim(),
      });
      setSubmitSuccess(res?.message || 'Return request submitted successfully.');
      setSelectedItemKey('');
      setReason('');
      setDescription('');
      await loadData();
    } catch (err) {
      setSubmitError(err.message || 'Could not submit return request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerLayout
      title="Returns & Replacements"
      subtitle="Submit and track return requests for delivered artisan items."
    >
      <div className="space-y-6">
        {/* Handicraft Return Policy Banner */}
        <div className="p-6 rounded-sm border border-[#EBE4DA] bg-white">
          <h2
            className="text-base font-semibold text-[var(--brown-dark)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            7-Day Artisan Authenticity &amp; Transit Guarantee
          </h2>
          <p className="text-xs text-[var(--brown-mid)] mt-1.5 leading-relaxed">
            Return requests are reviewed per item by our moderation desk. Approval tracks physical return
            authorization; any applicable refund is handled separately upon verification.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadData} className="underline font-semibold cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* Submit Return Request Form */}
        <div className="p-6 rounded-sm border border-[#EBE4DA] bg-white">
          <h3
            className="text-sm font-semibold text-[var(--brown-dark)] mb-3 pb-3 border-b border-[#F2ECE4]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Submit a Return Request
          </h3>

          {submitSuccess && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-sm text-xs text-emerald-800">
              {submitSuccess}
            </div>
          )}

          {submitError && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700">
              {submitError}
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-xs text-[var(--brown-light)]">
              Checking eligible delivered items...
            </div>
          ) : eligibleItems.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-[var(--brown-mid)]">
                No eligible delivered items are currently available for a new return request.
              </p>
              <Link
                to="/customer/orders"
                className="inline-block text-xs font-semibold text-[var(--burgundy)] hover:underline"
              >
                View My Orders →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmitRequest} className="space-y-4 max-w-xl">
              <div>
                <label htmlFor="return-order-item" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                  Select Delivered Order Item *
                </label>
                <select
                  id="return-order-item"
                  name="order_item"
                  required
                  value={selectedItemKey}
                  onChange={(e) => setSelectedItemKey(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[var(--burgundy)]"
                >
                  <option value="">-- Choose Item --</option>
                  {eligibleItems.map((it) => (
                    <option key={it.key} value={it.key}>
                      {it.product_name} (Qty {it.quantity}) — {it.order_number} · ₹
                      {Number(it.line_total).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="return-reason" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                  Reason for Return *
                </label>
                <select
                  id="return-reason"
                  name="reason"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[var(--burgundy)]"
                >
                  <option value="">-- Select Reason --</option>
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="return-description" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  id="return-description"
                  name="description"
                  rows="3"
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)] resize-none"
                  placeholder="Describe the issue with the delivered item..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white rounded-sm transition-all cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--burgundy)' }}
              >
                {submitting ? 'Submitting...' : 'Submit Return Request'}
              </button>
            </form>
          )}
        </div>

        {/* Submitted Return Requests History */}
        <div className="p-6 rounded-sm border border-[#EBE4DA] bg-white">
          <h3
            className="text-sm font-semibold text-[var(--brown-dark)] mb-3 pb-3 border-b border-[#F2ECE4]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            My Return Requests ({returnRequests.length})
          </h3>

          {loading ? (
            <div className="py-6 text-center text-xs text-[var(--brown-light)]">
              Loading your return requests...
            </div>
          ) : returnRequests.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--brown-mid)]">
              You have not submitted any return requests yet.
            </p>
          ) : (
            <div className="divide-y divide-[#F2ECE4]">
              {returnRequests.map((req) => (
                <div key={req.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-[var(--brown-dark)]">
                        {req.product_name}
                      </span>{' '}
                      <span className="text-[var(--brown-light)]">
                        (Qty {req.quantity} · {req.seller_store_name})
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${getStatusBadge(
                        req.status
                      )}`}
                    >
                      {req.status_display || req.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--brown-mid)]">
                    Order:{' '}
                    <Link
                      to={`/customer/orders/${req.order_number}`}
                      className="font-mono font-semibold text-[var(--burgundy)] hover:underline"
                    >
                      {req.order_number}
                    </Link>{' '}
                    · Reason: {req.reason_display || req.reason} · Submitted{' '}
                    {new Date(req.created_at).toLocaleDateString('en-IN')}
                  </p>

                  {req.description && (
                    <p className="text-[11px] text-[var(--brown-light)]">{req.description}</p>
                  )}

                  {req.status === 'REJECTED' && req.rejection_reason && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-sm text-[11px]">
                      <strong>Review Decision:</strong> {req.rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
