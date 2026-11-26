import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

const ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Order Statuses' },
  { value: 'PENDING', label: 'Pending Payment' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Payments' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

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

export default function AdminOrdersPage() {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [orderStatus, setOrderStatus] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sellerInput, setSellerInput] = useState('');
  const [sellerQuery, setSellerQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    try {
      const data = await adminService.getOrdersSummary();
      setSummary(data);
    } catch {
      // Non-blocking; main list error will surface if backend is down
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getOrders({
        orderStatus,
        paymentStatus,
        dateFrom,
        dateTo,
        seller: sellerQuery,
        search: searchQuery,
        page,
        pageSize,
      });
      setOrders(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load marketplace orders.');
    } finally {
      setLoading(false);
    }
  }, [orderStatus, paymentStatus, dateFrom, dateTo, sellerQuery, searchQuery, page]);

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
      if (active) loadOrders();
    });
    return () => {
      active = false;
    };
  }, [loadOrders]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
    setSellerQuery(sellerInput.trim());
  };

  const handleClearFilters = () => {
    setOrderStatus('ALL');
    setPaymentStatus('ALL');
    setDateFrom('');
    setDateTo('');
    setSellerInput('');
    setSellerQuery('');
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
              Marketplace Oversight
            </span>
            <h1
              className="text-2xl font-bold text-[#2C2C2C] mt-1"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              Order Management
            </h1>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Read-only platform-wide visibility into multi-vendor orders, payments, and seller fulfillment progress.
            </p>
          </div>
          <div className="text-xs font-semibold text-[#7A5C4A] bg-[#FAF7F2] px-3 py-2 rounded-sm border border-[#E8DED2]">
            {totalCount} {totalCount === 1 ? 'order' : 'orders'} matched
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                Total Orders
              </p>
              <p className="text-2xl font-bold text-[#2C2C2C] mt-1">{summary.total_orders}</p>
              <p className="text-[11px] text-[#7A5C4A] mt-1">
                {summary.paid_orders} paid · {summary.pending_payment_orders} pending
              </p>
            </div>

            <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                Paid Order Value
              </p>
              <p className="text-2xl font-bold text-[#C0522B] mt-1">
                {formatCurrency(summary.total_paid_gmv)}
              </p>
              <p className="text-[11px] text-[#7A5C4A] mt-1">Verified paid orders only</p>
            </div>

            <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                In Fulfillment
              </p>
              <p className="text-2xl font-bold text-[#2C2C2C] mt-1">
                {(summary.confirmed_orders || 0) +
                  (summary.processing_orders || 0) +
                  (summary.shipped_orders || 0)}
              </p>
              <p className="text-[11px] text-[#7A5C4A] mt-1">
                {summary.shipped_orders} shipped · {summary.delivered_orders} delivered
              </p>
            </div>

            <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                Cancelled / Refunded
              </p>
              <p className="text-2xl font-bold text-[#2C2C2C] mt-1">
                {summary.cancelled_orders}
              </p>
              <p className="text-[11px] text-[#7A5C4A] mt-1">
                {summary.refunded_orders} refunded · {summary.failed_orders} failed
              </p>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <form
          onSubmit={handleFilterSubmit}
          className="p-4 bg-white rounded-sm border border-[#E8DED2] space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Order #, customer, email..."
                className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                Seller / Store
              </label>
              <input
                type="text"
                value={sellerInput}
                onChange={(e) => setSellerInput(e.target.value)}
                placeholder="Store name or seller ID..."
                className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                Order Status
              </label>
              <select
                value={orderStatus}
                onChange={(e) => {
                  setOrderStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-white focus:outline-none focus:border-[#C0522B]"
              >
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-white focus:outline-none focus:border-[#C0522B]"
              >
                {PAYMENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-1.5 text-xs font-semibold text-[#7A5C4A] border border-[#E8DED2] rounded-sm hover:bg-[#FAF7F2] cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2C2C2C] rounded-sm hover:bg-[#C0522B] transition-colors cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadOrders}
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
              Loading platform orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-[#2C2C2C]">No orders found</p>
              <p className="text-xs text-[#7A5C4A]">
                Try adjusting your search query, status filters, or date range.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DED2] text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                    <th className="py-3 px-4">Order &amp; Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items / Sellers</th>
                    <th className="py-3 px-4">Order Total</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Parent Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE3] text-xs">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/admin/orders/${ord.order_number}`}
                          className="font-bold text-[#2C2C2C] hover:text-[#C0522B]"
                        >
                          {ord.order_number}
                        </Link>
                        <div className="text-[11px] text-[#7A5C4A] mt-0.5">
                          {new Date(ord.created_at).toLocaleString('en-IN', {
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
                          {ord.customer?.full_name || 'Guest'}
                        </div>
                        <div className="text-[11px] text-[#7A5C4A]">{ord.customer?.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#4A3728]">
                        <span className="font-semibold">{ord.item_count}</span>{' '}
                        {ord.item_count === 1 ? 'item' : 'items'}
                        <span className="text-[11px] text-[#7A5C4A] block">
                          {ord.seller_count} {ord.seller_count === 1 ? 'artisan store' : 'artisan stores'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#2C2C2C]">
                        {formatCurrency(ord.total_amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${getPaymentStatusBadge(
                            ord.payment_status
                          )}`}
                        >
                          {ord.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${getOrderStatusBadge(
                            ord.order_status
                          )}`}
                        >
                          {ord.order_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/admin/orders/${ord.order_number}`}
                          className="inline-block px-3 py-1.5 text-[11px] font-semibold text-[#2C2C2C] border border-[#E8DED2] rounded-sm hover:border-[#C0522B] hover:text-[#C0522B] transition-colors"
                        >
                          Inspect
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
