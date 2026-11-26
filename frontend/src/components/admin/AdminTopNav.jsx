import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import ThemeToggleButton from '../common/ThemeToggleButton';

export default function AdminTopNav({ onMobileMenuToggle }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-[#E8DED2] sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="lg:hidden p-1.5 text-[#2C2C2C] hover:bg-[#FAF7F2] rounded-sm cursor-pointer"
            aria-label="Toggle admin menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/dashboard"
              className="text-xs font-bold uppercase tracking-wider text-[#C0522B]"
            >
              BharatBazaar
            </Link>
            <span className="text-[#C5B8A8] text-xs">/</span>
            <span className="text-xs font-semibold text-[#2C2C2C]">Admin Control Center</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggleButton className="text-[#7A5C4A] hover:bg-[#FAF7F2]" />

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#E4C89A] text-[11px] font-semibold text-[#2C2C2C]">
            <span className="w-2 h-2 rounded-full bg-[#C9962A]" />
            Platform Administrator
          </span>

          <div
            className="w-8 h-8 rounded-full bg-[#2C2C2C] text-[#C9962A] flex items-center justify-center font-bold text-xs"
            title={user?.email}
          >
            {user?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A'}
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="hidden sm:inline-block text-[11px] font-semibold text-[#7A5C4A] hover:text-red-600 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
