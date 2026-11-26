import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SellerLayout from '../../components/seller/SellerLayout';
import { sellerService } from '../../services/sellerService';

export default function SellerNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'unread' | 'read'

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await sellerService.getNotifications({ status: filterStatus, page });
      if (data && Array.isArray(data.results)) {
        setNotifications(data.results);
        setUnreadCount(data.unread_count ?? 0);
        setTotalCount(data.count ?? data.results.length);
        setHasNext(Boolean(data.next));
        setHasPrev(Boolean(data.previous));
      } else {
        setNotifications(Array.isArray(data) ? data : []);
        setHasNext(false);
        setHasPrev(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load seller notifications.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadNotifications();
    });
    return () => {
      active = false;
    };
  }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await sellerService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(err.message || 'Could not mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await sellerService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err.message || 'Could not mark all notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  // Detect relevant resource link inside notification text
  const getActionLink = (notif) => {
    const text = `${notif.title || ''} ${notif.message || ''}`;
    const orderMatch = text.match(/BB-ORD-[A-Z0-9-]+/i);
    if (orderMatch) {
      return { to: `/seller/orders/${orderMatch[0]}`, label: 'View Order →' };
    }
    if (text.toLowerCase().includes('review')) {
      return { to: '/seller/reviews', label: 'View Reviews →' };
    }
    if (text.toLowerCase().includes('stock') || text.toLowerCase().includes('inventory')) {
      return { to: '/seller/inventory', label: 'Check Inventory →' };
    }
    return null;
  };

  return (
    <SellerLayout
      title="Studio Notifications"
      subtitle="Order alerts, consignment updates, and marketplace announcements for your workshop."
    >
      <div className="space-y-6">
        {/* Controls Bar */}
        <div className="p-4 bg-white rounded-sm border border-[#E8DED2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'read', label: 'Read' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterStatus(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-sm text-xs font-semibold border cursor-pointer ${
                  filterStatus === tab.id
                    ? 'text-white border-[#C0522B]'
                    : 'bg-white text-[#4A3728] border-[#D6CCC2] hover:bg-[#FAF7F2]'
                }`}
                style={{ background: filterStatus === tab.id ? '#C0522B' : undefined }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="text-xs font-semibold text-[#C0522B] hover:underline cursor-pointer disabled:opacity-50"
            >
              {markingAll ? 'Updating...' : 'Mark all as read'}
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadNotifications} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div className="w-7 h-7 border-2 border-[#C0522B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#7A5C4A]">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: '#FFF8F0', border: '1px solid #E8DED2' }}
            >
              <span className="text-xl">🔔</span>
            </div>
            <h3
              className="text-base font-bold text-[#2C2C2C]"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              No Notifications Found
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1 max-w-sm mx-auto">
              {filterStatus === 'unread'
                ? 'You have read all your studio notifications.'
                : 'Incoming paid order alerts and studio notices will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const linkInfo = getActionLink(notif);
              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-sm border transition-all flex items-start justify-between gap-4 ${
                    notif.is_read
                      ? 'bg-white border-[#E8DED2]'
                      : 'bg-[#FFFDF9] border-[#C9962A] shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        notif.is_read ? 'bg-[#D6CCC2]' : 'bg-[#C0522B]'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h4
                          className={`text-xs font-bold ${
                            notif.is_read ? 'text-[#2C2C2C]' : 'text-[#C0522B]'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-[#8C7665]">
                          {new Date(notif.created_at).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-[#4A3728] mt-1 leading-relaxed">{notif.message}</p>
                      {linkInfo && (
                        <Link
                          to={linkInfo.to}
                          className="inline-block mt-2 text-[11px] font-semibold text-[#C0522B] hover:underline"
                        >
                          {linkInfo.label}
                        </Link>
                      )}
                    </div>
                  </div>

                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notif.id)}
                      className="text-[11px] font-semibold text-[#C0522B] hover:underline shrink-0 cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}

            {(hasPrev || hasNext) && (
              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="text-[#7A5C4A]">Total: {totalCount}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-[#D6CCC2] bg-white rounded-sm font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-[#D6CCC2] bg-white rounded-sm font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
