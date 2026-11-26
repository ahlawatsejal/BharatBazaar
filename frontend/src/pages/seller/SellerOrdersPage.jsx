import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SellerLayout from '../../components/seller/SellerLayout';
import SellerStatCard from '../../components/seller/SellerStatCard';
import { sellerService } from '../../services/sellerService';

const FULFILLMENT_BADGES = {
  NEW: { label: 'New Order', bg: 'bg-blue-100', text: 'text-blue-800' },
  ACCEPTED: { label: 'Accepted', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  PROCESSING: { label: 'Processing', bg: 'bg-amber-100', text: 'text-amber-800' },
  READY_TO_DISPATCH: { label: 'Ready to Dispatch', bg: 'bg-purple-100', text: 'text-purple-800' },
  SHIPPED: { label: 'Shipped', bg: 'bg-cyan-100', text: 'text-cyan-800' },
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-800' },
};

const PAYMENT_BADGES = {
  PAID: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  PENDING: { label: 'Unpaid', bg: 'bg-amber-50', text: 'text-amber-700' },
  FAILED: { label: 'Failed', bg: 'bg-red-50', text: 'text-red-700' },
  REFUNDED: { label: 'Refunded', bg: 'bg-blue-50', text: 'text-blue-700' },
};

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    total_orders: 0,
    new_orders: 0,
    processing_orders: 0,
    dispatched_orders: 0,
    delivered_orders: 0,
    cancelled_orders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [ordersData, summaryData] = await Promise.all([
        sellerService.getOrders({
          search,
          status: statusFilter,
          payment_status: paymentFilter,
          date_from: dateFrom,
          date_to: dateTo,
        }),
        sellerService.getOrderSummary(),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      if (summaryData) setSummary(summaryData);
    } catch (err) {
      setError(err.message || 'Failed to load seller orders.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, dateFrom, dateTo]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadData();
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  return (
    <SellerLayout
      title="Orders & Consignments"
      subtitle="Manage incoming patron orders, transition fulfillment stages, and record courier tracking details."
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadData} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SellerStatCard
            title="Total Orders"
            value={loading ? '...' : summary.total_orders}
            subtext="All consignments"
            highlightColor="#2C2C2C"
            icon={<span className="text-sm font-bold">#</span>}
          />
          <SellerStatCard
            title="New Action"
            value={loading ? '...' : summary.new_orders}
            subtext="Awaiting accept"
            highlightColor="#2563EB"
            icon={<span className="text-sm">✦</span>}
          />
          <SellerStatCard
            title="Processing"
            value={loading ? '...' : summary.processing_orders}
            subtext="In workshop"
            highlightColor="#C9962A"
            icon={<span className="text-sm">⚙</span>}
          />
          <SellerStatCard
            title="Dispatched"
            value={loading ? '...' : summary.dispatched_orders}
            subtext="In transit"
            highlightColor="#0891B2"
            icon={<span className="text-sm">🚚</span>}
          />
          <SellerStatCard
            title="Delivered"
            value={loading ? '...' : summary.delivered_orders}
            subtext="Completed"
            highlightColor="#2D8A4E"
            icon={<span className="text-sm">✓</span>}
          />
          <SellerStatCard
            title="Cancelled"
            value={loading ? '...' : summary.cancelled_orders}
            subtext="Halted"
            highlightColor="#C0522B"
            icon={<span className="text-sm">✕</span>}
          />
        </div>

        {/* ── Filters & Search ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-sm border border-[#E8DED2]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # (e.g. BB-ORD...)"
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[#C0522B]"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[#C0522B]"
          >
            <option value="ALL">All Fulfillment Statuses</option>
            <option value="NEW">New Order</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PROCESSING">Processing</option>
            <option value="READY_TO_DISPATCH">Ready to Dispatch</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[#C0522B]"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Unpaid / Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From Date"
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[#C0522B]"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="To Date"
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[#C0522B]"
          />
        </div>

        {/* ── Orders Table ── */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div className="w-7 h-7 border-2 border-[#C0522B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#7A5C4A]">Fetching artisan consignments...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#FFF8F0', border: '1px solid #E8DED2' }}
            >
              <span className="text-2xl">📦</span>
            </div>
            <h3
              className="text-base font-bold text-[#2C2C2C]"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              No Orders Found
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1 max-w-md mx-auto">
              {search || statusFilter !== 'ALL' || paymentFilter !== 'ALL' || dateFrom || dateTo
                ? 'No orders match your current filter criteria.'
                : 'When patrons purchase your handcrafted products, their consignments will appear here.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-sm border border-[#E8DED2] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F0EBE3] bg-[#FAF7F2] text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Patron</th>
                  <th className="py-3 px-4">Your Items</th>
                  <th className="py-3 px-4">Subtotal</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Fulfillment</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3] text-xs">
                {orders.map((ord) => {
                  const fBadge =
                    FULFILLMENT_BADGES[ord.seller_fulfillment_status] || FULFILLMENT_BADGES.NEW;
                  const pBadge = PAYMENT_BADGES[ord.payment_status] || PAYMENT_BADGES.PENDING;
                  return (
                    <tr key={ord.order_number} className="hover:bg-[#FDFBF9]">
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#2C2C2C]">
                        #{ord.order_number}
                      </td>
                      <td className="py-3.5 px-4 text-[#7A5C4A] whitespace-nowrap">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#2C2C2C]">{ord.customer_name}</p>
                        {(ord.shipping_city || ord.shipping_state) && (
                          <p className="text-[11px] text-[#7A5C4A]">
                            {[ord.shipping_city, ord.shipping_state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-[#2C2C2C] font-medium line-clamp-1">
                          {ord.items?.[0]?.product_name || 'Artisan Item'}
                          {ord.items_count > 1 ? ` +${ord.items_count - 1} more` : ''}
                        </p>
                        <p className="text-[11px] text-[#7A5C4A]">{ord.total_units} unit(s)</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#C0522B]">
                        ₹{Number(ord.seller_subtotal).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${pBadge.bg} ${pBadge.text}`}
                        >
                          {pBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${fBadge.bg} ${fBadge.text}`}
                        >
                          {fBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/seller/orders/${ord.order_number}`}
                          className="px-3 py-1.5 rounded-sm text-[11px] font-semibold text-white inline-block"
                          style={{ background: '#C0522B' }}
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
