import { useState, useEffect } from 'react';
import CustomerLayout from '../../components/customer/CustomerLayout';
import AddressCard from '../../components/customer/AddressCard';
import { orderService } from '../../services/orderService';

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
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

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await orderService.getAddresses();
      setAddresses(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch addresses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadAddresses();
    });
    return () => {
      active = false;
    };
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      full_name: '',
      phone_number: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      is_default: addresses.length === 0,
    });
    setShowModal(true);
  };

  const openEditModal = (addr) => {
    setEditingId(addr.id);
    setFormData({
      full_name: addr.full_name || '',
      phone_number: addr.phone_number || '',
      address_line_1: addr.address_line_1 || '',
      address_line_2: addr.address_line_2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postal_code: addr.postal_code || '',
      country: addr.country || 'India',
      is_default: Boolean(addr.is_default),
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      setActionLoading(true);
      await orderService.deleteAddress(id);
      setSuccessMsg('Address successfully deleted.');
      await loadAddresses();
    } catch (err) {
      setError(err.message || 'Failed to delete address.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      setActionLoading(true);
      await orderService.setDefaultAddress(id);
      setSuccessMsg('Default shipping address updated.');
      await loadAddresses();
    } catch (err) {
      setError(err.message || 'Failed to update default address.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError('');
      if (editingId) {
        await orderService.updateAddress(editingId, formData);
        setSuccessMsg('Address updated successfully.');
      } else {
        await orderService.createAddress(formData);
        setSuccessMsg('New shipping address saved.');
      }
      setShowModal(false);
      await loadAddresses();
    } catch (err) {
      setError(err.message || 'Failed to save address.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <CustomerLayout
      title="Saved Addresses"
      subtitle="Manage your residential delivery destinations for Indian handicraft consignments."
    >
      <div className="space-y-6">
        {/* Header Action */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--brown-mid)]">
            Total destinations: <strong className="text-[var(--brown-dark)]">{addresses.length}</strong>
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-white transition-colors cursor-pointer"
            style={{ background: 'var(--burgundy)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add New Address
          </button>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
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

        {/* Address Cards Grid */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
            <div className="inline-block animate-spin w-8 h-8 border-3 border-[var(--burgundy)] border-t-transparent rounded-full mb-3" />
            <p className="text-xs text-[var(--brown-mid)]">Loading addresses...</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#FAF8F5] border border-[#EBE4DA] flex items-center justify-center text-[var(--brown-mid)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3
              className="text-base font-semibold text-[var(--brown-dark)]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              No Destinations Saved
            </h3>
            <p className="text-xs text-[var(--brown-mid)] mt-1 max-w-sm mx-auto">
              Save your primary residence or gift destinations to expedite checkout on authentic artisan orders.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-sm cursor-pointer"
              style={{ background: 'var(--burgundy)' }}
            >
              Add First Address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
                isActionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Address Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-lg w-full p-6 rounded-sm border border-[#D6CCC2] shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F2ECE4]">
              <h3
                className="text-base font-semibold text-[var(--brown-dark)]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {editingId ? 'Edit Shipping Address' : 'Add New Shipping Address'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[var(--brown-light)] hover:text-[var(--brown-dark)] text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="addr-full-name" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                    Full Name *
                  </label>
                  <input
                    id="addr-full-name"
                    name="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                    placeholder="Recipient name"
                  />
                </div>

                <div>
                  <label htmlFor="addr-phone" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                    Phone Number *
                  </label>
                  <input
                    id="addr-phone"
                    name="phone_number"
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="addr-line-1" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                  Street Address / House No. *
                </label>
                <input
                  id="addr-line-1"
                  name="address_line_1"
                  type="text"
                  required
                  value={formData.address_line_1}
                  onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                  placeholder="Flat, floor, building, street"
                />
              </div>

              <div>
                <label htmlFor="addr-line-2" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                  Apartment, Landmark, Suite (Optional)
                </label>
                <input
                  id="addr-line-2"
                  name="address_line_2"
                  type="text"
                  value={formData.address_line_2}
                  onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                  placeholder="Near landmark"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="addr-city" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                    City *
                  </label>
                  <input
                    id="addr-city"
                    name="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                    placeholder="e.g. Jaipur"
                  />
                </div>

                <div>
                  <label htmlFor="addr-state" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                    State *
                  </label>
                  <input
                    id="addr-state"
                    name="state"
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                    placeholder="e.g. Rajasthan"
                  />
                </div>

                <div>
                  <label htmlFor="addr-postal" className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                    PIN Code *
                  </label>
                  <input
                    id="addr-postal"
                    name="postal_code"
                    type="text"
                    required
                    pattern="[0-9]{6}"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                    placeholder="6 digits"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label htmlFor="addr-default" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="addr-default"
                    name="is_default"
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-[#D6CCC2] text-[var(--burgundy)] focus:ring-[var(--burgundy)]"
                  />
                  <span className="text-xs font-medium text-[var(--brown-dark)]">
                    Set as default shipping address
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-[var(--brown-dark)] hover:bg-[#FAF8F5] rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-sm transition-all cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--burgundy)' }}
                >
                  {actionLoading ? 'Saving...' : editingId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
