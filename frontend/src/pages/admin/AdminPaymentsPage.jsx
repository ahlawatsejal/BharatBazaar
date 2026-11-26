import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

const PAYMENT_STATUS_TABS = [
  { value: 'ALL', label: 'All Payments' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

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

export default function AdminPaymentsPage() {
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    try {
      const data = await adminService.getPaymentsSummary();
      setSummary(data);
    } catch {
      // Main list error handles connection issues
    }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getPayments({
        paymentStatus,
        dateFrom,
        dateTo,
        search: searchQuery,
        page,
        pageSize,
      });
      setPayments(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load payment records.');
    } finally {
      setLoading(false);
    }
  }, [paymentStatus, dateFrom, dateTo, searchQuery, page]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadSummary();
    });
    return () => {
      active = false;
    };
  }, [loadSummary]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadPayments();
    });
    return () => {
      active = false;
    };
  }, [loadPayments]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleReset = () => {
    setPaymentStatus('ALL');
    setDateFrom('');
    setDateTo('');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="p-6 bg-white rounded-sm border border-[#E8DED2] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C0522B]">
              Financial Oversight
            </span>
            <h1
              className="text-2xl font-bold text-[#2C2C2C] mt-1"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              Payment Management
            </h1>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Read-only audit of Razorpay payment statuses, signature verifications, and confirmed refund records.
            </p>
          </div>
          <div className="text-xs font-semibold text-[#7A5C4A] bg-[#FAF7F2] px-3 py-2 rounded-sm border border-[#E8DED2]">
            {totalCount} {totalCount === 1 ? 'record' : 'records'} matched
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Total Paid Amount
                </p>
                <p className="text-2xl font-bold text-[#C0522B] mt-1">
                  {formatCurrency(summary.total_paid_amount)}
                </p>
                <p className="text-[11px] text-[#7A5C4A] mt-1">
                  {summary.paid_count} successful {summary.paid_count === 1 ? 'payment' : 'payments'}
                </p>
              </div>

              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Pending Payments
                </p>
                <p className="text-2xl font-bold text-[#2C2C2C] mt-1">{summary.pending_count}</p>
                <p className="text-[11px] text-[#7A5C4A] mt-1">Awaiting Razorpay confirmation</p>
              </div>

              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Failed Payments
                </p>
                <p className="text-2xl font-bold text-red-700 mt-1">{summary.failed_count}</p>
                <p className="text-[11px] text-[#7A5C4A] mt-1">
                  {summary.cancelled_not_refunded_count} cancelled (not refunded)
                </p>
              </div>

              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Refunded (Order Status)
                </p>
                <p className="text-2xl font-bold text-purple-700 mt-1">
                  {formatCurrency(summary.refunded_amount)}
                </p>
                <p className="text-[11px] text-[#7A5C4A] mt-1">
                  {summary.refunded_count} marked REFUNDED
                </p>
              </div>
            </div>

            {summary.refund_data_note && (
              <div className="px-4 py-2.5 bg-[#FAF7F2] border border-[#E8DED2] rounded-sm text-[11px] text-[#7A5C4A]">
                <strong className="text-[#2C2C2C]">Refund Tracking Note:</strong>{' '}
                {summary.refund_data_note}
              </div>
            )}
          </div>
        )}

        {/* Filters & Search */}
        <form
          onSubmit={handleSearchSubmit}
          className="p-4 bg-white rounded-sm border border-[#E8DED2] space-y-3"
        >
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setPaymentStatus(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                  paymentStatus === tab.value
                    ? 'bg-[#2C2C2C] text-white'
                    : 'bg-[#FAF7F2] text-[#4A3728] border border-[#E8DED2] hover:border-[#C0522B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                Search Order / Customer / Razorpay ID
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Order #, email, pay_..., order_..."
                className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-semibold text-[#7A5C4A] border border-[#E8DED2] rounded-sm hover:bg-[#FAF7F2] cursor-pointer"
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2C2C2C] rounded-sm hover:bg-[#C0522B] transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadPayments}
              className="underline font-semibold ml-3 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-[#7A5C4A]">
              Loading payment records...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-[#2C2C2C]">No payment records found</p>
              <p className="text-xs text-[#7A5C4A]">
                Try adjusting your payment status filter, date range, or search query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DED2] text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                    <th className="py-3 px-4">Order &amp; Timestamp</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Razorpay References</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE3] text-xs">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/admin/payments/${p.order_number}`}
                          className="font-bold text-[#2C2C2C] hover:text-[#C0522B]"
                        >
                          {p.order_number}
                        </Link>
                        <div className="text-[11px] text-[#7A5C4A] mt-0.5">
                          {new Date(p.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#2C2C2C]">
                          {p.customer?.full_name || 'Guest'}
                        </div>
                        <div className="text-[11px] text-[#7A5C4A]">{p.customer?.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#2C2C2C]">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${getPaymentStatusBadge(
                            p.payment_status
                          )}`}
                        >
                          {p.payment_status}
                        </span>
                        {p.is_order_cancelled && p.payment_status === 'PAID' && (
                          <span className="block text-[10px] text-amber-800 mt-1 font-medium">
                            Order Cancelled · Awaiting Refund Confirmation
                          </span>
                        )}
                        {p.is_order_cancelled &&
                          p.payment_status !== 'PAID' &&
                          p.payment_status !== 'REFUNDED' && (
                            <span className="block text-[10px] text-red-700 mt-1 font-medium">
                              Order Cancelled · Unpaid
                            </span>
                          )}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-[#4A3728] space-y-0.5">
                        <div>
                          <span className="text-[#7A5C4A]">Ord:</span>{' '}
                          <code>{p.razorpay_order_id || '—'}</code>
                        </div>
                        <div>
                          <span className="text-[#7A5C4A]">Pay:</span>{' '}
                          <code>{p.razorpay_payment_id || '—'}</code>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.signature_verified ? (
                          <span className="text-[11px] font-semibold text-emerald-700">
                            Verified
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#7A5C4A]">Unverified</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/admin/payments/${p.order_number}`}
                          className="inline-block px-3 py-1.5 text-[11px] font-semibold text-[#2C2C2C] border border-[#E8DED2] rounded-sm hover:border-[#C0522B] hover:text-[#C0522B] transition-colors"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-4 py-3 bg-[#FAF7F2] border-t border-[#E8DED2] flex items-center justify-between text-xs">
              <span className="text-[#7A5C4A]">
                Page <strong className="text-[#2C2C2C]">{page}</strong> of{' '}
                <strong className="text-[#2C2C2C]">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-[#E8DED2] bg-white rounded-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:border-[#C0522B]"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 border border-[#E8DED2] bg-white rounded-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:border-[#C0522B]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
