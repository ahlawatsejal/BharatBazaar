import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

const STATUS_TABS = [
  { value: 'ALL', label: 'All Requests' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
];

function getStatusBadge(status) {
  switch (status) {
    case 'APPROVED':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REJECTED':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-amber-50 text-amber-800 border-amber-200';
  }
}

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Action modal state
  const [modal, setModal] = useState(null); // { type: 'detail'|'approve'|'reject'|'complete', item }
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadReturns = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getReturns({
        status: statusFilter,
        search: searchQuery,
        page,
        pageSize,
      });
      setReturns(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load return requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReturns();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadReturns]);

  const openModal = (type, item) => {
    setModal({ type, item });
    setReason('');
    setAdminNotes(item.admin_notes || '');
    setModalError('');
  };

  const closeModal = () => {
    if (submitting) return;
    setModal(null);
    setModalError('');
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!modal) return;
    const { type, item } = modal;

    if (type === 'reject' && !reason.trim()) {
      setModalError('A rejection reason is required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');
      let res;
      if (type === 'approve') {
        res = await adminService.approveReturn(item.id, adminNotes.trim());
      } else if (type === 'reject') {
        res = await adminService.rejectReturn(item.id, reason.trim(), adminNotes.trim());
      } else if (type === 'complete') {
        res = await adminService.completeReturn(item.id, adminNotes.trim());
      }
      setFeedback(res?.message || 'Return request updated.');
      setModal(null);
      await loadReturns();
    } catch (err) {
      setModalError(err.message || 'Failed to update return request.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="p-6 bg-white rounded-sm border border-[#E8DED2] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C0522B]">
              Post-Delivery Review
            </span>
            <h1
              className="text-2xl font-bold text-[#2C2C2C] mt-1"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              Return Requests
            </h1>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Review customer return requests per order item. Approving or completing a return does not modify payment status or trigger automatic refunds.
            </p>
          </div>
          <div className="text-xs font-semibold text-[#7A5C4A] bg-[#FAF7F2] px-3 py-2 rounded-sm border border-[#E8DED2]">
            {totalCount} {totalCount === 1 ? 'request' : 'requests'}
          </div>
        </div>

        {feedback && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback('')} className="font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 bg-white rounded-sm border border-[#E8DED2] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm cursor-pointer ${
                  statusFilter === tab.value
                    ? 'bg-[#2C2C2C] text-white'
                    : 'bg-[#FAF7F2] text-[#4A3728] border border-[#E8DED2]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearchQuery(searchInput.trim());
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Order #, product, customer..."
              className="px-3 py-1.5 text-xs border border-[#E8DED2] rounded-sm focus:outline-none focus:border-[#C0522B]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2C2C2C] rounded-sm hover:bg-[#C0522B] cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadReturns} className="underline font-semibold cursor-pointer">
              Retry
            </button>
          </div>
        )}

        <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-[#7A5C4A]">Loading return requests...</div>
          ) : returns.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#7A5C4A]">
              No return requests match the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DED2] text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                    <th className="py-3 px-4">Order &amp; Item</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Seller</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE3] text-xs">
                  {returns.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#2C2C2C]">{r.order_number}</div>
                        <div className="text-[11px] text-[#4A3728]">{r.order_item?.product_name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#2C2C2C]">{r.customer?.full_name}</div>
                        <div className="text-[11px] text-[#7A5C4A]">{r.customer?.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#4A3728]">{r.seller?.store_name}</td>
                      <td className="py-3.5 px-4 text-[#4A3728]">{r.reason_display || r.reason}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getStatusBadge(
                            r.status
                          )}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openModal('detail', r)}
                          className="px-2.5 py-1 text-[11px] font-semibold border border-[#E8DED2] rounded-sm hover:border-[#C0522B] cursor-pointer"
                        >
                          View
                        </button>
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openModal('approve', r)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-700 rounded-sm hover:bg-emerald-800 cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal('reject', r)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-red-600 rounded-sm hover:bg-red-700 cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => openModal('complete', r)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#2C2C2C] rounded-sm hover:bg-[#C0522B] cursor-pointer"
                          >
                            Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="px-4 py-3 bg-[#FAF7F2] border-t border-[#E8DED2] flex items-center justify-between text-xs">
              <span className="text-[#7A5C4A]">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-[#E8DED2] bg-white rounded-sm disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 border border-[#E8DED2] bg-white rounded-sm disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail / Action Modal */}
        {modal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full p-6 rounded-sm border border-[#E8DED2] shadow-xl space-y-4 text-xs">
              <h3
                className="text-base font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                {modal.type === 'detail' && `Return Request #${modal.item.id}`}
                {modal.type === 'approve' && `Approve Return Request #${modal.item.id}?`}
                {modal.type === 'reject' && `Reject Return Request #${modal.item.id}?`}
                {modal.type === 'complete' && `Complete Return Request #${modal.item.id}?`}
              </h3>

              <div className="p-3 bg-[#FAF7F2] border border-[#E8DED2] rounded-sm space-y-1 text-[#4A3728]">
                <p><strong>Order:</strong> {modal.item.order_number} (Payment: {modal.item.order_payment_status})</p>
                <p><strong>Item:</strong> {modal.item.order_item?.product_name} (Qty {modal.item.order_item?.quantity})</p>
                <p><strong>Customer:</strong> {modal.item.customer?.full_name} ({modal.item.customer?.email})</p>
                <p><strong>Reason:</strong> {modal.item.reason_display || modal.item.reason}</p>
                {modal.item.description && <p><strong>Description:</strong> {modal.item.description}</p>}
                {modal.item.rejection_reason && <p><strong>Rejection Reason:</strong> {modal.item.rejection_reason}</p>}
                {modal.item.reviewed_by_email && (
                  <p><strong>Reviewed By:</strong> {modal.item.reviewed_by_email}</p>
                )}
              </div>

              {modal.type === 'detail' ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-1.5 font-semibold border border-[#E8DED2] rounded-sm cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConfirmAction} className="space-y-3">
                  {modal.type === 'reject' && (
                    <div>
                      <label className="block font-bold uppercase text-[10px] text-[#7A5C4A] mb-1">
                        Rejection Reason *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E8DED2] rounded-sm"
                        placeholder="Provide a clear reason for the customer..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold uppercase text-[10px] text-[#7A5C4A] mb-1">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E8DED2] rounded-sm"
                      placeholder="Internal review notes..."
                    />
                  </div>

                  {modalError && <p className="text-red-600">{modalError}</p>}

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#F0EBE3]">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={submitting}
                      className="px-3 py-1.5 font-semibold border border-[#E8DED2] rounded-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 font-semibold text-white bg-[#2C2C2C] rounded-sm hover:bg-[#C0522B] cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Confirm'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
