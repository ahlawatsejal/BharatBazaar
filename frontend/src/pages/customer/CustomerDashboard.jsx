import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../components/customer/CustomerLayout';
import DashboardStatCard from '../../components/customer/DashboardStatCard';
import ProductCard from '../../components/common/ProductCard';
import { customerService } from '../../services/customerService';

export default function CustomerDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    customerService
      .getDashboardSummary()
      .then((data) => {
        if (isMounted) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Dashboard summary error:', err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = summary?.stats || {};
  const recentOrders = summary?.recent_orders || [];
  const recommended = summary?.recommended_products || [];
  const customerName = summary?.customer?.name || 'Patron';

  return (
    <CustomerLayout
      title={`Namaste, ${customerName}`}
      subtitle="Welcome to your personal BharatBazaar artisan patron account."
    >
      {/* ── Metric Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardStatCard
          title="Total Orders"
          value={loading ? '...' : stats.total_orders || 0}
          helper="Lifetime purchases"
          linkTo="/customer/orders"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />

        <DashboardStatCard
          title="In Transit"
          value={loading ? '...' : stats.pending_deliveries || 0}
          helper="Dispatched & in progress"
          linkTo="/customer/orders"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          }
        />

        <DashboardStatCard
          title="Wishlist"
          value={loading ? '...' : stats.wishlist_count || 0}
          helper="Saved craft articles"
          linkTo="/customer/wishlist"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
        />

        <DashboardStatCard
          title="Delivered"
          value={loading ? '...' : stats.delivered_orders || 0}
          helper="Artisan items received"
          linkTo="/customer/orders"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ── Quick Action Shortcuts ── */}
      <div
        className="p-5 bg-white border border-[#EBE4DA] rounded-sm mb-8 flex flex-wrap items-center justify-between gap-4"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        <div>
          <h2 className="font-serif text-base font-semibold text-[var(--brown-dark)]">
            Quick Actions
          </h2>
          <p className="text-xs text-[var(--brown-mid)]">
            Explore newly verified artisan clusters or view your active shipments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/shop" className="btn-primary text-xs py-2 px-4">
            Explore Marketplace
          </Link>
          <Link
            to="/customer/orders"
            className="px-4 py-2 border border-[#D6CCC2] text-xs font-semibold rounded-sm text-[var(--brown-dark)] hover:border-[var(--burgundy)]"
          >
            Track Orders
          </Link>
          <Link
            to="/customer/wishlist"
            className="px-4 py-2 border border-[#D6CCC2] text-xs font-semibold rounded-sm text-[var(--brown-dark)] hover:border-[var(--burgundy)]"
          >
            View Wishlist
          </Link>
        </div>
      </div>

      {/* ── Recent Orders Section ── */}
      <section className="mb-10" style={{ fontFamily: 'var(--font-sans)' }}>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EBE4DA]">
          <h2 className="font-serif text-lg font-semibold text-[var(--brown-dark)]">
            Recent Orders
          </h2>
          <Link
            to="/customer/orders"
            className="text-xs font-bold text-[var(--burgundy)] uppercase tracking-wider hover:underline"
          >
            View All Orders →
          </Link>
        </div>

        {loading ? (
          <div className="h-32 bg-white rounded-sm border border-[#EBE4DA] animate-pulse" />
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-sm border border-[#EBE4DA] text-xs text-[var(--brown-mid)]">
            <p className="mb-3">You have not placed any orders yet.</p>
            <Link to="/shop" className="btn-primary text-xs py-2 px-6 inline-block">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={order.order_number}
                  className="p-4 bg-white border border-[#EBE4DA] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-[var(--brown-dark)]">
                        {order.order_number}
                      </span>
                      <span className="text-[var(--brown-light)]">· {orderDate}</span>
                    </div>
                    <p className="text-[var(--brown-mid)]">
                      {order.items?.length || 0} handcrafted items · Total:{' '}
                      <strong className="text-[var(--brown-dark)]">
                        ₹{Number(order.total_amount).toLocaleString('en-IN')}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        order.order_status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-800'
                          : order.order_status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-800'
                          : 'bg-[#FAF6F2] text-[var(--burgundy)]'
                      }`}
                    >
                      {order.order_status}
                    </span>

                    <Link
                      to={`/customer/orders/${order.order_number}`}
                      className="text-xs font-bold text-[var(--burgundy)] hover:underline"
                    >
                      Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Recommended Crafts ── */}
      {recommended.length > 0 && (
        <section style={{ fontFamily: 'var(--font-sans)' }}>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EBE4DA]">
            <div>
              <h2 className="font-serif text-lg font-semibold text-[var(--brown-dark)]">
                Recommended For You
              </h2>
              <p className="text-xs text-[var(--brown-light)]">
                Handpicked creations from India's master artisans
              </p>
            </div>
            <Link
              to="/shop"
              className="text-xs font-bold text-[var(--burgundy)] uppercase tracking-wider hover:underline"
            >
              Explore All →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommended.map((prod) => (
              <ProductCard key={prod.id || prod.slug} product={prod} />
            ))}
          </div>
        </section>
      )}
    </CustomerLayout>
  );
}
