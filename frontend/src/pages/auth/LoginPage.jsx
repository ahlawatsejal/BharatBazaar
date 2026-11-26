import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await login(email, password);
      const user = data.user;

      // Check if redirect was requested via state
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Role-based redirect
      if (user.role === 'CUSTOMER') {
        navigate('/customer/dashboard', { replace: true });
      } else if (user.role === 'SELLER') {
        const appStatus = user.seller_profile?.application_status || user.application_status;
        if (user.is_approved_seller && appStatus === 'APPROVED') {
          navigate('/seller/dashboard', { replace: true });
        } else if (appStatus === 'REJECTED') {
          navigate('/seller/rejected', { replace: true });
        } else {
          navigate('/seller/pending', { replace: true });
        }
      } else if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setFormError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#F8F5F0' }} className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-14 px-4 sm:px-6 lg:px-8">
        <div
          className="w-full max-w-md bg-white p-8 sm:p-10 shadow-sm border"
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
              Welcome Back
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: '#7A5C4A',
                fontSize: '13px',
                marginTop: '6px',
              }}
            >
              Sign in to your customer or artisan seller account
            </p>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="login-email"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  fontWeight: '600',
                  letterSpacing: '0.12em',
                  color: '#4A3728',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Email Address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                style={{
                  border: '1px solid #D4C8B8',
                  background: '#FCFAF7',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  color: '#2F211B',
                }}
                className="w-full px-3.5 py-2.5 outline-none focus:border-[#9D294D] transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '0.12em',
                    color: '#4A3728',
                    textTransform: 'uppercase',
                  }}
                >
                  Password
                </label>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    color: '#8B6F5E',
                  }}
                  title="Password reset feature will be enabled in future updates"
                  className="cursor-not-allowed hover:underline"
                >
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{
                    border: '1px solid #D4C8B8',
                    background: '#FCFAF7',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: '#2F211B',
                  }}
                  className="w-full px-3.5 py-2.5 outline-none focus:border-[#9D294D] transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    color: '#8B6F5E',
                    letterSpacing: '0.06em',
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-[#2F211B] select-none uppercase font-semibold"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
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
              className="w-full py-3 text-white uppercase transition-all duration-150 hover:bg-[#831F3E] hover:-translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Signing In…' : 'Sign In'}
            </button>
          </form>

          {/* Links to Register */}
          <div
            className="mt-8 pt-6 border-t text-center space-y-3"
            style={{ borderColor: '#F0EBE3' }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                color: '#4A3728',
              }}
            >
              New to BharatBazaar?{' '}
              <Link
                to="/register"
                style={{ color: '#9D294D', fontWeight: '600' }}
                className="hover:underline"
              >
                Create a Customer Account
              </Link>
            </p>
            <div className="pt-2">
              <Link
                to="/seller/register"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#2F211B',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
                className="inline-flex items-center gap-1 hover:text-[#9D294D] transition-colors"
              >
                <span>Are you an artisan or maker? Apply to Sell →</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
