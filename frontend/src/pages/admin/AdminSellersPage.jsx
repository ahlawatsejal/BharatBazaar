import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Sellers' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'SUSPENDED', label: 'Suspended' },
];

const STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  SUSPENDED: 'bg-stone-200 text-stone-800 border-stone-300',
};

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Action modal state: { type: 'approve'|'reject'|'suspend'|'reactivate', seller }
  const [actionModal, setActionModal] = useState(null);
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [modalError, setModalError] = useState('');

  const loadSellers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getSellers({
        status: statusFilter,
        search: searchQuery,
        page,
        pageSize,
      });
      setSellers(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load seller applications.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadSellers();
    });
    return () => {
      active = false;
    };
  }, [loadSellers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleStatusChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    setPage(1);
  };

  const openModal = (type, seller) => {
    setActionModal({ type, seller });
    setReason('');
    setAdminNotes('');
    setModalError('');
  };

  const closeModal = () => {
    if (submitting) return;
    setActionModal(null);
    setReason('');
    setAdminNotes('');
    setModalError('');
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!actionModal) return;

    const { type, seller } = actionModal;
    if ((type === 'reject' || type === 'suspend') && !reason.trim()) {
      setModalError('A clear reason is required before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');
      let res;
      if (type === 'approve') {
        res = await adminService.approveSeller(seller.id, adminNotes);
      } else if (type === 'reject') {
        res = await adminService.rejectSeller(seller.id, reason.trim(), adminNotes);
      } else if (type === 'suspend') {
        res = await adminService.suspendSeller(seller.id, reason.trim(), adminNotes);
      } else if (type === 'reactivate') {
        res = await adminService.reactivateSeller(seller.id, adminNotes);
      }
      setFeedback(res?.message || 'Seller status updated successfully.');
      setActionModal(null);
      await loadSellers();
    } catch (err) {
      setModalError(err.message || 'Action failed. Please try again.');
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
              Storefront Governance
            </span>
            <h1
              className="text-2xl font-bold text-[#2C2C2C] mt-1"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              Seller Applications & Storefronts
            </h1>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Review artisan applications, verify workshop details, and manage active storefront statuses.
            </p>
          </div>
          <div className="text-xs font-semibold text-[#7A5C4A] bg-[#FAF7F2] px-3 py-2 rounded-sm border border-[#E8DED2]">
            {totalCount} {totalCount === 1 ? 'seller' : 'sellers'} matched
          </div>
        </div>

        {/* Feedback / Error banners */}
        {feedback && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback('')}
              className="font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadSellers} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* Filter Tabs & Search */}
        <div className="p-4 bg-white rounded-sm border border-[#E8DED2] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleStatusChange(tab.key)}
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
              placeholder="Search store, owner name, or email..."
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
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-[#7A5C4A] hover:text-[#2C2C2C] cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Sellers Table */}
        <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-[#7A5C4A]">
              Loading seller applications...
            </div>
          ) : sellers.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-[#2C2C2C]">No seller applications found</p>
              <p className="text-xs text-[#7A5C4A]">
                Try clearing your search query or switching the status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DED2] text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                    <th className="py-3 px-4">Storefront</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Location & Craft</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Applied</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE3] text-xs">
                  {sellers.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/admin/sellers/${s.id}`}
                          className="font-bold text-[#2C2C2C] hover:text-[#C0522B]"
                        >
                          {s.store_name}
                        </Link>
                        <div className="text-[11px] text-[#7A5C4A] mt-0.5">
                          {s.products_count ?? 0} products
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#2C2C2C]">{s.owner_name}</div>
                        <div className="text-[11px] text-[#7A5C4A]">{s.owner_email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#4A3728]">
                        <div>{s.craft_category}</div>
                        <div className="text-[11px] text-[#7A5C4A]">
                          {s.city}, {s.state}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            STATUS_BADGE[s.application_status] || 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {s.application_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-[#7A5C4A]">
                        {new Date(s.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          <Link
                            to={`/admin/sellers/${s.id}`}
                            className="px-2.5 py-1 text-[11px] font-semibold border border-[#E8DED2] rounded-sm text-[#2C2C2C] hover:bg-[#FAF7F2]"
                          >
                            View
                          </Link>

                          {s.application_status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openModal('approve', s)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-sm hover:bg-emerald-700 cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => openModal('reject', s)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-red-600 text-white rounded-sm hover:bg-red-700 cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {s.application_status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => openModal('suspend', s)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-stone-700 text-white rounded-sm hover:bg-stone-800 cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}

                          {s.application_status === 'SUSPENDED' && (
                            <button
                              type="button"
                              onClick={() => openModal('reactivate', s)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-[#C0522B] text-white rounded-sm hover:opacity-90 cursor-pointer"
                            >
                              Reactivate
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

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <div className="px-4 py-3 bg-[#FAF7F2] border-t border-[#E8DED2] flex items-center justify-between text-xs text-[#7A5C4A]">
              <span>
                Page {page} of {totalPages}
              </span>
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

      {/* Confirmation / Reason Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-[#E8DED2] max-w-md w-full p-6 shadow-xl">
            <h3
              className="text-lg font-bold text-[#2C2C2C]"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              {actionModal.type === 'approve' && 'Approve Seller Application'}
              {actionModal.type === 'reject' && 'Reject Seller Application'}
              {actionModal.type === 'suspend' && 'Suspend Seller Storefront'}
              {actionModal.type === 'reactivate' && 'Reactivate Seller Storefront'}
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Storefront: <strong className="text-[#2C2C2C]">{actionModal.seller.store_name}</strong>
            </p>

            <form onSubmit={handleConfirmAction} className="mt-4 space-y-3">
              {(actionModal.type === 'reject' || actionModal.type === 'suspend') && (
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    {actionModal.type === 'reject' ? 'Rejection Reason *' : 'Suspension Reason *'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide a clear reason that will be shared with the seller..."
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-[#FAF7F2] focus:outline-none focus:border-[#C0522B]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Internal Admin Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Optional administrative review notes..."
                  className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-[#FAF7F2] focus:outline-none focus:border-[#C0522B]"
                />
              </div>

              {modalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm">
                  {modalError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold border border-[#E8DED2] rounded-sm text-[#4A3728] hover:bg-[#FAF7F2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-sm cursor-pointer disabled:opacity-60"
                  style={{
                    background:
                      actionModal.type === 'reject'
                        ? '#DC2626'
                        : actionModal.type === 'suspend'
                        ? '#44403C'
                        : '#C0522B',
                  }}
                >
                  {submitting ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
