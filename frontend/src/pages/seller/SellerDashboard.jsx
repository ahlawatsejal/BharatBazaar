import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { sellerService } from '../../services/sellerService';
import SellerLayout from '../../components/seller/SellerLayout';
import SellerStatCard from '../../components/seller/SellerStatCard';

export default function SellerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await sellerService.getDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load seller dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadDashboard();
    });
    return () => {
      active = false;
    };
  }, []);

  const stats = data?.stats || {
    total_products: 0,
    active_products: 0,
    out_of_stock_products: 0,
    total_orders: 0,
    pending_orders: 0,
    delivered_orders: 0,
    total_sales: '0.00',
  };

  const store = data?.store || user?.seller_profile || {};
  const recentOrders = data?.recent_orders || [];
  const bestSellers = data?.best_selling_products || [];

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* Error notification banner */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <div>
              <strong className="block font-semibold">Dashboard Sync Notice</strong>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              className="text-xs font-bold underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── A. Welcome Section ── */}
        <div className="p-6 sm:p-8 rounded-sm bg-white border border-[#E8DED2] shadow-xs relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C0522B]">
                  Artisan Studio Dashboard
                </span>
                <span className="text-[#D6CCC2]">•</span>
                <span className="text-[11px] text-[#7A5C4A]">
                  {store.craft_category || 'Handcrafted Heritage'}
                </span>
              </div>

              <h1
                className="text-2xl sm:text-3xl font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Namaste, {user?.first_name || 'Artisan Partner'}
              </h1>

              <p className="text-xs text-[#7A5C4A] mt-1.5 max-w-xl leading-relaxed">
                Welcome to your creator workshop at <strong>{store.store_name || 'BharatBazaar'}</strong>.
                {stats.total_products === 0
                  ? ' Your storefront is approved. Start by listing your handmade creations to connect with patrons across India.'
                  : ` Your store currently has ${stats.active_products} active creations available for pan-India discovery.`}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/seller/products"
                className="px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:opacity-90 transition-opacity cursor-pointer text-center"
                style={{ background: '#C0522B' }}
              >
                + Add Product
              </Link>
              <Link
                to="/seller/store"
                className="px-3.5 py-2 rounded-sm text-xs font-semibold text-[#4A3728] border border-[#D6CCC2] hover:bg-[#FAF7F2] transition-colors text-center"
              >
                Storefront Info
              </Link>
            </div>
          </div>
        </div>

        {/* ── B. Statistics Cards Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SellerStatCard
            title="Total Products"
            value={loading ? '...' : stats.total_products}
            subtext={`${stats.active_products} active in shop • ${stats.out_of_stock_products} sold out`}
            highlightColor="#C0522B"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />

          <SellerStatCard
            title="Total Orders"
            value={loading ? '...' : stats.total_orders}
            subtext={`${stats.delivered_orders} consignments fulfilled`}
            highlightColor="#C9962A"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />

          <SellerStatCard
            title="Pending Orders"
            value={loading ? '...' : stats.pending_orders}
            subtext={stats.pending_orders > 0 ? 'Fulfillment action required' : 'All consignments dispatched'}
            highlightColor={stats.pending_orders > 0 ? '#C0522B' : '#2D8A4E'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <SellerStatCard
            title="Total Gross Sales"
            value={loading ? '...' : `₹${Number(stats.total_sales).toLocaleString('en-IN')}`}
            subtext="From verified paid orders"
            highlightColor="#2D8A4E"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* ── Main Content Split: Recent Orders (8 Cols) & Actions/Best Sellers (4 Cols) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Recent Orders (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 rounded-sm bg-white border border-[#E8DED2] shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F0EBE3]">
                <div>
                  <h2
                    className="text-base font-bold text-[#2C2C2C]"
                    style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                  >
                    Recent Patron Consignments
                  </h2>
                  <p className="text-xs text-[#7A5C4A] mt-0.5">
                    Orders containing items crafted by your studio.
                  </p>
                </div>

                <Link
                  to="/seller/orders"
                  className="text-xs font-semibold text-[#C0522B] hover:underline"
                >
                  View All Orders →
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-[#C0522B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[#7A5C4A]">Fetching order consignments...</p>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="py-10 text-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: '#FFF8F0', border: '1px solid #E8DED2' }}
                  >
                    <span className="text-xl">📦</span>
                  </div>
                  <h3
                    className="text-sm font-semibold text-[#2C2C2C]"
                    style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                  >
                    No Consignments Yet
                  </h3>
                  <p className="text-xs text-[#7A5C4A] mt-1 max-w-sm mx-auto">
                    As soon as patrons purchase your handcrafted articles from the marketplace,
                    incoming orders will appear here.
                  </p>
                  <Link
                    to="/seller/products"
                    className="inline-block mt-4 text-xs font-semibold text-[#C0522B] hover:underline"
                  >
                    Manage Product Catalog →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#F0EBE3]">
                  {recentOrders.map((ord) => (
                    <div key={ord.order_number} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2C2C2C]">
                            #{ord.order_number}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              ord.order_status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.order_status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.order_status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7A5C4A] mt-0.5">
                          Patron: <strong className="text-[#4A3728]">{ord.customer_name}</strong> •{' '}
                          {new Date(ord.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-[11px] text-[#8C7665] mt-0.5">
                          {ord.items_count} item{ord.items_count === 1 ? '' : 's'} for this studio
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className="text-sm font-bold block"
                          style={{ color: '#C0522B', fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                        >
                          ₹{Number(ord.seller_subtotal).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-[#7A5C4A] uppercase tracking-wider">
                          Studio Portion
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Best Sellers & Quick Actions (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Actions Card */}
            <div className="p-5 rounded-sm bg-white border border-[#E8DED2] shadow-xs">
              <h3
                className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] mb-3 pb-2 border-b border-[#F0EBE3]"
              >
                Studio Quick Actions
              </h3>

              <div className="space-y-2">
                <Link
                  to="/seller/products"
                  className="flex items-center justify-between p-2.5 rounded-sm text-xs font-semibold text-[#4A3728] hover:bg-[#FAF7F2] hover:text-[#C0522B] transition-colors border border-transparent hover:border-[#E8DED2]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#C0522B]">📦</span>
                    <span>Add New Craft Product</span>
                  </div>
                  <span className="text-[10px] text-[#8C7665]">Step 8.2</span>
                </Link>

                <Link
                  to="/seller/inventory"
                  className="flex items-center justify-between p-2.5 rounded-sm text-xs font-semibold text-[#4A3728] hover:bg-[#FAF7F2] hover:text-[#C0522B] transition-colors border border-transparent hover:border-[#E8DED2]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#C9962A]">📊</span>
                    <span>Manage Stock & Inventory</span>
                  </div>
                  <span className="text-[10px] text-[#8C7665]">Upcoming</span>
                </Link>

                <Link
                  to="/seller/orders"
                  className="flex items-center justify-between p-2.5 rounded-sm text-xs font-semibold text-[#4A3728] hover:bg-[#FAF7F2] hover:text-[#C0522B] transition-colors border border-transparent hover:border-[#E8DED2]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700">🚚</span>
                    <span>Consignment Dispatches</span>
                  </div>
                  <span className="text-[10px] text-[#8C7665]">Upcoming</span>
                </Link>

                <Link
                  to="/seller/store"
                  className="flex items-center justify-between p-2.5 rounded-sm text-xs font-semibold text-[#4A3728] hover:bg-[#FAF7F2] hover:text-[#C0522B] transition-colors border border-transparent hover:border-[#E8DED2]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-purple-700">🏪</span>
                    <span>Edit Storefront Profile</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">Active</span>
                </Link>
              </div>
            </div>

            {/* Product Performance (Best Sellers) */}
            <div className="p-5 rounded-sm bg-white border border-[#E8DED2] shadow-xs">
              <h3
                className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] mb-3 pb-2 border-b border-[#F0EBE3]"
              >
                Top Performing Crafts
              </h3>

              {loading ? (
                <p className="text-xs text-[#7A5C4A]">Analyzing sales data...</p>
              ) : bestSellers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-[#7A5C4A] leading-relaxed">
                    No sales data recorded yet. Top-performing handicrafts will appear here ranked by volume and revenue.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bestSellers.map((item, idx) => (
                    <div key={item.product_id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#FAF7F2] text-[#C0522B] font-bold text-[10px] flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-[#2C2C2C] truncate">
                          {item.product_name}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="font-bold text-[#C0522B]">
                          ₹{Number(item.total_revenue).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-[#7A5C4A] block">
                          {item.units_sold} sold
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
