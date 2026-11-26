import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { sellerService } from '../../services/sellerService';
import ThemeToggleButton from '../common/ThemeToggleButton';

export default function SellerTopNav({ onMobileMenuToggle }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const storeName = user?.seller_profile?.store_name || 'Artisan Workshop';

  useEffect(() => {
    let mounted = true;
    sellerService
      .getUnreadNotificationCount()
      .then((res) => {
        if (mounted && typeof res?.unread_count === 'number') {
          setUnreadCount(res.unread_count);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="bg-white border-b border-[#E8DED2] sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: Mobile hamburger + Breadcrumb info */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="lg:hidden p-1.5 text-[#2C2C2C] hover:bg-[#FAF7F2] rounded-sm cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <Link
              to="/seller/dashboard"
              className="text-xs font-bold uppercase tracking-wider text-[#C0522B] hover:opacity-80 transition-opacity"
            >
              BharatBazaar
            </Link>
            <span className="text-[#C5B8A8] text-xs">/</span>
            <span className="text-xs font-semibold text-[#2C2C2C] truncate max-w-[180px] sm:max-w-xs">
              {storeName}
            </span>
          </div>
        </div>

        {/* Right: Actions and Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggleButton className="text-[#7A5C4A] hover:bg-[#FAF7F2]" />

          {/* Verified Partner Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF8F0] border border-[#E4C89A] text-[11px] font-semibold text-[#8B5E28]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Verified Artisan Partner</span>
          </div>

          {/* Notifications Icon */}
          <Link
            to="/seller/notifications"
            className="p-1.5 text-[#7A5C4A] hover:text-[#C0522B] hover:bg-[#FAF7F2] rounded-sm transition-colors relative"
            title="Seller Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ background: '#C0522B' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User initials circle */}
          <div className="w-8 h-8 rounded-full bg-[#C0522B] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
          </div>
        </div>
      </div>
    </header>
  );
}
