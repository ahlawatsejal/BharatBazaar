import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import SellerLayout from '../../components/seller/SellerLayout';
import { customerService } from '../../services/customerService';
import { sellerService } from '../../services/sellerService';

export default function SellerSettingsPage() {
  const { user, logout } = useAuth();

  // Personal account info
  const [accountForm, setAccountForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountError, setAccountError] = useState('');

  // Store summary
  const [store, setStore] = useState(user?.seller_profile || null);

  // Password change
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [savingPw, setSavingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    sellerService
      .getStoreProfile()
      .then((data) => {
        if (data) setStore(data);
      })
      .catch(() => {});
  }, []);

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');
    try {
      setSavingAccount(true);
      await customerService.updateProfile(accountForm);
      setAccountSuccess('Personal artisan account details updated.');
    } catch (err) {
      setAccountError(err.message || 'Failed to update account details.');
    } finally {
      setSavingAccount(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.new_password !== pwForm.confirm_new_password) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    if (pwForm.new_password.length < 8) {
      setPwError('New password must be at least 8 characters long.');
      return;
    }

    try {
      setSavingPw(true);
      const res = await customerService.changePassword(pwForm);
      setPwSuccess(res.detail || res.message || 'Password updated securely.');
      setPwForm({ current_password: '', new_password: '', confirm_new_password: '' });
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <SellerLayout
      title="Account & Store Settings"
      subtitle="Manage your personal artisan profile, review verification status, and secure your credentials."
    >
      <div className="max-w-3xl space-y-6">
        {/* ── 1. Storefront & Approval Status Summary ── */}
        <div className="p-6 bg-white rounded-sm border border-[#E8DED2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C0522B]">
              Storefront Verification Status
            </span>
            <h2
              className="text-lg font-bold text-[#2C2C2C] mt-0.5"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              {store?.store_name || 'Artisan Storefront'}
            </h2>
            <p className="text-xs text-[#7A5C4A] mt-0.5">
              {store?.craft_category} • {store?.city}, {store?.state}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800">
              {store?.application_status || 'APPROVED'}
            </span>
            <Link
              to="/seller/store"
              className="px-3.5 py-1.5 rounded-sm text-xs font-semibold border border-[#D6CCC2] text-[#2C2C2C] hover:bg-[#FAF7F2]"
            >
              Edit Store Info
            </Link>
          </div>
        </div>

        {/* ── 2. Seller Account Information ── */}
        <div className="p-6 bg-white rounded-sm border border-[#E8DED2]">
          <h3
            className="text-base font-bold text-[#2C2C2C] pb-3 mb-4 border-b border-[#F0EBE3]"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
          >
            Artisan Account Details
          </h3>

          {accountSuccess && (
            <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs">
              {accountSuccess}
            </div>
          )}
          {accountError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs">
              {accountError}
            </div>
          )}

          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Registered Email (Read-only)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 border border-[#E8DED2] bg-[#FAF7F2] text-[#7A5C4A] rounded-sm text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Account Role
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.role || 'SELLER'}
                  className="w-full px-3 py-2 border border-[#E8DED2] bg-[#FAF7F2] text-[#7A5C4A] rounded-sm text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={accountForm.first_name}
                  onChange={(e) => setAccountForm({ ...accountForm, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={accountForm.last_name}
                  onChange={(e) => setAccountForm({ ...accountForm, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={accountForm.phone_number}
                  onChange={(e) => setAccountForm({ ...accountForm, phone_number: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingAccount}
              className="px-5 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-white cursor-pointer disabled:opacity-50"
              style={{ background: '#C0522B' }}
            >
              {savingAccount ? 'Saving...' : 'Save Account Info'}
            </button>
          </form>
        </div>

        {/* ── 3. Change Password ── */}
        <div className="p-6 bg-white rounded-sm border border-[#E8DED2]">
          <h3
            className="text-base font-bold text-[#2C2C2C] pb-3 mb-4 border-b border-[#F0EBE3]"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
          >
            Security & Password
          </h3>

          {pwSuccess && (
            <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs">
              {pwSuccess}
            </div>
          )}
          {pwError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs">
              {pwError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={pwForm.current_password}
                onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={pwForm.confirm_new_password}
                onChange={(e) => setPwForm({ ...pwForm, confirm_new_password: e.target.value })}
                className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={savingPw}
              className="px-5 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-white cursor-pointer disabled:opacity-50"
              style={{ background: '#2C2C2C' }}
            >
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* ── 4. Session Sign Out ── */}
        <div className="p-5 bg-[#FAF7F2] rounded-sm border border-[#E8DED2] flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
              Session Management
            </h4>
            <p className="text-xs text-[#7A5C4A] mt-0.5">
              Sign out from your artisan workspace on this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-red-700 border border-red-200 bg-white hover:bg-red-50 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </SellerLayout>
  );
}
