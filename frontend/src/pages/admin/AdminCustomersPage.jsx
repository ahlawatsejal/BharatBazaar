import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

const STATUS_TABS = [
  { key: '', label: 'All Customers' },
  { key: 'true', label: 'Active' },
  { key: 'false', label: 'Inactive' },
];

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [modalError, setModalError] = useState('');

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getCustomers({
        active: activeFilter,
        search: searchQuery,
        page,
        pageSize,
      });
      setCustomers(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, page]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadCustomers();
    });
    return () => {
      active = false;
    };
  }, [loadCustomers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const openModal = (type, customer) => {
    setActionModal({ type, customer });
    setModalError('');
  };

  const closeModal = () => {
    if (submitting) return;
    setActionModal(null);
    setModalError('');
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!actionModal) return;

    const { type, customer } = actionModal;
    try {
      setSubmitting(true);
      setModalError('');
      let res;
      if (type === 'deactivate') {
        res = await adminService.deactivateCustomer(customer.id);
      } else {
        res = await adminService.activateCustomer(customer.id);
      }
      setFeedback(res?.message || 'Customer account updated.');
      setActionModal(null);
      await loadCustomers();
    } catch (err) {
      setModalError(err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="p-6 bg-white rounded-sm border border-[#E8DED2] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C0522B]">
              Patron Directory
            </span>
            <h1
              className="text-2xl font-bold text-[#2C2C2C] mt-1"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              Customer Management
            </h1>
            <p className="text-xs text-[#7A5C4A] mt-1">
              View registered patrons, order history, spending, and manage account statuses.
            </p>
          </div>
          <div className="text-xs font-semibold text-[#7A5C4A] bg-[#FAF7F2] px-3 py-2 rounded-sm border border-[#E8DED2]">
            {totalCount} {totalCount === 1 ? 'customer' : 'customers'} matched
          </div>
        </div>

        {feedback && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback('')} className="font-bold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadCustomers} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* Filter Tabs & Search */}
        <div className="p-4 bg-white rounded-sm border border-[#E8DED2] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setActiveFilter(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#2C2C2C] text-white'
                      : 'bg-[#FAF7F2] text-[#4A3728] hover:bg-[#F0EBE3]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-auto">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, or phone..."
              className="w-full lg:w-72 px-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#E8DED2] rounded-sm text-[#2C2C2C] focus:outline-none focus:border-[#C0522B]"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-sm cursor-pointer shrink-0"
              style={{ background: '#C0522B' }}
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1); }}
                className="px-2.5 py-1.5 text-xs font-semibold text-[#7A5C4A] hover:text-[#2C2C2C] cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-[#7A5C4A]">Loading customers...</div>
          ) : customers.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-[#2C2C2C]">No customers found</p>
              <p className="text-xs text-[#7A5C4A]">Try clearing your search or filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DED2] text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Orders / Spent</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE3] text-xs">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/admin/customers/${c.id}`}
                          className="font-bold text-[#2C2C2C] hover:text-[#C0522B]"
                        >
                          {c.full_name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-[#2C2C2C]">{c.email}</div>
                        <div className="text-[11px] text-[#7A5C4A]">{c.phone_number || '—'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#2C2C2C]">{c.order_count ?? 0} orders</div>
                        <div className="text-[11px] text-[#7A5C4A]">
                          ₹{Number(c.total_spent || 0).toLocaleString('en-IN')} spent
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            c.is_active
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          }`}
                        >
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-[#7A5C4A]">
                        {new Date(c.date_joined).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          <Link
                            to={`/admin/customers/${c.id}`}
                            className="px-2.5 py-1 text-[11px] font-semibold border border-[#E8DED2] rounded-sm text-[#2C2C2C] hover:bg-[#FAF7F2]"
                          >
                            View
                          </Link>
                          {c.is_active ? (
                            <button
                              type="button"
                              onClick={() => openModal('deactivate', c)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-red-600 text-white rounded-sm hover:bg-red-700 cursor-pointer"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openModal('activate', c)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-sm hover:bg-emerald-700 cursor-pointer"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && totalCount > 0 && (
            <div className="px-4 py-3 bg-[#FAF7F2] border-t border-[#E8DED2] flex items-center justify-between text-xs text-[#7A5C4A]">
              <span>Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-[#E8DED2] bg-white rounded-sm font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 border border-[#E8DED2] bg-white rounded-sm font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-[#E8DED2] max-w-md w-full p-6 shadow-xl">
            <h3
              className="text-lg font-bold text-[#2C2C2C]"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              {actionModal.type === 'deactivate' ? 'Deactivate Customer Account' : 'Reactivate Customer Account'}
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Customer: <strong className="text-[#2C2C2C]">{actionModal.customer.full_name}</strong>
              {' '}({actionModal.customer.email})
            </p>

            {actionModal.type === 'deactivate' && (
              <p className="text-xs text-[#7A5C4A] mt-3 p-3 bg-amber-50 border border-amber-200 rounded-sm">
                This will prevent the customer from logging in. All existing orders, reviews, and
                data will be preserved. The customer will be notified.
              </p>
            )}

            {modalError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm">
                {modalError}
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold border border-[#E8DED2] rounded-sm text-[#4A3728] hover:bg-[#FAF7F2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white rounded-sm cursor-pointer disabled:opacity-60"
                style={{ background: actionModal.type === 'deactivate' ? '#DC2626' : '#C0522B' }}
              >
                {submitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
