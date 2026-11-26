import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import AnnouncementBar from '../../components/layout/AnnouncementBar';
import Footer from '../../components/layout/Footer';
import { useCart } from '../../context/useCart';
import { useAuth } from '../../context/useAuth';
import { orderService } from '../../services/orderService';
import { CRAFT_FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { cart, refreshCart } = useCart();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Address form fields
  const [addressForm, setAddressForm] = useState({
    full_name: '',
    phone_number: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    }
  }, [isAuthenticated, navigate]);

  // Load saved addresses
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      orderService
        .getAddresses()
        .then((data) => {
          if (isMounted) {
            setAddresses(data);
            const defaultAddr = data.find((a) => a.is_default) || data[0];
            if (defaultAddr) setSelectedAddressId(defaultAddr.id);
            if (data.length === 0) setShowAddressForm(true);
            setLoadingAddresses(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.warn('Failed to fetch addresses:', err);
            setLoadingAddresses(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Handle address form submission
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (
      !addressForm.full_name ||
      !addressForm.phone_number ||
      !addressForm.address_line_1 ||
      !addressForm.city ||
      !addressForm.state ||
      !addressForm.postal_code
    ) {
      setErrorMessage('Please fill in all required shipping address fields.');
      return;
    }

    try {
      const created = await orderService.createAddress(addressForm);
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      setAddressForm({
        full_name: '',
        phone_number: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        is_default: false,
      });
    } catch (err) {
      setErrorMessage(err.message || 'Could not save delivery address.');
    }
  };

  // Group items by seller for fulfillment transparency
  const items = useMemo(() => cart?.items || [], [cart?.items]);
  const groupedBySeller = useMemo(() => {
    const groups = {};
    items.forEach((item) => {
      const sellerName = item.product?.seller_store_name || 'Artisan Workshop';
      if (!groups[sellerName]) groups[sellerName] = [];
      groups[sellerName].push(item);
    });
    return groups;
  }, [items]);

  const subtotal = Number(cart?.subtotal || 0);
  const shippingAmount = Number(cart?.shipping_amount || 0);
  const totalAmount = Number(cart?.total_amount || 0);

  // Place Order & Open Razorpay
  const handlePlaceOrder = async () => {
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('Your shopping bag is empty. Please add items before checking out.');
      return;
    }

    if (!selectedAddressId) {
      setErrorMessage('Please select or add a delivery destination address.');
      return;
    }

    setSubmittingOrder(true);

    try {
      // 1. Create Order on Django Backend
      const orderRes = await orderService.createOrder(selectedAddressId);
      const {
        order,
        razorpay_order_id,
        razorpay_key_id,
        amount_in_paise,
        currency,
        customer_name,
        customer_email,
        customer_phone,
      } = orderRes;

      // 2. Check if Razorpay keys are configured
      if (!razorpay_key_id) {
        // Razorpay environment credentials are not yet added to .env
        // Report clearly as required by instructions
        setErrorMessage(
          'Razorpay test credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured in backend/.env. End-to-end payment gateway checkout remains pending configuration.'
        );
        setSubmittingOrder(false);
        return;
      }

      // 3. Load Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Could not load Razorpay payment gateway script. Please check your internet connection.');
      }

      // 4. Open Razorpay Checkout modal
      const options = {
        key: razorpay_key_id,
        amount: amount_in_paise,
        currency: currency || 'INR',
        name: 'BharatBazaar Artisans',
        description: `Order ${order.order_number}`,
        image: '/hero-cropped.jpg',
        order_id: razorpay_order_id,
        prefill: {
          name: customer_name,
          email: customer_email,
          contact: customer_phone,
        },
        theme: {
          color: '#9D294D',
        },
        modal: {
          ondismiss: () => {
            setSubmittingOrder(false);
            setErrorMessage('Payment process was cancelled. You can retry placing the order.');
          },
        },
        handler: async (response) => {
          try {
            // 5. Verify payment server-side
            await orderService.verifyPayment({
              order_number: order.order_number,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // 6. Refresh cart count and redirect to confirmation
            await refreshCart();
            navigate(`/order-confirmation/${order.order_number}`);
          } catch (verifyErr) {
            setErrorMessage(verifyErr.message || 'Payment signature verification failed.');
            setSubmittingOrder(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setErrorMessage(`Payment failed: ${resp.error?.description || 'Transaction was declined.'}`);
        setSubmittingOrder(false);
      });
      rzp.open();
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred while placing the order.');
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF8F5' }}>
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 px-5 sm:px-8 lg:px-14 py-8 max-w-7xl mx-auto w-full">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-xs mb-6"
          style={{ color: 'var(--brown-light)', fontFamily: 'var(--font-sans)' }}
        >
          <Link to="/" className="hover:text-[var(--burgundy)] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/cart" className="hover:text-[var(--burgundy)] transition-colors">
            Shopping Bag
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--brown-dark)', fontWeight: '600' }}>Checkout & Payment</span>
        </nav>

        {/* Title */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            color: 'var(--brown-dark)',
            fontSize: 'clamp(26px, 3.5vw, 36px)',
            fontWeight: '600',
            marginBottom: '24px',
          }}
        >
          Secure Checkout
        </h1>

        {/* Error Banner */}
        {errorMessage && (
          <div
            className="mb-8 p-4 rounded-sm text-xs flex items-start justify-between"
            style={{
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
              color: '#9F1239',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold ml-4 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div
            className="p-12 text-center rounded-sm border border-[#EBE4DA] bg-white my-8 max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <h2 className="font-serif text-2xl font-semibold text-[var(--brown-dark)] mb-2">
              Cannot Proceed with an Empty Bag
            </h2>
            <p className="text-xs text-[var(--brown-mid)] mb-6">
              Please add handcrafted articles to your shopping bag before proceeding to checkout.
            </p>
            <Link to="/shop" className="btn-primary text-xs py-3 px-8 inline-block">
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Delivery Address & Multi-Seller Items (7 Cols) */}
            <div className="lg:col-span-7 space-y-8">
              {/* ── Section 1: Shipping Destination ── */}
              <section className="p-6 rounded-sm border border-[#EBE4DA] bg-white">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EBE4DA]">
                  <h2 className="font-serif text-lg font-semibold text-[var(--brown-dark)]">
                    1. Delivery Destination
                  </h2>
                  {!showAddressForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(true)}
                      className="text-xs font-bold text-[var(--burgundy)] uppercase tracking-wider hover:underline cursor-pointer"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      + Add New Address
                    </button>
                  )}
                </div>

                {loadingAddresses ? (
                  <div className="h-20 bg-[#EBE4DA] rounded-sm animate-pulse" />
                ) : showAddressForm ? (
                  /* Add Address Form */
                  <form onSubmit={handleSaveAddress} className="space-y-4 text-xs" style={{ fontFamily: 'var(--font-sans)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="checkout-full-name" className="block text-[var(--brown-dark)] font-semibold mb-1">
                          Full Name *
                        </label>
                        <input
                          id="checkout-full-name"
                          name="full_name"
                          type="text"
                          required
                          value={addressForm.full_name}
                          onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                          placeholder="Recipient Name"
                          className="w-full p-2.5 border border-[#D6CCC2] rounded-sm focus:border-[var(--burgundy)] outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="checkout-phone" className="block text-[var(--brown-dark)] font-semibold mb-1">
                          Phone Number *
                        </label>
                        <input
                          id="checkout-phone"
                          name="phone_number"
                          type="tel"
                          required
                          value={addressForm.phone_number}
                          onChange={(e) => setAddressForm({ ...addressForm, phone_number: e.target.value })}
                          placeholder="10-digit mobile number"
                          className="w-full p-2.5 border border-[#D6CCC2] rounded-sm focus:border-[var(--burgundy)] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="checkout-line-1" className="block text-[var(--brown-dark)] font-semibold mb-1">
                        Address Line 1 (Street / House / Building) *
                      </label>
                      <input
                        id="checkout-line-1"
                        name="address_line_1"
                        type="text"
                        required
                        value={addressForm.address_line_1}
                        onChange={(e) => setAddressForm({ ...addressForm, address_line_1: e.target.value })}
                        placeholder="House no., street, craft village"
                        className="w-full p-2.5 border border-[#D6CCC2] rounded-sm focus:border-[var(--burgundy)] outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="checkout-line-2" className="block text-[var(--brown-dark)] font-semibold mb-1">
                        Address Line 2 (Landmark / Area - Optional)
                      </label>
                      <input
                        id="checkout-line-2"
                        name="address_line_2"
                        type="text"
                        value={addressForm.address_line_2}
                        onChange={(e) => setAddressForm({ ...addressForm, address_line_2: e.target.value })}
                        placeholder="Apartment, near landmark"
                        className="w-full p-2.5 border border-[#D6CCC2] rounded-sm focus:border-[var(--burgundy)] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="checkout-city" className="block text-[var(--brown-dark)] font-semibold mb-1">
                          City / District *
                        </label>
                        <input
                          id="checkout-city"
                          name="city"
                          type="text"
                          required
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          placeholder="e.g. Jaipur"
                          className="w-full p-2.5 border border-[#D6CCC2] rounded-sm focus:border-[var(--burgundy)] outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="checkout-state" className="block text-[var(--brown-dark)] font-semibold mb-1">
                          State *
                        </label>
                        <input
                          id="checkout-state"
                          name="state"
                          type="text"
                          required
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          placeholder="e.g. Rajasthan"
                          className="w-full p-2.5 border border-[#D6CCC2] rounded-sm focus:border-[var(--burgundy)] outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="checkout-postal" className="block text-[var(--brown-dark)] font-semibold mb-1">
                          PIN Code *
                        </label>
                        <input
                          id="checkout-postal"
                          name="postal_code"
                          type="text"
                          required
                          value={addressForm.postal_code}
                          onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                          placeholder="6-digit PIN"
                          className="w-full p-2.5 border border-[#D6CCC2] rounded-sm focus:border-[var(--burgundy)] outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        className="btn-primary text-xs py-2 px-5"
                      >
                        Save Address
                      </button>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAddressForm(false)}
                          className="text-xs text-[var(--brown-mid)] underline hover:text-[var(--brown-dark)]"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                ) : addresses.length === 0 ? (
                  <p className="text-xs text-[var(--brown-mid)]">
                    No delivery destination saved. Please add an address to continue.
                  </p>
                ) : (
                  /* Saved Addresses Radio List */
                  <div className="space-y-3" style={{ fontFamily: 'var(--font-sans)' }}>
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <label
                          key={addr.id}
                          className="flex items-start gap-3 p-3.5 rounded-sm border cursor-pointer transition-colors"
                          style={{
                            borderColor: isSelected ? 'var(--burgundy)' : '#EBE4DA',
                            background: isSelected ? '#FAF6F4' : '#FFFFFF',
                          }}
                        >
                          <input
                            type="radio"
                            name="delivery_address"
                            checked={isSelected}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-1 accent-[var(--burgundy)]"
                          />
                          <div className="text-xs flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-[var(--brown-dark)]">{addr.full_name}</span>
                              <span className="text-[var(--brown-light)]">({addr.phone_number})</span>
                              {addr.is_default && (
                                <span className="bg-[#FAF4ED] text-[var(--burgundy)] px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[var(--brown-mid)] leading-relaxed">
                              {addr.address_line_1}
                              {addr.address_line_2 ? `, ${addr.address_line_2}` : ''},{' '}
                              {addr.city}, {addr.state} - {addr.postal_code}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── Section 2: Products Grouped by Artisan Seller ── */}
              <section className="p-6 rounded-sm border border-[#EBE4DA] bg-white">
                <h2 className="font-serif text-lg font-semibold text-[var(--brown-dark)] pb-4 mb-4 border-b border-[#EBE4DA]">
                  2. Order Items (Grouped by Artisan Maker)
                </h2>

                <div className="space-y-6" style={{ fontFamily: 'var(--font-sans)' }}>
                  {Object.entries(groupedBySeller).map(([sellerName, sellerItems]) => (
                    <div key={sellerName} className="border border-[#EBE4DA] rounded-sm p-4 bg-[#FFFDFB]">
                      {/* Seller header banner */}
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#EBE4DA]">
                        <p className="text-xs font-bold text-[var(--brown-dark)] uppercase tracking-wider">
                          Fulfillment from: <span className="text-[var(--burgundy)]">{sellerName}</span>
                        </p>
                        <span className="text-[10px] text-[var(--brown-light)] font-medium">
                          Direct Workshop Dispatch
                        </span>
                      </div>

                      {/* Items for this seller */}
                      <div className="divide-y divide-[#EBE4DA]">
                        {sellerItems.map((item) => (
                          <div key={item.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={item.product?.primary_image || CRAFT_FALLBACK_IMAGE}
                                alt={item.product?.name}
                                className="w-12 h-12 object-cover rounded-sm border border-[#EBE4DA] flex-shrink-0"
                                onError={(e) => handleImageError(e)}
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-[var(--brown-dark)] truncate">{item.product?.name}</p>
                                <p className="text-[10.5px] text-[var(--brown-light)]">
                                  Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                                </p>
                              </div>
                            </div>

                            <span className="font-serif font-bold text-[var(--brown-dark)] whitespace-nowrap">
                              ₹{Number(item.line_total).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Final Order Summary & Pay Action (5 Cols) */}
            <div className="lg:col-span-5">
              <div
                className="p-6 rounded-sm border border-[#EBE4DA] bg-white sticky top-24"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <h2 className="font-serif text-lg font-semibold text-[var(--brown-dark)] pb-4 mb-4 border-b border-[#EBE4DA]">
                  Payment Summary
                </h2>

                <div className="space-y-3 text-xs mb-6">
                  <div className="flex justify-between text-[var(--brown-mid)]">
                    <span>Articles Total ({cart?.total_items || 0} pieces)</span>
                    <span className="font-medium text-[var(--brown-dark)]">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-[var(--brown-mid)]">
                    <span>Nationwide Artisan Logistics</span>
                    <span className="font-medium">
                      {shippingAmount === 0 ? (
                        <span className="text-emerald-700 font-semibold">FREE</span>
                      ) : (
                        `₹${shippingAmount.toLocaleString('en-IN')}`
                      )}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-[#EBE4DA] flex justify-between items-baseline">
                    <span className="text-sm font-bold text-[var(--brown-dark)]">
                      Payable Total
                    </span>
                    <span className="font-serif text-2xl font-bold text-[var(--brown-dark)]">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Place Order CTA */}
                <button
                  type="button"
                  disabled={submittingOrder || !selectedAddressId}
                  onClick={handlePlaceOrder}
                  style={{
                    background: submittingOrder || !selectedAddressId ? '#A89F91' : 'var(--burgundy)',
                    color: '#FFFFFF',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    letterSpacing: '0.12em',
                  }}
                  className="w-full py-4 rounded-sm uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mb-4"
                >
                  {submittingOrder ? (
                    <span>Opening Payment Gateway...</span>
                  ) : (
                    <>
                      <span>Pay via Razorpay</span>
                      <span>·</span>
                      <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                    </>
                  )}
                </button>

                {/* Gateway Assurance */}
                <div className="p-3.5 bg-[#FAF8F5] rounded border border-[#EBE4DA] text-[11px] text-[var(--brown-mid)] space-y-1.5 leading-relaxed">
                  <p className="font-semibold text-[var(--brown-dark)]">
                    🔒 Razorpay Test Mode Active
                  </p>
                  <p>
                    Payments are encrypted and processed securely. Card numbers and CVVs are strictly handled directly by the gateway and never stored on BharatBazaar servers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
