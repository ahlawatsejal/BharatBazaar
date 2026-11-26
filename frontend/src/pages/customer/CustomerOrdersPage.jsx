import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../components/customer/CustomerLayout';
import { orderService } from '../../services/orderService';
import { CRAFT_FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All Orders' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Dispatched' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  useEffect(() => {
    let isMounted = true;
    orderService
      .getOrderHistory()
      .then((data) => {
        if (isMounted) {
          setOrders(Array.isArray(data) ? data : data.results || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Could not load your order history.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (selectedFilter === 'ALL') return true;
    return o.order_status === selectedFilter;
  });

  return (
    <CustomerLayout
      title="My Orders"
      subtitle="View and track your handcrafted artisan shipments across India."
    >
      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-[#EBE4DA]">
        {STATUS_FILTERS.map((f) => {
          const isActive = selectedFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setSelectedFilter(f.key)}
              style={{
                fontFamily: 'var(--font-sans)',
                background: isActive ? 'var(--burgundy)' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : 'var(--brown-dark)',
                borderColor: isActive ? 'var(--burgundy)' : '#D6CCC2',
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors cursor-pointer"
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4 max-w-4xl">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-6 bg-white border border-[#EBE4DA] rounded-sm animate-pulse h-28" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white border border-[#EBE4DA] rounded-sm text-xs text-rose-800">
          <p>{error}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          className="p-12 text-center bg-white border border-[#EBE4DA] rounded-sm text-xs"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center bg-[#FAF4ED] text-[var(--burgundy)]">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="font-serif text-lg font-semibold text-[var(--brown-dark)] mb-1">
            No Orders Found
          </h3>
          <p className="text-[var(--brown-mid)] max-w-xs mx-auto mb-6">
            {selectedFilter === 'ALL'
              ? 'You have not placed any orders yet on BharatBazaar.'
              : `You have no orders currently in "${selectedFilter}" status.`}
          </p>
          <Link to="/shop" className="btn-primary text-xs py-2.5 px-6 inline-block">
            Explore Crafts
          </Link>
        </div>
      ) : (
        <div className="space-y-4" style={{ fontFamily: 'var(--font-sans)' }}>
          {filteredOrders.map((order) => {
            const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const items = order.items || [];

            return (
              <div
                key={order.order_number}
                className="bg-white border border-[#EBE4DA] rounded-sm overflow-hidden"
              >
                {/* Header Row */}
                <div className="p-4 bg-[#FFFDFB] border-b border-[#EBE4DA] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-[10px] text-[var(--brown-light)] block uppercase">
                        Order Placed
                      </span>
                      <span className="font-semibold text-[var(--brown-dark)]">{dateStr}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[var(--brown-light)] block uppercase">
                        Total Amount
                      </span>
                      <span className="font-serif font-bold text-[var(--brown-dark)]">
                        ₹{Number(order.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[var(--brown-light)] block uppercase">
                        Reference
                      </span>
                      <span className="font-mono font-bold text-[var(--brown-dark)]">
                        {order.order_number}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider ${
                        order.order_status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : order.order_status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-[#FAF4ED] text-[var(--burgundy)] border border-[#EBE4DA]'
                      }`}
                    >
                      {order.order_status}
                    </span>
                    <Link
                      to={`/customer/orders/${order.order_number}`}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      View Details
                    </Link>
                  </div>
                </div>

                {/* Items preview */}
                <div className="p-4 divide-y divide-[#EBE4DA]">
                  {items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.primary_image || CRAFT_FALLBACK_IMAGE}
                          alt={item.product_name}
                          className="w-12 h-12 object-cover rounded-sm border border-[#EBE4DA] flex-shrink-0"
                          onError={(e) => handleImageError(e)}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--brown-dark)] truncate">{item.product_name}</p>
                          <p className="text-[11px] text-[var(--brown-light)]">
                            Maker: {item.seller_name || 'Artisan Workshop'} · Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <span className="font-serif font-bold text-[var(--brown-dark)]">
                        ₹{Number(item.line_total).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CustomerLayout>
  );
}
