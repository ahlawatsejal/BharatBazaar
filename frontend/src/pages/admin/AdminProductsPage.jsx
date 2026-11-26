import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Products' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'INACTIVE', label: 'Suspended (Inactive)' },
];

const STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  INACTIVE: 'bg-stone-200 text-stone-800 border-stone-300',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
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

  const [actionModal, setActionModal] = useState(null);
  const [reason, setReason] = useState('');
  const [adminFeedback, setAdminFeedback] = useState('');
  const [modalError, setModalError] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getProducts({
        status: statusFilter,
        search: searchQuery,
        page,
        pageSize,
      });
      setProducts(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadProducts();
    });
    return () => {
      active = false;
    };
  }, [loadProducts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const openModal = (type, product) => {
    setActionModal({ type, product });
    setReason('');
    setAdminFeedback('');
    setModalError('');
  };

  const closeModal = () => {
    if (submitting) return;
    setActionModal(null);
    setReason('');
    setAdminFeedback('');
    setModalError('');
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!actionModal) return;

    const { type, product } = actionModal;
    if ((type === 'reject' || type === 'suspend') && !reason.trim()) {
      setModalError('A clear moderation reason is required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');
      let res;
      if (type === 'approve') {
        res = await adminService.approveProduct(product.id, adminFeedback);
      } else if (type === 'reject') {
        res = await adminService.rejectProduct(product.id, reason.trim());
      } else if (type === 'suspend') {
        res = await adminService.suspendProduct(product.id, reason.trim());
      }
      setFeedback(res?.message || 'Product moderation status updated.');
      setActionModal(null);
      await loadProducts();
    } catch (err) {
      setModalError(err.message || 'Moderation action failed.');
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
              Catalog Curation
            </span>
            <h1
              className="text-2xl font-bold text-[#2C2C2C] mt-1"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              Product Moderation Queue
            </h1>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Review artisan product submissions before they appear in the public BharatBazaar Shop.
            </p>
          </div>
          <div className="text-xs font-semibold text-[#7A5C4A] bg-[#FAF7F2] px-3 py-2 rounded-sm border border-[#E8DED2]">
            {totalCount} {totalCount === 1 ? 'product' : 'products'} matched
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
            <button type="button" onClick={loadProducts} className="font-bold underline cursor-pointer">
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
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setPage(1);
                  }}
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
              placeholder="Search product, seller store, or category..."
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

        {/* Products Table */}
        <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-[#7A5C4A]">
              Loading products for moderation...
            </div>
          ) : products.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-[#2C2C2C]">No products found</p>
              <p className="text-xs text-[#7A5C4A]">
                Try clearing your search query or switching the moderation status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DED2] text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Seller & Category</th>
                    <th className="py-3 px-4">Price / Stock</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE3] text-xs">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {p.primary_image ? (
                            <img
                              src={p.primary_image}
                              alt={p.name}
                              className="w-11 h-11 rounded-sm object-cover border border-[#E8DED2] shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-sm bg-[#FAF7F2] border border-[#E8DED2] flex items-center justify-center text-[10px] text-[#7A5C4A] shrink-0">
                              No Img
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              to={`/admin/products/${p.id}`}
                              className="font-bold text-[#2C2C2C] hover:text-[#C0522B] block truncate max-w-xs"
                            >
                              {p.name}
                            </Link>
                            <span className="text-[11px] text-[#7A5C4A]">SKU: {p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#2C2C2C]">{p.seller_store_name}</div>
                        <div className="text-[11px] text-[#7A5C4A]">{p.category_name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#2C2C2C]">
                          ₹{Number(p.discount_price || p.price).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-[#7A5C4A]">Stock: {p.available_stock}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            STATUS_BADGE[p.approval_status] || 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {p.approval_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          <Link
                            to={`/admin/products/${p.id}`}
                            className="px-2.5 py-1 text-[11px] font-semibold border border-[#E8DED2] rounded-sm text-[#2C2C2C] hover:bg-[#FAF7F2]"
                          >
                            View
                          </Link>

                          {(p.approval_status === 'PENDING' || p.approval_status === 'INACTIVE') && (
                            <button
                              type="button"
                              onClick={() => openModal('approve', p)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-sm hover:bg-emerald-700 cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {p.approval_status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => openModal('reject', p)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-red-600 text-white rounded-sm hover:bg-red-700 cursor-pointer"
                            >
                              Reject
                            </button>
                          )}

                          {p.approval_status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => openModal('suspend', p)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-stone-700 text-white rounded-sm hover:bg-stone-800 cursor-pointer"
                            >
                              Suspend
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
              {actionModal.type === 'approve' && 'Approve Product Listing'}
              {actionModal.type === 'reject' && 'Reject Product Listing'}
              {actionModal.type === 'suspend' && 'Suspend Product Listing'}
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Product: <strong className="text-[#2C2C2C]">{actionModal.product.name}</strong>
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
                    placeholder="Provide clear moderation feedback for the seller..."
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-[#FAF7F2] focus:outline-none focus:border-[#C0522B]"
                  />
                </div>
              )}

              {actionModal.type === 'approve' && (
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Approval Note (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={adminFeedback}
                    onChange={(e) => setAdminFeedback(e.target.value)}
                    placeholder="Optional curatorial note..."
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-[#FAF7F2] focus:outline-none focus:border-[#C0522B]"
                  />
                </div>
              )}

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
                  {submitting ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
