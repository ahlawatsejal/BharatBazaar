import { useState, useEffect } from 'react';
import SellerLayout from '../../components/seller/SellerLayout';
import { sellerService } from '../../services/sellerService';

export default function SellerStorePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    store_name: '',
    business_description: '',
    craft_category: '',
    state: '',
    city: '',
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await sellerService.getStoreProfile();
      setProfile(data);
      setFormData({
        store_name: data.store_name || '',
        business_description: data.business_description || '',
        craft_category: data.craft_category || '',
        state: data.state || '',
        city: data.city || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load storefront profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadProfile();
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const updated = await sellerService.updateStoreProfile(formData);
      setProfile(updated);
      setSuccess('Artisan storefront details updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update storefront.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SellerLayout
      title="Artisan Storefront Profile"
      subtitle="Public studio identity, craft tradition story, and workshop location."
    >
      <div className="max-w-3xl space-y-6">
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess('')}
              className="text-emerald-700 font-bold"
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
              className="text-red-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="p-6 sm:p-8 rounded-sm bg-white border border-[#E8DED2] shadow-xs">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-[#C0522B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-[#7A5C4A]">Loading storefront details...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Status Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE3]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                    Registered Partner
                  </span>
                  <p className="text-sm font-bold text-[#2C2C2C]">
                    {profile?.seller_name} ({profile?.email})
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Approved
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Public Storefront / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[#C0522B]"
                  placeholder="e.g. Kumawat Blue Art Pottery"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Primary Craft Tradition *
                </label>
                <input
                  type="text"
                  required
                  value={formData.craft_category}
                  onChange={(e) => setFormData({ ...formData, craft_category: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[#C0522B]"
                  placeholder="e.g. Pottery & Ceramics, Handloom Weaving"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Workshop City / Village *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[#C0522B]"
                    placeholder="e.g. Jaipur"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Indian State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[#C0522B]"
                    placeholder="e.g. Rajasthan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Artisan Studio & Technique Story
                </label>
                <textarea
                  rows="4"
                  value={formData.business_description}
                  onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[#C0522B] resize-none"
                  placeholder="Tell patrons about your heritage materials, woodcut techniques, or generational lineage..."
                />
              </div>

              <div className="pt-3 border-t border-[#F0EBE3]">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider text-white transition-opacity cursor-pointer disabled:opacity-50"
                  style={{ background: '#C0522B' }}
                >
                  {saving ? 'Updating...' : 'Save Store Details'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}
