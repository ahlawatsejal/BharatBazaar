import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

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

export default function AdminPaymentDetailPage() {
  const { identifier } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPayment = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminService.getPaymentDetail(identifier);
      setPayment(data);
    } catch (err) {
      setError(err.message || 'Failed to load payment details.');
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadPayment();
    });
    return () => {
      active = false;
    };
  }, [loadPayment]);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Link
            to="/admin/payments"
            className="text-xs font-semibold text-[#7A5C4A] hover:text-[#C0522B]"
          >
            ← Back to Payments
          </Link>
          <span className="text-[11px] font-semibold text-[#7A5C4A] bg-[#FAF7F2] border border-[#E8DED2] px-2.5 py-1 rounded-sm">
            Read-Only Payment Audit
          </span>
        </div>

        {loading ? (
          <div className="p-10 bg-white rounded-sm border border-[#E8DED2] text-center text-xs text-[#7A5C4A]">
            Loading payment details...
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadPayment}
              className="underline font-semibold ml-3 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : !payment ? (
          <div className="p-10 bg-white rounded-sm border border-[#E8DED2] text-center text-xs text-[#7A5C4A]">
            Payment record not found.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 bg-white rounded-sm border border-[#E8DED2] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C0522B]">
                  Order Payment Reference
                </span>
                <h1
                  className="text-2xl font-bold text-[#2C2C2C] mt-1"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  {payment.order_number}
                </h1>
                <p className="text-xs text-[#7A5C4A] mt-1">
                  Created{' '}
                  {new Date(payment.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · Updated{' '}
                  {new Date(payment.updated_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                    Amount
                  </span>
                  <span className="text-xl font-bold text-[#2C2C2C]">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
                <span
                  className={`inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded border ${getPaymentStatusBadge(
                    payment.payment_status
                  )}`}
                >
                  {payment.payment_status}
                </span>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gateway References */}
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] border-b border-[#F0EBE3] pb-2">
                  Razorpay Transaction Reference
                </h2>
                <div className="text-xs space-y-1.5 text-[#4A3728]">
                  <p>
                    <span className="text-[#7A5C4A]">Razorpay Order ID:</span>{' '}
                    <code className="bg-[#FAF7F2] px-1.5 py-0.5 rounded text-[11px]">
                      {payment.razorpay_order_id || '—'}
                    </code>
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Razorpay Payment ID:</span>{' '}
                    <code className="bg-[#FAF7F2] px-1.5 py-0.5 rounded text-[11px]">
                      {payment.razorpay_payment_id || '—'}
                    </code>
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Payment Method:</span>{' '}
                    {payment.payment_method || 'Not stored on Order'}
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">HMAC Signature Verification:</span>{' '}
                    {payment.signature_verified ? (
                      <span className="font-semibold text-emerald-700">Verified Server-Side</span>
                    ) : (
                      <span className="text-[#7A5C4A]">Not Verified / Pending</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Customer & Order Link */}
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-2">
                <div className="flex items-center justify-between border-b border-[#F0EBE3] pb-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
                    Customer &amp; Related Order
                  </h2>
                  <Link
                    to={`/admin/orders/${payment.order_number}`}
                    className="text-[11px] font-semibold text-[#C0522B] hover:underline"
                  >
                    Inspect Order →
                  </Link>
                </div>
                <div className="text-xs space-y-1.5 text-[#4A3728]">
                  <p>
                    <span className="text-[#7A5C4A]">Customer:</span>{' '}
                    <strong className="text-[#2C2C2C]">{payment.customer?.full_name}</strong>
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Email:</span> {payment.customer?.email}
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Phone:</span>{' '}
                    {payment.customer?.phone_number || '—'}
                  </p>
                  <p>
                    <span className="text-[#7A5C4A]">Parent Order Status:</span>{' '}
                    <strong className="text-[#2C2C2C]">{payment.order_status}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Cancellation & Refund Distinction */}
            <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] border-b border-[#F0EBE3] pb-2">
                Cancellation &amp; Refund Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#4A3728]">
                <div>
                  <span className="text-[#7A5C4A] block">Order Cancelled</span>
                  <strong className="text-[#2C2C2C]">
                    {payment.cancellation_refund_info?.is_order_cancelled ? 'Yes' : 'No'}
                  </strong>
                </div>
                <div>
                  <span className="text-[#7A5C4A] block">Payment Refund Status</span>
                  <strong className="text-[#2C2C2C]">
                    {payment.cancellation_refund_info?.refund_status_label}
                  </strong>
                </div>
                <div>
                  <span className="text-[#7A5C4A] block">Confirmed Refund Amount</span>
                  <strong className="text-[#2C2C2C]">
                    {payment.cancellation_refund_info?.refund_amount
                      ? formatCurrency(payment.cancellation_refund_info.refund_amount)
                      : 'None'}
                  </strong>
                </div>
              </div>
              {payment.cancellation_refund_info?.note && (
                <p className="text-[11px] text-[#7A5C4A] pt-1">
                  {payment.cancellation_refund_info.note}
                </p>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
              <div className="px-5 py-3 bg-[#FAF7F2] border-b border-[#E8DED2] flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
                  Order Line Items ({(payment.items || []).length})
                </h2>
              </div>
              <div className="divide-y divide-[#F0EBE3]">
                {(payment.items || []).map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#2C2C2C]">{item.product_name}</p>
                      <p className="text-[11px] text-[#7A5C4A]">
                        Store: {item.seller_store_name} · Qty: {item.quantity} ×{' '}
                        {formatCurrency(item.unit_price)} · Item Status: {item.fulfillment_status}
                      </p>
                    </div>
                    <div className="font-bold text-[#2C2C2C]">
                      {formatCurrency(item.line_total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
