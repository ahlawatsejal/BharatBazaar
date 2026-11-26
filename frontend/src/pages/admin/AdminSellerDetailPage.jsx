import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

const STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  SUSPENDED: 'bg-stone-200 text-stone-800 border-stone-300',
};

export default function AdminSellerDetailPage() {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionType, setActionType] = useState(null);
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getSellerDetail(id);
      setSeller(res);
    } catch (err) {
      setError(err.message || 'Failed to load seller details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadDetail();
    });
    return () => {
      active = false;
    };
  }, [loadDetail]);

  const openAction = (type) => {
    setActionType(type);
    setReason('');
    setAdminNotes(seller?.admin_notes || '');
    setActionError('');
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if ((actionType === 'reject' || actionType === 'suspend') && !reason.trim()) {
      setActionError('A reason is required for this action.');
      return;
    }

    try {
      setSubmitting(true);
      setActionError('');
      let res;
      if (actionType === 'approve') {
        res = await adminService.approveSeller(seller.id, adminNotes);
      } else if (actionType === 'reject') {
        res = await adminService.rejectSeller(seller.id, reason.trim(), adminNotes);
      } else if (actionType === 'suspend') {
        res = await adminService.suspendSeller(seller.id, reason.trim(), adminNotes);
      } else if (actionType === 'reactivate') {
        res = await adminService.reactivateSeller(seller.id, adminNotes);
      }
      setSeller(res.seller);
      setFeedback(res.message || 'Seller status updated.');
      setActionType(null);
    } catch (err) {
      setActionError(err.message || 'Failed to update seller status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Link
            to="/admin/sellers"
            className="text-xs font-semibold text-[#C0522B] hover:underline"
          >
            ← Back to Seller Applications
          </Link>
        </div>

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

        {loading ? (
          <div className="p-10 bg-white rounded-sm border border-[#E8DED2] text-center text-xs text-[#7A5C4A]">
            Loading seller application details...
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadDetail} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        ) : seller ? (
          <>
            {/* Top Summary Card */}
            <div className="p-6 bg-white rounded-sm border border-[#E8DED2] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                      STATUS_BADGE[seller.application_status] || 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {seller.application_status}
                  </span>
                  <span className="text-[11px] text-[#7A5C4A]">
                    Applied on{' '}
                    {new Date(seller.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <h1
                  className="text-2xl font-bold text-[#2C2C2C] mt-2"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  {seller.store_name}
                </h1>
                <p className="text-xs text-[#7A5C4A] mt-1">
                  {seller.craft_category} • {seller.city}, {seller.state}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {seller.application_status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => openAction('approve')}
                      className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-sm hover:bg-emerald-700 cursor-pointer"
                    >
                      Approve Application
                    </button>
                    <button
                      type="button"
                      onClick={() => openAction('reject')}
                      className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-sm hover:bg-red-700 cursor-pointer"
                    >
                      Reject Application
                    </button>
                  </>
                )}

                {seller.application_status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => openAction('suspend')}
                    className="px-4 py-2 text-xs font-semibold bg-stone-700 text-white rounded-sm hover:bg-stone-800 cursor-pointer"
                  >
                    Suspend Storefront
                  </button>
                )}

                {seller.application_status === 'SUSPENDED' && (
                  <button
                    type="button"
                    onClick={() => openAction('reactivate')}
                    className="px-4 py-2 text-xs font-semibold bg-[#C0522B] text-white rounded-sm hover:opacity-90 cursor-pointer"
                  >
                    Reactivate Storefront
                  </button>
                )}
              </div>
            </div>

            {/* Storefront Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Total Products
                </span>
                <p className="text-xl font-bold text-[#2C2C2C] mt-1">
                  {seller.stats?.total_products ?? 0}
                </p>
              </div>
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Approved Products
                </span>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {seller.stats?.approved_products ?? 0}
                </p>
              </div>
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Pending Products
                </span>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {seller.stats?.pending_products ?? 0}
                </p>
              </div>
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Total Orders
                </span>
                <p className="text-xl font-bold text-[#2C2C2C] mt-1">
                  {seller.stats?.total_orders ?? 0}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-3">
                <h2
                  className="text-sm font-bold text-[#2C2C2C] pb-2 border-b border-[#F0EBE3]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Storefront & Craft Details
                </h2>
                <div className="text-xs space-y-2 text-[#4A3728]">
                  <div>
                    <span className="font-semibold text-[#2C2C2C]">Craft Category:</span>{' '}
                    {seller.craft_category}
                  </div>
                  <div>
                    <span className="font-semibold text-[#2C2C2C]">Workshop Location:</span>{' '}
                    {seller.city}, {seller.state}
                  </div>
                  <div>
                    <span className="font-semibold text-[#2C2C2C] block mb-1">
                      Business Description:
                    </span>
                    <p className="p-3 bg-[#FAF7F2] border border-[#F0EBE3] rounded-sm leading-relaxed">
                      {seller.business_description || 'No business description provided.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-3">
                <h2
                  className="text-sm font-bold text-[#2C2C2C] pb-2 border-b border-[#F0EBE3]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Owner & Review Audit
                </h2>
                <div className="text-xs space-y-2 text-[#4A3728]">
                  <div>
                    <span className="font-semibold text-[#2C2C2C]">Owner Name:</span>{' '}
                    {seller.owner?.full_name}
                  </div>
                  <div>
                    <span className="font-semibold text-[#2C2C2C]">Email:</span>{' '}
                    {seller.owner?.email}
                  </div>
                  <div>
                    <span className="font-semibold text-[#2C2C2C]">Phone:</span>{' '}
                    {seller.owner?.phone_number || 'Not provided'}
                  </div>
                  <div>
                    <span className="font-semibold text-[#2C2C2C]">Last Reviewed By:</span>{' '}
                    {seller.reviewed_by
                      ? `${seller.reviewed_by.full_name} (${seller.reviewed_by.email})`
                      : 'Not yet reviewed'}
                  </div>
                  {seller.reviewed_at && (
                    <div>
                      <span className="font-semibold text-[#2C2C2C]">Reviewed At:</span>{' '}
                      {new Date(seller.reviewed_at).toLocaleString('en-IN')}
                    </div>
                  )}
                  {seller.status_reason && (
                    <div>
                      <span className="font-semibold text-red-700 block mb-1">
                        Status Reason:
                      </span>
                      <p className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-sm">
                        {seller.status_reason}
                      </p>
                    </div>
                  )}
                  {seller.admin_notes && (
                    <div>
                      <span className="font-semibold text-[#2C2C2C] block mb-1">
                        Admin Notes:
                      </span>
                      <p className="p-2.5 bg-[#FAF7F2] border border-[#F0EBE3] rounded-sm">
                        {seller.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Confirmation / Reason Modal */}
      {actionType && seller && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-[#E8DED2] max-w-md w-full p-6 shadow-xl">
            <h3
              className="text-lg font-bold text-[#2C2C2C]"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              {actionType === 'approve' && 'Confirm Seller Approval'}
              {actionType === 'reject' && 'Confirm Seller Rejection'}
              {actionType === 'suspend' && 'Confirm Storefront Suspension'}
              {actionType === 'reactivate' && 'Confirm Storefront Reactivation'}
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Storefront: <strong className="text-[#2C2C2C]">{seller.store_name}</strong>
            </p>

            <form onSubmit={handleSubmitAction} className="mt-4 space-y-3">
              {(actionType === 'reject' || actionType === 'suspend') && (
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    {actionType === 'reject' ? 'Rejection Reason *' : 'Suspension Reason *'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide a clear reason that will be sent to the seller..."
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-[#FAF7F2] focus:outline-none focus:border-[#C0522B]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Admin Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-[#FAF7F2] focus:outline-none focus:border-[#C0522B]"
                />
              </div>

              {actionError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm">
                  {actionError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionType(null)}
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
                      actionType === 'reject'
                        ? '#DC2626'
                        : actionType === 'suspend'
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
