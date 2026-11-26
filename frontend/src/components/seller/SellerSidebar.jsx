import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

const NAV_ITEMS = [
  {
    path: '/seller/dashboard',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/seller/store',
    label: 'My Store',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/seller/products',
    label: 'Products',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/seller/inventory',
    label: 'Inventory',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/seller/orders',
    label: 'Orders',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/seller/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/seller/reviews',
    label: 'Reviews',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/seller/notifications',
    label: 'Notifications',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/seller/settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    isReady: true,
  },
];

export default function SellerSidebar({ onItemClick }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const storeName = user?.seller_profile?.store_name || 'Artisan Workshop';
  const craftCategory = user?.seller_profile?.craft_category || 'Handcrafted Art';

  return (
    <aside className="w-full h-full flex flex-col justify-between bg-white border border-[#E8DED2] rounded-sm p-4">
      {/* Brand Header */}
      <div>
        <div className="pb-4 mb-4 border-b border-[#F0EBE3]">
          <span
            className="text-[10px] font-bold uppercase tracking-wider block"
            style={{ color: '#C0522B' }}
          >
            Artisan Creator Portal
          </span>
          <h2
            className="text-base font-bold text-[#2C2C2C] truncate mt-0.5"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            title={storeName}
          >
            {storeName}
          </h2>
          <span className="text-[11px] text-[#7A5C4A] truncate block mt-0.5">
            {craftCategory}
          </span>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/seller/dashboard' && location.pathname.startsWith(item.path + '/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-sm transition-all ${
                  isActive
                    ? 'text-white shadow-xs'
                    : 'text-[#4A3728] hover:bg-[#FAF7F2] hover:text-[#C0522B]'
                }`}
                style={{
                  background: isActive ? '#C0522B' : 'transparent',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-white' : 'text-[#7A5C4A]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F2ECE4] text-[#7A5C4A]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / User card */}
      <div className="pt-4 mt-6 border-t border-[#F0EBE3]">
        <div className="p-2.5 rounded-sm bg-[#FAF7F2] border border-[#E8DED2] mb-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[#2C2C2C]">Partner Status</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Approved
            </span>
          </div>
          <p className="text-[11px] text-[#7A5C4A] mt-1 truncate">
            {user?.first_name} {user?.last_name}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs">
          <Link
            to="/shop"
            className="text-[11px] font-medium text-[#7A5C4A] hover:text-[#C0522B] transition-colors"
          >
            ← Public Shop
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="text-[11px] font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
