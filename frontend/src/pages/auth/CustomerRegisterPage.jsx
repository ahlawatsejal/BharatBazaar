import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function CustomerRegisterPage() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
    terms_accepted: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { registerCustomer } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validations
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!formData.terms_accepted) {
      setFormError('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerCustomer({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      });
      navigate('/customer/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#F8F5F0' }} className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-14 px-4 sm:px-6 lg:px-8">
        <div
          className="w-full max-w-lg bg-white p-8 sm:p-10 shadow-sm border"
          style={{ borderColor: '#E8DED2' }}
        >
          {/* Header */}
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
              BHARATBAZAAR ARTISANS
            </span>
            <h1
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: '#2F211B',
                fontSize: '26px',
                fontWeight: '700',
                marginTop: '16px',
              }}
            >
              Create Customer Account
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: '#7A5C4A',
                fontSize: '13px',
                marginTop: '6px',
              }}
            >
              Discover and purchase authentic handcrafted products across India
            </p>
          </div>

          {/* Error Banner */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-first-name"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '0.12em',
                    color: '#4A3728',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '5px',
                  }}
                >
                  First Name
                </label>
                <input
                  id="reg-first-name"
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="Sejal"
                  style={{
                    border: '1px solid #D4C8B8',
                    background: '#FCFAF7',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: '#2F211B',
                  }}
                  className="w-full px-3 py-2 outline-none focus:border-[#9D294D] transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-last-name"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '0.12em',
                    color: '#4A3728',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '5px',
                  }}
                >
                  Last Name
                </label>
                <input
                  id="reg-last-name"
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  placeholder="Sharma"
                  style={{
                    border: '1px solid #D4C8B8',
                    background: '#FCFAF7',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: '#2F211B',
                  }}
                  className="w-full px-3 py-2 outline-none focus:border-[#9D294D] transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-email"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  fontWeight: '600',
                  letterSpacing: '0.12em',
                  color: '#4A3728',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="sejal@example.com"
                style={{
                  border: '1px solid #D4C8B8',
                  background: '#FCFAF7',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  color: '#2F211B',
                }}
                className="w-full px-3 py-2 outline-none focus:border-[#9D294D] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="reg-phone"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  fontWeight: '600',
                  letterSpacing: '0.12em',
                  color: '#4A3728',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Phone Number (Optional)
              </label>
              <input
                id="reg-phone"
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                style={{
                  border: '1px solid #D4C8B8',
                  background: '#FCFAF7',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  color: '#2F211B',
                }}
                className="w-full px-3 py-2 outline-none focus:border-[#9D294D] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-password"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '0.12em',
                    color: '#4A3728',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '5px',
                  }}
                >
                  Password
                </label>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Min. 8 characters"
                  style={{
                    border: '1px solid #D4C8B8',
                    background: '#FCFAF7',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: '#2F211B',
                  }}
                  className="w-full px-3 py-2 outline-none focus:border-[#9D294D] transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-confirm-password"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '0.12em',
                    color: '#4A3728',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '5px',
                  }}
                >
                  Confirm Password
                </label>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                  placeholder="Repeat password"
                  style={{
                    border: '1px solid #D4C8B8',
                    background: '#FCFAF7',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: '#2F211B',
                  }}
                  className="w-full px-3 py-2 outline-none focus:border-[#9D294D] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label htmlFor="register-show-password" className="flex items-center gap-2 cursor-pointer select-none text-[#4A3728]">
                <input
                  id="register-show-password"
                  name="show_password"
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded border-[#D4C8B8] text-[#9D294D] focus:ring-0"
                />
                <span>Show passwords</span>
              </label>
            </div>

            <div className="pt-2">
              <label htmlFor="register-terms" className="flex items-start gap-2.5 text-xs cursor-pointer select-none text-[#4A3728]">
                <input
                  id="register-terms"
                  type="checkbox"
                  name="terms_accepted"
                  checked={formData.terms_accepted}
                  onChange={handleChange}
                  required
                  className="mt-0.5 rounded border-[#D4C8B8] text-[#9D294D] focus:ring-0"
                />
                <span>
                  I agree to BharatBazaar’s Terms of Service, Artisan Ethics Agreement, and Privacy
                  Policy.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: '#9D294D',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '0.14em',
              }}
              className="w-full py-3 text-white uppercase transition-all duration-150 hover:bg-[#831F3E] hover:-translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {isSubmitting ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          {/* Link to Login */}
          <div
            className="mt-6 pt-5 border-t text-center"
            style={{ borderColor: '#F0EBE3' }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                color: '#4A3728',
              }}
            >
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#9D294D', fontWeight: '600' }} className="hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
