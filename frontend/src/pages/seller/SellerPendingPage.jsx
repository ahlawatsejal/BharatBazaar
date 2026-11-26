import { useAuth } from '../../context/useAuth';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function SellerPendingPage() {
  const { user, logout } = useAuth();
  const sellerStatus = user?.seller_profile?.application_status || user?.application_status || 'PENDING';
  const isSuspended = sellerStatus === 'SUSPENDED';

  return (
    <div style={{ background: '#F8F5F0' }} className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div
          className="w-full max-w-xl bg-white p-8 sm:p-12 shadow-sm border text-center"
          style={{ borderColor: '#E8DED2' }}
        >
          {/* Emblem Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: isSuspended ? '#FEF2F2' : '#FFF8F0', border: isSuspended ? '1px solid #FECACA' : '1px solid #E4C89A' }}
          >
            <span className="text-2xl">{isSuspended ? '⚠️' : '⏳'}</span>
          </div>

          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: '#9D294D',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            {isSuspended ? 'Storefront Status: Suspended' : 'Application Status: Pending Review'}
          </span>

          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: '#2F211B',
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '14px',
            }}
          >
            {isSuspended ? 'Your Artisan Storefront is Suspended' : 'Your Artisan Application is Under Review'}
          </h1>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: '#4A3728',
              fontSize: '14px',
              lineHeight: '1.7',
              marginBottom: '24px',
            }}
          >
            {isSuspended ? (
              <>
                Hello <strong>{user?.first_name || 'Artisan'}</strong>, your storefront{' '}
                <strong>{user?.seller_profile?.store_name || 'account'}</strong> is currently suspended by platform administration. Please contact support for review.
              </>
            ) : (
              <>
                Thank you for applying to sell on BharatBazaar,{' '}
                <strong>{user?.first_name || 'Artisan'}</strong>. We have received your application for{' '}
                <strong>{user?.seller_profile?.store_name || 'your store'}</strong>.
              </>
            )}
          </p>

          {/* Details Card */}
          <div
            className="p-5 text-left rounded-sm border mb-8 text-xs space-y-2.5"
            style={{ background: '#FCFAF7', borderColor: '#E8DED2', color: '#4A3728' }}
          >
            <div className="flex justify-between border-b border-[#F0EBE3] pb-2">
              <span className="text-[#8B6F5E] uppercase tracking-wider font-semibold">Storefront</span>
              <span className="font-bold">{user?.seller_profile?.store_name || 'Registered Store'}</span>
            </div>
            <div className="flex justify-between border-b border-[#F0EBE3] pb-2">
              <span className="text-[#8B6F5E] uppercase tracking-wider font-semibold">Craft Tradition</span>
              <span className="font-bold">{user?.seller_profile?.craft_category || 'Handicrafts'}</span>
            </div>
            <div className="flex justify-between border-b border-[#F0EBE3] pb-2">
              <span className="text-[#8B6F5E] uppercase tracking-wider font-semibold">Location</span>
              <span className="font-bold">
                {user?.seller_profile?.city ? `${user.seller_profile.city}, ${user.seller_profile.state}` : 'India'}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-[#8B6F5E] uppercase tracking-wider font-semibold">Status</span>
              <span
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  padding: '2px 8px',
                  borderRadius: '2px',
                  fontWeight: '700',
                }}
              >
                PENDING APPROVAL
              </span>
            </div>
          </div>

          <div className="text-xs text-[#7A5C4A] space-y-2 mb-8 text-left leading-relaxed">
            <p>
              🔍 <strong>What happens next?</strong> Our curatorial team reviews all artisan portfolios to ensure authentic origin, fair pricing, and compliance with the Indian Handicrafts Charter.
            </p>
            <p>
              ⏱️ Reviews typically take <strong>24 to 48 hours</strong>. Once approved, product publishing and order management capabilities will be unlocked automatically.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => logout()}
              style={{
                background: '#2F211B',
                color: '#FFFFFF',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                padding: '12px 28px',
              }}
              className="hover:bg-black transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
