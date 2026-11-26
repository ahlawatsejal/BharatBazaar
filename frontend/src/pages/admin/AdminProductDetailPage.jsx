import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

const STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  INACTIVE: 'bg-stone-200 text-stone-800 border-stone-300',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function AdminProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionType, setActionType] = useState(null);
  const [reason, setReason] = useState('');
  const [adminFeedback, setAdminFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getProductDetail(id);
      setProduct(res);
    } catch (err) {
      setError(err.message || 'Failed to load product details.');
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
    setAdminFeedback('');
    setActionError('');
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if ((actionType === 'reject' || actionType === 'suspend') && !reason.trim()) {
      setActionError('A moderation reason is required.');
      return;
    }

    try {
      setSubmitting(true);
      setActionError('');
      let res;
      if (actionType === 'approve') {
        res = await adminService.approveProduct(product.id, adminFeedback);
      } else if (actionType === 'reject') {
        res = await adminService.rejectProduct(product.id, reason.trim());
      } else if (actionType === 'suspend') {
        res = await adminService.suspendProduct(product.id, reason.trim());
      }
      setProduct(res.product);
      setFeedback(res.message || 'Product moderation status updated.');
      setActionType(null);
    } catch (err) {
      setActionError(err.message || 'Failed to update product status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Link to="/admin/products" className="text-xs font-semibold text-[#C0522B] hover:underline">
            ← Back to Product Moderation Queue
          </Link>
        </div>

        {feedback && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback('')} className="font-bold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-10 bg-white rounded-sm border border-[#E8DED2] text-center text-xs text-[#7A5C4A]">
            Loading product details...
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadDetail} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        ) : product ? (
          <>
            {/* Top Summary */}
            <div className="p-6 bg-white rounded-sm border border-[#E8DED2] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {product.primary_image && (
                  <img
                    src={product.primary_image}
                    alt={product.name}
                    className="w-20 h-20 rounded-sm object-cover border border-[#E8DED2] shrink-0"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                        STATUS_BADGE[product.approval_status] || 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {product.approval_status}
                    </span>
                    <span className="text-[11px] text-[#7A5C4A]">SKU: {product.sku}</span>
                  </div>
                  <h1
                    className="text-2xl font-bold text-[#2C2C2C] mt-1.5"
                    style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                  >
                    {product.name}
                  </h1>
                  <p className="text-xs text-[#7A5C4A] mt-1">
                    {product.category?.name} • {product.craft_type} • {product.origin_city}, {product.origin_state}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                {(product.approval_status === 'PENDING' || product.approval_status === 'INACTIVE') && (
                  <button
                    type="button"
                    onClick={() => openAction('approve')}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-sm hover:bg-emerald-700 cursor-pointer"
                  >
                    Approve Product
                  </button>
                )}
                {product.approval_status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => openAction('reject')}
                    className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-sm hover:bg-red-700 cursor-pointer"
                  >
                    Reject Product
                  </button>
                )}
                {product.approval_status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => openAction('suspend')}
                    className="px-4 py-2 text-xs font-semibold bg-stone-700 text-white rounded-sm hover:bg-stone-800 cursor-pointer"
                  >
                    Suspend Product
                  </button>
                )}
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  List Price
                </span>
                <p className="text-xl font-bold text-[#2C2C2C] mt-1">
                  ₹{Number(product.price).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Discount Price
                </span>
                <p className="text-xl font-bold text-[#C0522B] mt-1">
                  {product.discount_price
                    ? `₹${Number(product.discount_price).toLocaleString('en-IN')}`
                    : '—'}
                </p>
              </div>
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Available Stock
                </span>
                <p className="text-xl font-bold text-[#2C2C2C] mt-1">{product.available_stock}</p>
              </div>
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Seller Status
                </span>
                <p className="text-sm font-bold text-[#2C2C2C] mt-1.5">
                  {product.seller?.application_status}
                </p>
              </div>
            </div>

            {/* Product Details & Moderation History */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-3">
                <h2
                  className="text-sm font-bold text-[#2C2C2C] pb-2 border-b border-[#F0EBE3]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Product Story & Specifications
                </h2>
                <div className="text-xs space-y-2 text-[#4A3728]">
                  <p className="p-3 bg-[#FAF7F2] border border-[#F0EBE3] rounded-sm leading-relaxed">
                    {product.description}
                  </p>
                  {product.materials && (
                    <div>
                      <span className="font-semibold text-[#2C2C2C]">Materials:</span> {product.materials}
                    </div>
                  )}
                  {product.dimensions && (
                    <div>
                      <span className="font-semibold text-[#2C2C2C]">Dimensions:</span> {product.dimensions}
                    </div>
                  )}
                  {product.images?.length > 0 && (
                    <div className="pt-2">
                      <span className="font-semibold text-[#2C2C2C] block mb-2">Gallery Images:</span>
                      <div className="flex flex-wrap gap-2">
                        {product.images.map((img) => (
                          <img
                            key={img.id}
                            src={img.image_url}
                            alt={img.alt_text || product.name}
                            className="w-16 h-16 object-cover rounded-sm border border-[#E8DED2]"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-3">
                <h2
                  className="text-sm font-bold text-[#2C2C2C] pb-2 border-b border-[#F0EBE3]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Seller & Moderation Audit
                </h2>
                <div className="text-xs space-y-2 text-[#4A3728]">
                  <div>
                    <span className="font-semibold text-[#2C2C2C]">Storefront:</span>{' '}
                    <Link
                      to={`/admin/sellers/${product.seller?.id}`}
                      className="text-[#C0522B] font-semibold hover:underline"
                    >
                      {product.seller?.store_name}
                    </Link>
                  </div>
                  <div>
                    <span className="font-semibold text-[#2C2C2C]">Owner:</span>{' '}
                    {product.seller?.owner_name} ({product.seller?.owner_email})
                  </div>
                  <div>
                    <span className="font-semibold text-[#2C2C2C]">Last Reviewed By:</span>{' '}
                    {product.reviewed_by
                      ? `${product.reviewed_by.full_name} (${product.reviewed_by.email})`
                      : 'Not yet reviewed'}
                  </div>
                  {product.reviewed_at && (
                    <div>
                      <span className="font-semibold text-[#2C2C2C]">Reviewed At:</span>{' '}
                      {new Date(product.reviewed_at).toLocaleString('en-IN')}
                    </div>
                  )}
                  {product.admin_feedback && (
                    <div>
                      <span className="font-semibold text-[#2C2C2C] block mb-1">
                        Moderation Feedback:
                      </span>
                      <p className="p-2.5 bg-[#FAF7F2] border border-[#E8DED2] rounded-sm">
                        {product.admin_feedback}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Action Modal */}
      {actionType && product && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-[#E8DED2] max-w-md w-full p-6 shadow-xl">
            <h3
              className="text-lg font-bold text-[#2C2C2C]"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              {actionType === 'approve' && 'Confirm Product Approval'}
              {actionType === 'reject' && 'Confirm Product Rejection'}
              {actionType === 'suspend' && 'Confirm Product Suspension'}
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Product: <strong className="text-[#2C2C2C]">{product.name}</strong>
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
                    placeholder="Provide clear moderation feedback for the seller..."
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-[#FAF7F2] focus:outline-none focus:border-[#C0522B]"
                  />
                </div>
              )}

              {actionType === 'approve' && (
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Approval Note (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={adminFeedback}
                    onChange={(e) => setAdminFeedback(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E8DED2] rounded-sm bg-[#FAF7F2] focus:outline-none focus:border-[#C0522B]"
                  />
                </div>
              )}

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
