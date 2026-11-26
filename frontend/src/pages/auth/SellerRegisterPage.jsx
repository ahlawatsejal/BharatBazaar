import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

const CRAFT_CATEGORIES = [
  'Handloom & Textiles',
  'Pottery & Ceramics',
  'Jewellery & Accessories',
  'Home Décor & Woodcraft',
  'Traditional Paintings (Madhubani, Warli, etc.)',
  'Bamboo & Cane Crafts',
  'Leather & Footwear',
  'Metalwork & Brassware',
  'Other Traditional Indian Craft',
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi NCR',
];

export default function SellerRegisterPage() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    store_name: '',
    business_description: '',
    state: '',
    city: '',
    craft_category: '',
    password: '',
    confirm_password: '',
    terms_accepted: false,
  });

  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { registerSeller } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateStep1 = () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setFormError('Please enter your first and last name.');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    if (!formData.phone_number.trim() || formData.phone_number.length < 10) {
      setFormError('Please enter a valid phone number (at least 10 digits).');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.store_name.trim()) {
      setFormError('Please choose a storefront name for your craft brand.');
      return false;
    }
    if (!formData.business_description.trim() || formData.business_description.length < 20) {
      setFormError('Please describe your craft and workshop in at least 20 characters.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.state) {
      setFormError('Please select the Indian state of origin for your craft.');
      return false;
    }
    if (!formData.city.trim()) {
      setFormError('Please specify the city, town, or village of your workshop.');
      return false;
    }
    if (!formData.craft_category) {
      setFormError('Please select your primary craft category.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setFormError('');
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) setStep(4);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!formData.terms_accepted) {
      setFormError('You must agree to the Seller Terms and Artisan Authenticity Charter.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerSeller({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim(),
        store_name: formData.store_name.trim(),
        business_description: formData.business_description.trim(),
        state: formData.state,
        city: formData.city.trim(),
        craft_category: formData.craft_category,
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      // Redirect to the pending status page immediately
      navigate('/seller/pending', { replace: true });
    } catch (err) {
      setFormError(err.message || 'Application failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#F8F5F0' }} className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header Banner */}
          <div className="text-center mb-8">
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: '#9D294D',
                fontSize: '24px',
                fontWeight: '700',
                letterSpacing: '0.18em',
                display: 'block',
              }}
            >
              BHARATBAZAAR
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: '#7A5C4A',
                fontSize: '9.5px',
                fontWeight: '600',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginTop: '2px',
                display: 'block',
              }}
            >
              BHARATBAZAAR ARTISAN ALLIANCE
            </span>
            <h1
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: '#2F211B',
                fontSize: '30px',
                fontWeight: '700',
                marginTop: '16px',
              }}
            >
              Artisan &amp; MSME Seller Application
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: '#7A5C4A',
                fontSize: '13.5px',
                marginTop: '6px',
                maxWidth: '520px',
                margin: '6px auto 0',
              }}
            >
              Join India’s premier handmade marketplace. Direct seller payouts, low commission, and
              reach customers across India.
            </p>
          </div>

          {/* Curatorial Notice Box */}
          <div
            className="mb-8 p-4 rounded-sm border"
            style={{
              background: '#FFF9F2',
              borderColor: '#EBD8C3',
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">📜</span>
              <div>
                <h2
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#2F211B',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Curatorial Verification Policy
                </h2>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    color: '#7A5C4A',
                    lineHeight: '1.6',
                    marginTop: '2px',
                  }}
                >
                  To protect genuine handmade heritage and Indian artisans, all seller
                  applications are placed in <strong>PENDING</strong> review. Our team will verify
                  your craft authenticity before storefront activation.
                </p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div
            className="bg-white p-8 sm:p-10 shadow-sm border"
            style={{ borderColor: '#E8DED2' }}
          >
            {/* Step Progress Bar */}
            <div className="flex items-center justify-between mb-8 pb-5 border-b border-[#F0EBE3]">
              {[
                { n: 1, label: 'Personal' },
                { n: 2, label: 'Store' },
                { n: 3, label: 'Craft Origin' },
                { n: 4, label: 'Security' },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-2">
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: step >= s.n ? '#9D294D' : '#F0EBE3',
                      color: step >= s.n ? '#FFFFFF' : '#8B6F5E',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                    className="flex items-center justify-center transition-colors"
                  >
                    {s.n}
                  </div>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '11px',
                      fontWeight: step === s.n ? '700' : '500',
                      color: step >= s.n ? '#2F211B' : '#A09080',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                    className="hidden sm:inline"
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {formError && (
              <div
                className="mb-6 p-3 text-xs rounded-sm border"
                style={{
                  background: '#FFF5F5',
                  borderColor: '#FED7D7',
                  color: '#C53030',
                  fontFamily: "'DM Sans', sans-serif",
                }}
                role="alert"
              >
                {formError}
              </div>
            )}

            {/* Step 1: Personal Details */}
            {step === 1 && (
              <div className="space-y-4">
                <h2
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '19px',
                    fontWeight: '700',
                    color: '#2F211B',
                    marginBottom: '14px',
                  }}
                >
                  Step 1: Artisan / Representative Personal Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="seller-reg-first-name" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                      First Name
                    </label>
                    <input
                      id="seller-reg-first-name"
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="e.g. Ramesh"
                      className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                    />
                  </div>
                  <div>
                    <label htmlFor="seller-reg-last-name" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                      Last Name
                    </label>
                    <input
                      id="seller-reg-last-name"
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="e.g. Prajapati"
                      className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="seller-reg-email" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    id="seller-reg-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ramesh.bluepottery@example.com"
                    className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                  />
                  <p className="text-[11px] text-[#8B6F5E] mt-1">
                    This email will serve as your primary seller login credential.
                  </p>
                </div>

                <div>
                  <label htmlFor="seller-reg-phone" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                    Primary Contact Phone Number
                  </label>
                  <input
                    id="seller-reg-phone"
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="+91 98290 12345"
                    className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                  />
                  <p className="text-[11px] text-[#8B6F5E] mt-1">
                    Used for order dispatch notifications and verification.
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{ background: '#9D294D' }}
                    className="px-6 py-2.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-[#831F3E] transition-colors"
                  >
                    Continue to Store Details →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Store / Brand Details */}
            {step === 2 && (
              <div className="space-y-4">
                <h2
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '19px',
                    fontWeight: '700',
                    color: '#2F211B',
                    marginBottom: '14px',
                  }}
                >
                  Step 2: Store &amp; Craft Studio Information
                </h2>

                <div>
                  <label htmlFor="seller-reg-store-name" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                    Storefront / Brand Name
                  </label>
                  <input
                    id="seller-reg-store-name"
                    type="text"
                    name="store_name"
                    value={formData.store_name}
                    onChange={handleChange}
                    placeholder="e.g. Jaipur Blue Pottery Guild"
                    className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                  />
                  <p className="text-[11px] text-[#8B6F5E] mt-1">
                    This will appear on your public seller profile and product listings.
                  </p>
                </div>

                <div>
                  <label htmlFor="seller-reg-description" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                    Artisan Story &amp; Workshop Description
                  </label>
                  <textarea
                    id="seller-reg-description"
                    rows={4}
                    name="business_description"
                    value={formData.business_description}
                    onChange={handleChange}
                    placeholder="Tell customers about your craft lineage, materials used, number of artisans in your cluster, and tradition…"
                    className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                  />
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 text-xs font-bold text-[#4A3728] border border-[#D4C8B8] uppercase tracking-wider hover:bg-[#FCFAF7]"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{ background: '#9D294D' }}
                    className="px-6 py-2.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-[#831F3E]"
                  >
                    Continue to Craft Origin →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Location and Craft Category */}
            {step === 3 && (
              <div className="space-y-4">
                <h2
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '19px',
                    fontWeight: '700',
                    color: '#2F211B',
                    marginBottom: '14px',
                  }}
                >
                  Step 3: Geographic Origin &amp; Craft Tradition
                </h2>

                <div>
                  <label htmlFor="seller-reg-state" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                    State of Origin
                  </label>
                  <select
                    id="seller-reg-state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                  >
                    <option value="">Select Indian State…</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="seller-reg-city" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                    City / Town / Craft Village
                  </label>
                  <input
                    id="seller-reg-city"
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Sanganer, Jaipur"
                    className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                  />
                </div>

                <div>
                  <label htmlFor="seller-reg-craft" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                    Primary Craft Tradition
                  </label>
                  <select
                    id="seller-reg-craft"
                    name="craft_category"
                    value={formData.craft_category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                  >
                    <option value="">Select Craft Category…</option>
                    {CRAFT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 text-xs font-bold text-[#4A3728] border border-[#D4C8B8] uppercase tracking-wider hover:bg-[#FCFAF7]"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{ background: '#9D294D' }}
                    className="px-6 py-2.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-[#831F3E]"
                  >
                    Continue to Security →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Password and Terms */}
            {step === 4 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '19px',
                    fontWeight: '700',
                    color: '#2F211B',
                    marginBottom: '14px',
                  }}
                >
                  Step 4: Account Security &amp; Artisan Declaration
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="seller-reg-password" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                      Set Password
                    </label>
                    <input
                      id="seller-reg-password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                    />
                  </div>

                  <div>
                    <label htmlFor="seller-reg-confirm-password" className="block text-xs font-semibold text-[#4A3728] uppercase tracking-wider mb-1">
                      Confirm Password
                    </label>
                    <input
                      id="seller-reg-confirm-password"
                      type="password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      required
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 border border-[#D4C8B8] bg-[#FCFAF7] text-sm outline-none focus:border-[#9D294D]"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <label htmlFor="seller-reg-terms" className="flex items-start gap-2.5 text-xs text-[#4A3728] cursor-pointer select-none">
                    <input
                      id="seller-reg-terms"
                      type="checkbox"
                      name="terms_accepted"
                      checked={formData.terms_accepted}
                      onChange={handleChange}
                      required
                      className="mt-0.5 rounded border-[#D4C8B8] text-[#9D294D] focus:ring-0"
                    />
                    <span>
                      I declare that all products listed will be authentic handcrafted Indian goods,
                      produced either by myself or through direct artisan partnerships. I agree to
                      BharatBazaar’s Seller Terms and Commission Policy.
                    </span>
                  </label>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 text-xs font-bold text-[#4A3728] border border-[#D4C8B8] uppercase tracking-wider hover:bg-[#FCFAF7]"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ background: '#9D294D' }}
                    className="px-7 py-2.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-[#831F3E] disabled:opacity-60"
                  >
                    {isSubmitting ? 'Submitting Application…' : 'Submit Seller Application'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Link back */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[#7A5C4A]">
              Already registered as a seller?{' '}
              <Link to="/login" className="text-[#9D294D] font-bold hover:underline">
                Sign In to Seller Workspace
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
