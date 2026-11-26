import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

const ADMIN_NAV_ITEMS = [
  {
    path: '/admin/dashboard',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/admin/sellers',
    label: 'Sellers',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/admin/products',
    label: 'Products',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/admin/customers',
    label: 'Customers',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/admin/orders',
    label: 'Orders',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/admin/returns',
    label: 'Returns',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/admin/payments',
    label: 'Payments',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/admin/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    isReady: true,
  },
  {
    path: '/admin/settings',
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

export default function AdminSidebar({ onItemClick }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="w-full h-full flex flex-col justify-between bg-white border border-[#E8DED2] rounded-sm p-4">
      <div>
        <div className="pb-4 mb-4 border-b border-[#F0EBE3]">
          <span className="text-[10px] font-bold uppercase tracking-wider block text-[#C0522B]">
            Platform Governance
          </span>
          <h2
            className="text-base font-bold text-[#2C2C2C] mt-0.5"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
          >
            BharatBazaar Admin
          </h2>
          <span className="text-[11px] text-[#7A5C4A] block mt-0.5">
            Marketplace Control Center
          </span>
        </div>

        <nav className="space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path + '/'));

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
                style={{ background: isActive ? '#2C2C2C' : 'transparent' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-[#C9962A]' : 'text-[#7A5C4A]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-white/15 text-white' : 'bg-[#F2ECE4] text-[#7A5C4A]'
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

      <div className="pt-4 mt-6 border-t border-[#F0EBE3]">
        <div className="p-2.5 rounded-sm bg-[#FAF7F2] border border-[#E8DED2] mb-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[#2C2C2C]">Role</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#2C2C2C] text-[#C9962A]">
              ADMIN
            </span>
          </div>
          <p className="text-[11px] text-[#7A5C4A] mt-1 truncate" title={user?.email}>
            {user?.email}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs">
          <Link to="/" className="text-[11px] font-medium text-[#7A5C4A] hover:text-[#C0522B]">
            ← Storefront
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
