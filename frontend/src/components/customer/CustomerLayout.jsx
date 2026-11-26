import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import AnnouncementBar from '../layout/AnnouncementBar';
import Footer from '../layout/Footer';
import CustomerSidebar from './CustomerSidebar';

export default function CustomerLayout({ title, subtitle, children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF8F5' }}>
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 px-5 sm:px-8 lg:px-14 py-8 max-w-7xl mx-auto w-full">
        {/* Top Breadcrumb & Mobile Menu Toggle */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#EBE4DA]">
          <nav
            className="flex items-center gap-2 text-xs"
            style={{ color: 'var(--brown-light)', fontFamily: 'var(--font-sans)' }}
          >
            <Link to="/" className="hover:text-[var(--burgundy)] transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link to="/customer/dashboard" className="hover:text-[var(--burgundy)] transition-colors">
              Patron Account
            </Link>
            {title && (
              <>
                <span>/</span>
                <span style={{ color: 'var(--brown-dark)', fontWeight: '600' }}>{title}</span>
              </>
            )}
          </nav>

          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((prev) => !prev)}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[#D6CCC2] text-xs font-semibold text-[var(--brown-dark)] bg-white cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Menu</span>
          </button>
        </div>

        {/* Layout Grid: Sidebar + Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Desktop Sidebar (3 Cols) */}
          <div className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-24">
            <CustomerSidebar />
          </div>

          {/* Main Content Area (8-9 Cols) */}
          <div className="md:col-span-8 lg:col-span-9 min-w-0">
            {/* Header if specified */}
            {title && (
              <div className="mb-6">
                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--brown-dark)',
                    fontSize: 'clamp(22px, 3vw, 30px)',
                    fontWeight: '600',
                  }}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--brown-mid)', fontFamily: 'var(--font-sans)' }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {children}
          </div>
        </div>
      </main>

      {/* Mobile Slide-out Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />
          <div className="relative ml-auto w-4/5 max-w-xs h-full bg-white shadow-xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EBE4DA]">
              <h3 className="font-serif text-base font-semibold text-[var(--brown-dark)]">
                Patron Navigation
              </h3>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="text-sm p-1 text-[#8C7B70] hover:text-[var(--brown-dark)]"
              >
                ✕
              </button>
            </div>
            <CustomerSidebar onItemClick={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
