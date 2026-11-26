import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { adminService } from '../../services/adminService';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminStatCard from '../../components/admin/AdminStatCard';

const STATUS_BADGE = {
  APPROVED: 'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-stone-200 text-stone-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getDashboardSummary();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadSummary();
    });
    return () => {
      active = false;
    };
  }, []);

  const stats = data?.stats || {
    total_customers: 0,
    total_sellers: 0,
    pending_sellers: 0,
    approved_sellers: 0,
    rejected_sellers: 0,
    suspended_sellers: 0,
    total_products: 0,
    pending_products: 0,
    approved_products: 0,
    rejected_products: 0,
    total_orders: 0,
    paid_orders: 0,
    total_paid_order_value: '0.00',
  };

  const recentSellers = data?.recent_sellers || [];
  const recentOrders = data?.recent_orders || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadSummary} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ── Welcome Header ── */}
        <div className="p-6 sm:p-8 rounded-sm bg-white border border-[#E8DED2] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C0522B]">
              Marketplace Governance
            </span>
            <h1
              className="text-2xl sm:text-3xl font-bold text-[#2C2C2C] mt-1"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              Namaste, {user?.first_name || 'Administrator'}
            </h1>
            <p className="text-xs text-[#7A5C4A] mt-1.5 max-w-xl leading-relaxed">
              Real-time platform oversight across registered patrons, artisan storefronts,
              catalogue approvals, and verified marketplace transactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/admin/sellers"
              className="px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-white cursor-pointer"
              style={{ background: '#C0522B' }}
            >
              Review Sellers ({stats.pending_sellers})
            </Link>
            <Link
              to="/admin/products"
              className="px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-white cursor-pointer"
              style={{ background: '#2C2C2C' }}
            >
              Review Products ({stats.pending_products})
            </Link>
          </div>
        </div>

        {/* ── Primary KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            title="Registered Patrons"
            value={loading ? '...' : stats.total_customers}
            subtext="Customer accounts"
            accentColor="#2C2C2C"
            icon={<span className="text-base">👥</span>}
          />
          <AdminStatCard
            title="Artisan Sellers"
            value={loading ? '...' : stats.total_sellers}
            subtext={`${stats.approved_sellers} approved • ${stats.pending_sellers} pending`}
            accentColor="#C0522B"
            icon={<span className="text-base">🏪</span>}
          />
          <AdminStatCard
            title="Catalog Products"
            value={loading ? '...' : stats.total_products}
            subtext={`${stats.approved_products} live • ${stats.pending_products} pending`}
            accentColor="#C9962A"
            icon={<span className="text-base">🏺</span>}
          />
          <AdminStatCard
            title="Verified Paid Sales"
            value={loading ? '...' : `₹${Number(stats.total_paid_order_value).toLocaleString('en-IN')}`}
            subtext={`${stats.paid_orders} paid / ${stats.total_orders} total orders`}
            accentColor="#2D8A4E"
            icon={<span className="text-base font-bold">₹</span>}
          />
        </div>

        {/* ── Moderation & Approval Queues Breakdown ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-white rounded-sm border border-[#E8DED2]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
              <h2
                className="text-sm font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Seller Application Breakdown
              </h2>
              <Link to="/admin/sellers" className="text-xs font-semibold text-[#C0522B] hover:underline">
                Manage Sellers →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-sm bg-amber-50 border border-amber-200">
                <p className="text-lg font-bold text-amber-800">{loading ? '...' : stats.pending_sellers}</p>
                <p className="text-[10px] font-bold uppercase text-amber-700">Pending</p>
              </div>
              <div className="p-3 rounded-sm bg-emerald-50 border border-emerald-200">
                <p className="text-lg font-bold text-emerald-800">{loading ? '...' : stats.approved_sellers}</p>
                <p className="text-[10px] font-bold uppercase text-emerald-700">Approved</p>
              </div>
              <div className="p-3 rounded-sm bg-red-50 border border-red-200">
                <p className="text-lg font-bold text-red-800">{loading ? '...' : stats.rejected_sellers}</p>
                <p className="text-[10px] font-bold uppercase text-red-700">Rejected</p>
              </div>
              <div className="p-3 rounded-sm bg-stone-100 border border-stone-200">
                <p className="text-lg font-bold text-stone-800">{loading ? '...' : stats.suspended_sellers}</p>
                <p className="text-[10px] font-bold uppercase text-stone-700">Suspended</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white rounded-sm border border-[#E8DED2]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
              <h2
                className="text-sm font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Product Moderation Breakdown
              </h2>
              <Link to="/admin/products" className="text-xs font-semibold text-[#C0522B] hover:underline">
                Manage Products →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-sm bg-amber-50 border border-amber-200">
                <p className="text-lg font-bold text-amber-800">{loading ? '...' : stats.pending_products}</p>
                <p className="text-[10px] font-bold uppercase text-amber-700">Pending</p>
              </div>
              <div className="p-3 rounded-sm bg-emerald-50 border border-emerald-200">
                <p className="text-lg font-bold text-emerald-800">{loading ? '...' : stats.approved_products}</p>
                <p className="text-[10px] font-bold uppercase text-emerald-700">Approved</p>
              </div>
              <div className="p-3 rounded-sm bg-red-50 border border-red-200">
                <p className="text-lg font-bold text-red-800">{loading ? '...' : stats.rejected_products}</p>
                <p className="text-[10px] font-bold uppercase text-red-700">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Seller Registrations & Recent Orders ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sellers */}
          <div className="p-5 bg-white rounded-sm border border-[#E8DED2]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
              <h2
                className="text-sm font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Recent Seller Applications
              </h2>
              <Link to="/admin/sellers" className="text-xs font-semibold text-[#C0522B] hover:underline">
                View All →
              </Link>
            </div>

            {loading ? (
              <p className="text-xs text-[#7A5C4A] py-6 text-center">Loading seller registrations...</p>
            ) : recentSellers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7A5C4A]">
                No artisan seller registrations found yet.
              </div>
            ) : (
              <div className="divide-y divide-[#F0EBE3]">
                {recentSellers.map((s) => (
                  <div key={s.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#2C2C2C] truncate">{s.store_name}</p>
                      <p className="text-[11px] text-[#7A5C4A]">
                        {s.craft_category} • {s.city}, {s.state}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                        STATUS_BADGE[s.application_status] || 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {s.application_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="p-5 bg-white rounded-sm border border-[#E8DED2]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
              <h2
                className="text-sm font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Recent Marketplace Orders
              </h2>
              <Link to="/admin/orders" className="text-xs font-semibold text-[#C0522B] hover:underline">
                View All →
              </Link>
            </div>

            {loading ? (
              <p className="text-xs text-[#7A5C4A] py-6 text-center">Loading recent orders...</p>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7A5C4A]">
                No customer orders have been placed on the platform yet.
              </div>
            ) : (
              <div className="divide-y divide-[#F0EBE3]">
                {recentOrders.map((o) => (
                  <div
                    key={o.order_number}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-mono font-semibold text-[#2C2C2C]">#{o.order_number}</p>
                      <p className="text-[11px] text-[#7A5C4A]">
                        {new Date(o.created_at).toLocaleDateString('en-IN')} • {o.order_status}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[#C0522B]">
                        ₹{Number(o.total_amount).toLocaleString('en-IN')}
                      </p>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          STATUS_BADGE[o.payment_status] || 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.payment_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
