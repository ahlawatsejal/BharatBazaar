import { useState } from 'react';
import CustomerLayout from '../../components/customer/CustomerLayout';
import { customerService } from '../../services/customerService';

export default function CustomerSecurityPage() {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.new_password !== formData.confirm_new_password) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (formData.new_password.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    try {
      setLoading(true);
      const res = await customerService.changePassword(formData);
      setSuccess(res.message || res.detail || 'Password updated securely.');
      setFormData({
        current_password: '',
        new_password: '',
        confirm_new_password: '',
      });
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerLayout
      title="Account Security"
      subtitle="Manage your credentials, password safety, and authenticated session integrity."
    >
      <div className="max-w-2xl space-y-6">
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess('')}
              className="text-emerald-600 hover:text-emerald-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Change Password Card */}
        <div className="p-6 rounded-sm border border-[#EBE4DA] bg-white">
          <h3
            className="text-sm font-semibold text-[var(--brown-dark)] mb-2"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Update Your Password
          </h3>
          <p className="text-xs text-[var(--brown-mid)] mb-5">
            Ensure your account uses a strong, unique password to safeguard your shipping addresses and order history.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="security-current-password" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                Current Password *
              </label>
              <input
                id="security-current-password"
                name="current_password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.current_password}
                onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label htmlFor="security-new-password" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                New Password *
              </label>
              <input
                id="security-new-password"
                name="new_password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                placeholder="At least 8 characters"
              />
              <p className="text-[11px] text-[var(--brown-light)] mt-1">
                Must be at least 8 characters and satisfy standard security complexity.
              </p>
            </div>

            <div>
              <label htmlFor="security-confirm-password" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                Confirm New Password *
              </label>
              <input
                id="security-confirm-password"
                name="confirm_new_password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={formData.confirm_new_password}
                onChange={(e) => setFormData({ ...formData, confirm_new_password: e.target.value })}
                className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                placeholder="Re-enter new password"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="togglePassword"
                name="show_password"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-[#D6CCC2] text-[var(--burgundy)] focus:ring-[var(--burgundy)] cursor-pointer"
              />
              <label htmlFor="togglePassword" className="text-xs text-[var(--brown-mid)] cursor-pointer">
                Show passwords
              </label>
            </div>

            <div className="pt-3 border-t border-[#F2ECE4]">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white rounded-sm transition-all cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--burgundy)' }}
              >
                {loading ? 'Securing...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Security Best Practices Card */}
        <div className="p-5 rounded-sm border border-[#EBE4DA] bg-[#FDFBF9]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--brown-dark)] mb-2">
            Session & Authentication Notice
          </h4>
          <ul className="text-xs space-y-1.5 text-[var(--brown-mid)] list-disc pl-4 leading-relaxed">
            <li>Passkeys and passwords are encrypted using PBKDF2 with SHA-256 password hashing.</li>
            <li>Your account tokens are cryptographically signed with short-lived JWT validity.</li>
            <li>BharatBazaar never transmits passwords in plain text or asks for passwords over phone or email.</li>
          </ul>
        </div>
      </div>
    </CustomerLayout>
  );
}
