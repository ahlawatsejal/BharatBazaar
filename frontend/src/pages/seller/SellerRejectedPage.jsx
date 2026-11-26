import { useAuth } from '../../context/useAuth';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function SellerRejectedPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ background: '#F8F5F0' }} className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div
          className="w-full max-w-xl bg-white p-8 sm:p-12 shadow-sm border text-center"
          style={{ borderColor: '#E8DED2' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}
          >
            <span className="text-2xl text-red-600">✕</span>
          </div>

          <span
            className="text-[11px] font-bold uppercase tracking-wider text-red-600 block mb-2"
          >
            Application Status: Not Approved
          </span>

          <h1
            className="text-2xl font-bold text-[#2C2C2C] mb-3"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
          >
            Artisan Application Decision
          </h1>

          <p className="text-xs text-[#7A5C4A] leading-relaxed mb-6 max-w-md mx-auto">
            Thank you for your interest in BharatBazaar. At this time, our curatorial board was
            unable to approve your seller storefront application for <strong>{user?.seller_profile?.store_name}</strong>.
            This may be due to missing authenticity verification, non-handcrafted catalog flags, or incomplete workshop documentation.
          </p>

          <div className="p-4 bg-[#FAF7F2] rounded-sm border border-[#E8DED2] text-xs text-[#4A3728] text-left mb-6">
            <strong className="block font-semibold mb-1">Need Clarification or Want to Appeal?</strong>
            <span>
              If you believe this decision was made in error or have additional craft certification to share,
              please reach out directly to our artisan curation desk at{' '}
              <a href="mailto:curation@bharatbazaar.in" className="text-[#C0522B] underline font-semibold">
                curation@bharatbazaar.in
              </a>.
            </span>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider text-[#2C2C2C] border border-[#D6CCC2] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
