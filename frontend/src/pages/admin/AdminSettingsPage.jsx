import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

const ANNOUNCEMENT_TYPES = [
  { value: 'INFORMATION', label: 'Information' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'NOTICE', label: 'Notice' },
];

const INITIAL_FORM = {
  marketplace_name: '',
  marketplace_tagline: '',
  support_email: '',
  support_phone: '',
  marketplace_description: '',
  announcement_message: '',
  announcement_enabled: true,
  announcement_type: 'PROMOTION',
  website_url: '',
  instagram_url: '',
  facebook_url: '',
  linkedin_url: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,25}$/;

function isValidHttpUrl(val) {
  if (!val.trim()) return true;
  try {
    const parsed = new URL(val.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [savedSnapshot, setSavedSnapshot] = useState(INITIAL_FORM);
  const [meta, setMeta] = useState({ updated_by_email: null, updated_at: null });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [feedback, setFeedback] = useState('');
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedSnapshot);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminService.getPlatformSettings();
      const loaded = {
        marketplace_name: data.marketplace_name || '',
        marketplace_tagline: data.marketplace_tagline || '',
        support_email: data.support_email || '',
        support_phone: data.support_phone || '',
        marketplace_description: data.marketplace_description || '',
        announcement_message: data.announcement_message || '',
        announcement_enabled: Boolean(data.announcement_enabled),
        announcement_type: data.announcement_type || 'PROMOTION',
        website_url: data.website_url || '',
        instagram_url: data.instagram_url || '',
        facebook_url: data.facebook_url || '',
        linkedin_url: data.linkedin_url || '',
      };
      setForm(loaded);
      setSavedSnapshot(loaded);
      setMeta({
        updated_by_email: data.updated_by_email || null,
        updated_at: data.updated_at || null,
      });
    } catch (err) {
      setError(err.message || 'Failed to load platform settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadSettings();
    });
    return () => {
      active = false;
    };
  }, [loadSettings]);

  // Warn before closing/reloading tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    setFeedback('');
  };

  const validateClient = () => {
    const errs = {};
    if (!form.marketplace_name.trim()) {
      errs.marketplace_name = 'Marketplace name is required.';
    }
    if (!form.support_email.trim() || !EMAIL_RE.test(form.support_email.trim())) {
      errs.support_email = 'Enter a valid support email address.';
    }
    if (form.support_phone.trim() && !PHONE_RE.test(form.support_phone.trim())) {
      errs.support_phone = 'Enter a valid phone number (7–25 characters).';
    }
    if (!isValidHttpUrl(form.website_url)) {
      errs.website_url = 'Enter a valid URL starting with http:// or https://.';
    }
    if (!isValidHttpUrl(form.instagram_url)) {
      errs.instagram_url = 'Enter a valid URL starting with http:// or https://.';
    }
    if (!isValidHttpUrl(form.facebook_url)) {
      errs.facebook_url = 'Enter a valid URL starting with http:// or https://.';
    }
    if (!isValidHttpUrl(form.linkedin_url)) {
      errs.linkedin_url = 'Enter a valid URL starting with http:// or https://.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    if (!validateClient()) return;

    try {
      setSaving(true);
      const res = await adminService.updatePlatformSettings(form);
      const updated = res?.settings || form;
      const synced = {
        marketplace_name: updated.marketplace_name || '',
        marketplace_tagline: updated.marketplace_tagline || '',
        support_email: updated.support_email || '',
        support_phone: updated.support_phone || '',
        marketplace_description: updated.marketplace_description || '',
        announcement_message: updated.announcement_message || '',
        announcement_enabled: Boolean(updated.announcement_enabled),
        announcement_type: updated.announcement_type || 'PROMOTION',
        website_url: updated.website_url || '',
        instagram_url: updated.instagram_url || '',
        facebook_url: updated.facebook_url || '',
        linkedin_url: updated.linkedin_url || '',
      };
      setForm(synced);
      setSavedSnapshot(synced);
      setMeta({
        updated_by_email: updated.updated_by_email || meta.updated_by_email,
        updated_at: updated.updated_at || meta.updated_at,
      });
      setFeedback(res?.message || 'Platform settings saved successfully.');
    } catch (err) {
      if (err.data && typeof err.data === 'object') {
        const mapped = {};
        Object.entries(err.data).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setFieldErrors(mapped);
      }
      setError(err.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardConfirm = () => {
    setForm(savedSnapshot);
    setFieldErrors({});
    setError('');
    setShowDiscardModal(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="p-6 bg-white rounded-sm border border-[#E8DED2] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C0522B]">
              Storefront Configuration
            </span>
            <h1
              className="text-2xl font-bold text-[#2C2C2C] mt-1"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              Platform Settings
            </h1>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Manage public marketplace identity, homepage announcement banner, and social links.
            </p>
          </div>
          {meta.updated_at && (
            <div className="text-[11px] text-[#7A5C4A] bg-[#FAF7F2] px-3 py-2 rounded-sm border border-[#E8DED2]">
              Last updated:{' '}
              <strong className="text-[#2C2C2C]">
                {new Date(meta.updated_at).toLocaleString('en-IN')}
              </strong>
              {meta.updated_by_email && <span className="block">By: {meta.updated_by_email}</span>}
            </div>
          )}
        </div>

        {feedback && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback('')} className="font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadSettings} className="underline font-semibold cursor-pointer">
              Reload
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-10 bg-white rounded-sm border border-[#E8DED2] text-center text-xs text-[#7A5C4A]">
            Loading platform settings...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* 1. Marketplace Information */}
            <div className="p-6 bg-white rounded-sm border border-[#E8DED2] space-y-4">
              <h2
                className="text-base font-bold text-[#2C2C2C] border-b border-[#F0EBE3] pb-2"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Marketplace Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                    Marketplace Name *
                  </label>
                  <input
                    type="text"
                    value={form.marketplace_name}
                    onChange={(e) => handleChange('marketplace_name', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
                  />
                  {fieldErrors.marketplace_name && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.marketplace_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                    Marketplace Tagline
                  </label>
                  <input
                    type="text"
                    value={form.marketplace_tagline}
                    onChange={(e) => handleChange('marketplace_tagline', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                    Support Email *
                  </label>
                  <input
                    type="email"
                    value={form.support_email}
                    onChange={(e) => handleChange('support_email', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
                  />
                  {fieldErrors.support_email && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.support_email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                    Support Phone Number
                  </label>
                  <input
                    type="text"
                    value={form.support_phone}
                    onChange={(e) => handleChange('support_phone', e.target.value)}
                    placeholder="+91 1800-000-0000"
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
                  />
                  {fieldErrors.support_phone && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.support_phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                  Marketplace Description
                </label>
                <textarea
                  rows={3}
                  value={form.marketplace_description}
                  onChange={(e) => handleChange('marketplace_description', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
                />
              </div>
            </div>

            {/* 2. Homepage Announcement */}
            <div className="p-6 bg-white rounded-sm border border-[#E8DED2] space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0EBE3] pb-2">
                <h2
                  className="text-base font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Homepage Announcement
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#2C2C2C] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.announcement_enabled}
                    onChange={(e) => handleChange('announcement_enabled', e.target.checked)}
                    className="accent-[#C0522B]"
                  />
                  Show Announcement Banner
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                    Announcement Message
                  </label>
                  <input
                    type="text"
                    maxLength={280}
                    value={form.announcement_message}
                    onChange={(e) => handleChange('announcement_message', e.target.value)}
                    placeholder="Free shipping on orders above ₹999"
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                    Announcement Type
                  </label>
                  <select
                    value={form.announcement_type}
                    onChange={(e) => handleChange('announcement_type', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-white focus:outline-none focus:border-[#C0522B]"
                  >
                    {ANNOUNCEMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Contact & Social Links */}
            <div className="p-6 bg-white rounded-sm border border-[#E8DED2] space-y-4">
              <h2
                className="text-base font-bold text-[#2C2C2C] border-b border-[#F0EBE3] pb-2"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Contact &amp; Social Links
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'website_url', label: 'Official Website URL', placeholder: 'https://bharatbazaar.in' },
                  { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/bharatbazaar' },
                  { key: 'facebook_url', label: 'Facebook URL', placeholder: 'https://facebook.com/bharatbazaar' },
                  { key: 'linkedin_url', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/company/bharatbazaar' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A] mb-1">
                      {f.label}
                    </label>
                    <input
                      type="url"
                      value={form[f.key]}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
                    />
                    {fieldErrors[f.key] && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors[f.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between p-4 bg-white rounded-sm border border-[#E8DED2]">
              <span className="text-xs text-[#7A5C4A]">
                {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
              </span>
              <div className="flex items-center gap-3">
                {isDirty && (
                  <button
                    type="button"
                    onClick={() => setShowDiscardModal(true)}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-semibold text-[#7A5C4A] border border-[#E8DED2] rounded-sm hover:bg-[#FAF7F2] cursor-pointer"
                  >
                    Discard Changes
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || !isDirty}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#2C2C2C] rounded-sm hover:bg-[#C0522B] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Discard Confirmation Modal */}
        {showDiscardModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full p-6 rounded-sm border border-[#E8DED2] shadow-xl space-y-4">
              <h3
                className="text-base font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Discard Unsaved Changes?
              </h3>
              <p className="text-xs text-[#4A3728]">
                Any edits you made to marketplace information, announcements, or social links will be lost.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#F0EBE3]">
                <button
                  type="button"
                  onClick={() => setShowDiscardModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#4A3728] border border-[#E8DED2] rounded-sm cursor-pointer"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={handleDiscardConfirm}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-sm hover:bg-red-700 cursor-pointer"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
