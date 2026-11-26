import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import HomePage from './pages/public/HomePage';

// Lazy-loaded public & shopping pages
const ShopPage = lazy(() => import('./pages/public/ShopPage'));
const ProductDetailPage = lazy(() => import('./pages/public/ProductDetailPage'));
const ArtisansPage = lazy(() => import('./pages/public/ArtisansPage'));
const CraftStoriesPage = lazy(() => import('./pages/public/CraftStoriesPage'));
const ImpactPage = lazy(() => import('./pages/public/ImpactPage'));
const InfoPage = lazy(() => import('./pages/public/InfoPage'));
const CartPage = lazy(() => import('./pages/customer/CartPage'));
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/customer/OrderConfirmationPage'));

// Lazy-loaded authentication pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const CustomerRegisterPage = lazy(() => import('./pages/auth/CustomerRegisterPage'));
const SellerRegisterPage = lazy(() => import('./pages/auth/SellerRegisterPage'));

// Lazy-loaded seller portal pages
const SellerPendingPage = lazy(() => import('./pages/seller/SellerPendingPage'));
const SellerRejectedPage = lazy(() => import('./pages/seller/SellerRejectedPage'));
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'));
const SellerStorePage = lazy(() => import('./pages/seller/SellerStorePage'));
const SellerProductsPage = lazy(() => import('./pages/seller/SellerProductsPage'));
const SellerInventoryPage = lazy(() => import('./pages/seller/SellerInventoryPage'));
const SellerOrdersPage = lazy(() => import('./pages/seller/SellerOrdersPage'));
const SellerOrderDetailPage = lazy(() => import('./pages/seller/SellerOrderDetailPage'));
const SellerAnalyticsPage = lazy(() => import('./pages/seller/SellerAnalyticsPage'));
const SellerReviewsPage = lazy(() => import('./pages/seller/SellerReviewsPage'));
const SellerNotificationsPage = lazy(() => import('./pages/seller/SellerNotificationsPage'));
const SellerSettingsPage = lazy(() => import('./pages/seller/SellerSettingsPage'));

// Lazy-loaded customer portal pages
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const CustomerProfilePage = lazy(() => import('./pages/customer/CustomerProfilePage'));
const CustomerOrdersPage = lazy(() => import('./pages/customer/CustomerOrdersPage'));
const CustomerOrderDetailPage = lazy(() => import('./pages/customer/CustomerOrderDetailPage'));
const CustomerAddressesPage = lazy(() => import('./pages/customer/CustomerAddressesPage'));
const CustomerWishlistPage = lazy(() => import('./pages/customer/CustomerWishlistPage'));
const CustomerReviewsPage = lazy(() => import('./pages/customer/CustomerReviewsPage'));
const CustomerNotificationsPage = lazy(() => import('./pages/customer/CustomerNotificationsPage'));
const CustomerReturnsPage = lazy(() => import('./pages/customer/CustomerReturnsPage'));
const CustomerSecurityPage = lazy(() => import('./pages/customer/CustomerSecurityPage'));

// Lazy-loaded admin portal pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminSellersPage = lazy(() => import('./pages/admin/AdminSellersPage'));
const AdminSellerDetailPage = lazy(() => import('./pages/admin/AdminSellerDetailPage'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminProductDetailPage = lazy(() => import('./pages/admin/AdminProductDetailPage'));
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage'));
const AdminCustomerDetailPage = lazy(() => import('./pages/admin/AdminCustomerDetailPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('./pages/admin/AdminOrderDetailPage'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));
const AdminPaymentDetailPage = lazy(() => import('./pages/admin/AdminPaymentDetailPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminReturnsPage = lazy(() => import('./pages/admin/AdminReturnsPage'));

function PageLoadingFallback() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--cream, #F8F5F0)' }}
      role="status"
      aria-live="polite"
    >
      <div
        className="w-8 h-8 rounded-full border-2 animate-spin mb-4"
        style={{
          borderColor: 'rgba(157, 41, 77, 0.2)',
          borderTopColor: 'var(--burgundy, #9D294D)',
        }}
      />
      <p
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: 'var(--burgundy, #9D294D)',
          fontSize: '14px',
          letterSpacing: '0.2em',
          fontWeight: 700,
        }}
      >
        BHARATBAZAAR
      </p>
      <p
        className="mt-1"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: '#7A5C4A',
          fontSize: '12px',
        }}
      >
        Loading page...
      </p>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
            {/* Public Landing & Catalogue Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/artisans" element={<ArtisansPage />} />
            <Route path="/craft-stories" element={<CraftStoriesPage />} />
            <Route path="/craft-stories/:slug" element={<CraftStoriesPage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/info/:topic" element={<InfoPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />

            {/* Shopping Cart & Checkout */}
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wishlist" element={<Navigate to="/customer/wishlist" replace />} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order-confirmation/:orderNumber"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <OrderConfirmationPage />
                </ProtectedRoute>
              }
            />

            {/* Authentication Pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<CustomerRegisterPage />} />
            <Route path="/seller/register" element={<SellerRegisterPage />} />

            {/* Seller Application Status Pages (Protected: SELLER) */}
            <Route
              path="/seller/pending"
              element={
                <ProtectedRoute allowedRoles={['SELLER']}>
                  <SellerPendingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/rejected"
              element={
                <ProtectedRoute allowedRoles={['SELLER']}>
                  <SellerRejectedPage />
                </ProtectedRoute>
              }
            />

            {/* Customer Dashboard & Patron Portal (Protected) */}
            <Route
              path="/customer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/profile"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/orders"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/orders/:orderNumber"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerOrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/addresses"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerAddressesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/wishlist"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerWishlistPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/reviews"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerReviewsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/notifications"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerNotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/returns"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerReturnsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/security"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerSecurityPage />
                </ProtectedRoute>
              }
            />

            {/* Approved Artisan Seller Portal (Protected: SELLER + APPROVED) */}
            <Route
              path="/seller/dashboard"
              element={
                <ProtectedRoute allowedRoles={['SELLER']} requireApprovedSeller={true}>
                  <SellerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/store"
              element={
                <ProtectedRoute allowedRoles={['SELLER']} requireApprovedSeller={true}>
                  <SellerStorePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/products"
              element={
                <ProtectedRoute allowedRoles={['SELLER']} requireApprovedSeller={true}>
                  <SellerProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/inventory"
              element={
                <ProtectedRoute allowedRoles={['SELLER']} requireApprovedSeller={true}>
                  <SellerInventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/orders"
              element={
                <ProtectedRoute allowedRoles={['SELLER']} requireApprovedSeller={true}>
                  <SellerOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/orders/:orderNumber"
              element={
                <ProtectedRoute allowedRoles={['SELLER']} requireApprovedSeller={true}>
                  <SellerOrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/analytics"
              element={
                <ProtectedRoute allowedRoles={['SELLER']} requireApprovedSeller={true}>
                  <SellerAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/reviews"
              element={
                <ProtectedRoute allowedRoles={['SELLER']} requireApprovedSeller={true}>
                  <SellerReviewsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/notifications"
              element={
                <ProtectedRoute allowedRoles={['SELLER']} requireApprovedSeller={true}>
                  <SellerNotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/settings"
              element={
                <ProtectedRoute allowedRoles={['SELLER']} requireApprovedSeller={true}>
                  <SellerSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Dashboard & Governance Portal (Protected: ADMIN) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sellers"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminSellersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sellers/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminSellerDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/products/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminProductDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/customers"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminCustomersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/customers/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminCustomerDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orders/:orderNumber"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminOrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/returns"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminReturnsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminPaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments/:identifier"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminPaymentDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
