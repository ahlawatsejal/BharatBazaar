import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopNav from './AdminTopNav';

export default function AdminLayout({ title, subtitle, children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <AdminTopNav onMobileMenuToggle={() => setMobileSidebarOpen(true)} />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-3 sticky top-20">
            <AdminSidebar />
          </div>

          {/* Mobile Drawer */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="fixed inset-0 bg-black/50"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white z-50 p-4 shadow-xl overflow-y-auto">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0EBE3]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C0522B]">
                    Admin Navigation
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 text-[#7A5C4A] text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <AdminSidebar onItemClick={() => setMobileSidebarOpen(false)} />
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="lg:col-span-9">
            {title && (
              <div className="mb-6">
                <h1
                  className="text-2xl font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  {title}
                </h1>
                {subtitle && <p className="text-xs text-[#7A5C4A] mt-1">{subtitle}</p>}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
