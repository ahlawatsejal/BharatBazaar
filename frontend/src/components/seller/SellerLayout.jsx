import { useState } from 'react';
import SellerSidebar from './SellerSidebar';
import SellerTopNav from './SellerTopNav';

export default function SellerLayout({ title, subtitle, children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      {/* Top Navigation */}
      <SellerTopNav onMobileMenuToggle={() => setMobileSidebarOpen(true)} />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Sidebar (3 Cols) */}
          <div className="hidden lg:block lg:col-span-3 sticky top-20">
            <SellerSidebar />
          </div>

          {/* Mobile Sidebar Drawer */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white z-50 p-4 shadow-xl overflow-y-auto">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0EBE3]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C0522B]">
                    Seller Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 text-[#7A5C4A] hover:text-[#2C2C2C] text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
                <SellerSidebar onItemClick={() => setMobileSidebarOpen(false)} />
              </div>
            </div>
          )}

          {/* Main Content (9 Cols) */}
          <main className="lg:col-span-9">
            {title && (
              <div className="mb-6">
                <h1
                  className="text-2xl font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-[#7A5C4A] mt-1">{subtitle}</p>
                )}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
