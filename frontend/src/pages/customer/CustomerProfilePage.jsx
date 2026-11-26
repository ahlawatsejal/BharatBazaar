import { useState, useEffect } from 'react';
import CustomerLayout from '../../components/customer/CustomerLayout';
import { customerService } from '../../services/customerService';
import { useAuth } from '../../context/useAuth';

export default function CustomerProfilePage() {
  const { refreshUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    customerService
      .getProfile()
      .then((data) => {
        if (isMounted) {
          setProfileForm({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone_number: data.phone_number || '',
            email: data.email || '',
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err.message || 'Could not load profile details.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    setSaving(true);

    try {
      await customerService.updateProfile({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone_number: profileForm.phone_number,
      });

      setSuccessMessage('Profile details updated successfully!');
      if (refreshUser) refreshUser();
    } catch (err) {
      setErrorMessage(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomerLayout
      title="My Profile"
      subtitle="Manage your personal information and contact details."
    >
      <div className="max-w-2xl bg-white border border-[#EBE4DA] rounded-sm p-6" style={{ fontFamily: 'var(--font-sans)' }}>
        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-sm text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
            <span>✓ {successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-sm text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
            <span>⚠ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-[#EBE4DA] rounded w-full" />
            <div className="h-10 bg-[#EBE4DA] rounded w-full" />
            <div className="h-10 bg-[#EBE4DA] rounded w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* Registered Email (Read-only) */}
            <div>
              <label htmlFor="profile-email" className="block text-[var(--brown-dark)] font-semibold mb-1">
                Registered Email Address
              </label>
              <input
                id="profile-email"
                name="email"
                type="email"
                disabled
                value={profileForm.email}
                className="w-full p-3 border border-[#EBE4DA] rounded-sm bg-[#FAF8F5] text-[var(--brown-mid)] cursor-not-allowed"
              />
              <p className="text-[10.5px] text-[var(--brown-light)] mt-1">
                Your email is used for order confirmations and authentication and cannot be changed.
              </p>
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-first-name" className="block text-[var(--brown-dark)] font-semibold mb-1">
                  First Name *
                </label>
                <input
                  id="profile-first-name"
                  name="first_name"
                  type="text"
                  required
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  className="w-full p-3 border border-[#D6CCC2] rounded-sm focus:border-[var(--burgundy)] outline-none"
                />
              </div>

              <div>
                <label htmlFor="profile-last-name" className="block text-[var(--brown-dark)] font-semibold mb-1">
                  Last Name *
                </label>
                <input
                  id="profile-last-name"
                  name="last_name"
                  type="text"
                  required
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  className="w-full p-3 border border-[#D6CCC2] rounded-sm focus:border-[var(--burgundy)] outline-none"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="profile-phone" className="block text-[var(--brown-dark)] font-semibold mb-1">
                Contact Phone / Mobile Number
              </label>
              <input
                id="profile-phone"
                name="phone_number"
                type="tel"
                value={profileForm.phone_number}
                onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                placeholder="10-digit mobile number"
                className="w-full p-3 border border-[#D6CCC2] rounded-sm focus:border-[var(--burgundy)] outline-none"
              />
              <p className="text-[10.5px] text-[var(--brown-light)] mt-1">
                Used by courier partners for dispatch status and OTP delivery.
              </p>
            </div>

            {/* Role & Verification Badge (Informational) */}
            <div className="p-3.5 bg-[#FAF6F2] rounded border border-[#EBE4DA] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[var(--brown-dark)] block">Account Privilege</span>
                <span className="text-[var(--brown-mid)]">Role: Customer (Patron)</span>
              </div>
              <span className="bg-white px-2.5 py-1 border border-[#D6CCC2] rounded text-[10px] font-bold text-[var(--burgundy)] uppercase">
                Active
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-xs py-3 px-8"
              >
                {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </CustomerLayout>
  );
}
