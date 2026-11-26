import { useState, useEffect } from 'react';
import CustomerLayout from '../../components/customer/CustomerLayout';
import NotificationItem from '../../components/customer/NotificationItem';
import { customerService } from '../../services/customerService';

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await customerService.getNotifications();
      setNotifications(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadNotifications();
    });
    return () => {
      active = false;
    };
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await customerService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await customerService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      setError(err.message || 'Failed to mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <CustomerLayout
      title="Notifications"
      subtitle="Fulfillment updates, consignment dispatches, and account alerts."
    >
      <div className="space-y-6">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--brown-mid)]">
            You have <strong className="text-[var(--brown-dark)]">{unreadCount}</strong> unread alerts
          </p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="text-xs font-semibold text-[var(--burgundy)] hover:underline cursor-pointer disabled:opacity-50"
            >
              {markingAll ? 'Updating...' : 'Mark all as read'}
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
            <div className="inline-block animate-spin w-8 h-8 border-3 border-[var(--burgundy)] border-t-transparent rounded-full mb-3" />
            <p className="text-xs text-[var(--brown-mid)]">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#FAF8F5] border border-[#EBE4DA] flex items-center justify-center text-[var(--brown-mid)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3
              className="text-base font-semibold text-[var(--brown-dark)]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              No Notifications Yet
            </h3>
            <p className="text-xs text-[var(--brown-mid)] mt-1 max-w-sm mx-auto">
              Real-time updates will appear here as soon as your artisan orders are confirmed, dispatched, or delivered.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <NotificationItem
                key={item.id}
                notification={item}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
