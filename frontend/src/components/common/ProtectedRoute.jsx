import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

/**
 * ProtectedRoute Guard
 *
 * Checks:
 * 1. Is user logged in? If not -> redirect to /login
 * 2. Does user match allowedRoles? (e.g. ['SELLER', 'ADMIN'])
 * 3. If SELLER, is application approved? If pending -> redirect to /seller/pending
 */
export default function ProtectedRoute({
  children,
  allowedRoles = [],
  requireApprovedSeller = false,
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{ background: 'var(--cream)' }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--burgundy)', borderTopColor: 'transparent' }}
          />
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              letterSpacing: '0.15em',
              color: '#4A3728',
              textTransform: 'uppercase',
            }}
          >
            Verifying session…
          </p>
        </div>
      </div>
    );
  }

  // Not logged in -> send to login with return redirect
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const sellerStatus = user.seller_profile?.application_status || user.application_status;
  const isApprovedSeller = Boolean(user.is_approved_seller && sellerStatus === 'APPROVED');

  // Role validation
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to their appropriate home
    if (user.role === 'CUSTOMER') return <Navigate to="/customer/dashboard" replace />;
    if (user.role === 'SELLER') {
      if (sellerStatus === 'REJECTED') {
        return <Navigate to="/seller/rejected" replace />;
      }
      return isApprovedSeller ? (
        <Navigate to="/seller/dashboard" replace />
      ) : (
        <Navigate to="/seller/pending" replace />
      );
    }
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  // Seller approval check
  if (requireApprovedSeller && user.role === 'SELLER') {
    if (sellerStatus === 'REJECTED') {
      return <Navigate to="/seller/rejected" replace />;
    }
    if (!isApprovedSeller) {
      return <Navigate to="/seller/pending" replace />;
    }
  }

  return children;
}
