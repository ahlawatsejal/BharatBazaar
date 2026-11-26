import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';

const ORDER_STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-indigo-100 text-indigo-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-sky-100 text-sky-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const PAYMENT_STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-blue-100 text-blue-800',
};

export default function AdminCustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionType, setActionType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getCustomerDetail(id);
      setCustomer(res);
    } catch (err) {
      setError(err.message || 'Failed to load customer details.');
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

  const handleAction = async () => {
    try {
      setSubmitting(true);
      setActionError('');
      let res;
      if (actionType === 'deactivate') {
        res = await adminService.deactivateCustomer(customer.id);
      } else {
        res = await adminService.activateCustomer(customer.id);
      }
      setCustomer(res.customer);
      setFeedback(res.message || 'Account status updated.');
      setActionType(null);
    } catch (err) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const summary = customer?.order_summary || { total_orders: 0, paid_orders: 0, total_spent: '0.00' };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <Link to="/admin/customers" className="text-xs font-semibold text-[#C0522B] hover:underline">
          ← Back to Customer Directory
        </Link>

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
            Loading customer details...
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadDetail} className="font-bold underline cursor-pointer">Retry</button>
          </div>
        ) : customer ? (
          <>
            {/* Top Summary */}
            <div className="p-6 bg-white rounded-sm border border-[#E8DED2] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                      customer.is_active
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}
                  >
                    {customer.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[11px] text-[#7A5C4A]">
                    Registered{' '}
                    {new Date(customer.date_joined).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
                <h1
                  className="text-2xl font-bold text-[#2C2C2C] mt-2"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  {customer.full_name}
                </h1>
                <p className="text-xs text-[#7A5C4A] mt-1">
                  {customer.email}{customer.phone_number ? ` • ${customer.phone_number}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                {customer.is_active ? (
                  <button
                    type="button"
                    onClick={() => { setActionType('deactivate'); setActionError(''); }}
                    className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-sm hover:bg-red-700 cursor-pointer"
                  >
                    Deactivate Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setActionType('activate'); setActionError(''); }}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-sm hover:bg-emerald-700 cursor-pointer"
                  >
                    Reactivate Account
                  </button>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">Total Orders</span>
                <p className="text-xl font-bold text-[#2C2C2C] mt-1">{summary.total_orders}</p>
              </div>
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">Paid Orders</span>
                <p className="text-xl font-bold text-emerald-700 mt-1">{summary.paid_orders}</p>
              </div>
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">Total Spent</span>
                <p className="text-xl font-bold text-[#2C2C2C] mt-1">
                  ₹{Number(summary.total_spent).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">Addresses</span>
                <p className="text-xl font-bold text-[#2C2C2C] mt-1">{customer.addresses?.length ?? 0}</p>
              </div>
            </div>

            {/* Detail Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Addresses */}
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-3">
                <h2
                  className="text-sm font-bold text-[#2C2C2C] pb-2 border-b border-[#F0EBE3]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Saved Addresses
                </h2>
                {(!customer.addresses || customer.addresses.length === 0) ? (
                  <p className="text-xs text-[#7A5C4A]">No saved addresses.</p>
                ) : (
                  <div className="space-y-2.5">
                    {customer.addresses.map((a) => (
                      <div key={a.id} className="p-3 bg-[#FAF7F2] border border-[#F0EBE3] rounded-sm text-xs text-[#4A3728]">
                        <div className="font-semibold text-[#2C2C2C]">
                          {a.full_name}
                          {a.is_default && (
                            <span className="ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-[#C0522B] text-white rounded">Default</span>
                          )}
                        </div>
                        <div className="mt-1">{a.address_line_1}{a.address_line_2 ? `, ${a.address_line_2}` : ''}</div>
                        <div>{a.city}, {a.state} — {a.postal_code}</div>
                        <div className="text-[11px] text-[#7A5C4A] mt-0.5">📞 {a.phone_number}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Orders */}
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-3">
                <h2
                  className="text-sm font-bold text-[#2C2C2C] pb-2 border-b border-[#F0EBE3]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Recent Orders
                </h2>
                {(!customer.recent_orders || customer.recent_orders.length === 0) ? (
                  <p className="text-xs text-[#7A5C4A]">No orders placed.</p>
                ) : (
                  <div className="space-y-2">
                    {customer.recent_orders.map((o) => (
                      <div key={o.order_number} className="p-3 bg-[#FAF7F2] border border-[#F0EBE3] rounded-sm text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#2C2C2C]">{o.order_number}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${ORDER_STATUS_BADGE[o.order_status] || 'bg-stone-100 text-stone-700'}`}>
                              {o.order_status}
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${PAYMENT_STATUS_BADGE[o.payment_status] || 'bg-stone-100 text-stone-700'}`}>
                              {o.payment_status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-[#2C2C2C]">₹{Number(o.total_amount).toLocaleString('en-IN')}</div>
                          <div className="text-[11px] text-[#7A5C4A]">
                            {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Confirm Modal */}
      {actionType && customer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-[#E8DED2] max-w-md w-full p-6 shadow-xl">
            <h3
              className="text-lg font-bold text-[#2C2C2C]"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              {actionType === 'deactivate' ? 'Deactivate Account' : 'Reactivate Account'}
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1">
              Customer: <strong className="text-[#2C2C2C]">{customer.full_name}</strong> ({customer.email})
            </p>

            {actionType === 'deactivate' && (
              <p className="text-xs text-[#7A5C4A] mt-3 p-3 bg-amber-50 border border-amber-200 rounded-sm">
                This will prevent the customer from logging in. All existing orders, addresses, reviews, and
                payment data will remain preserved. The customer will be notified.
              </p>
            )}

            {actionError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm">
                {actionError}
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionType(null)}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold border border-[#E8DED2] rounded-sm text-[#4A3728] hover:bg-[#FAF7F2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white rounded-sm cursor-pointer disabled:opacity-60"
                style={{ background: actionType === 'deactivate' ? '#DC2626' : '#C0522B' }}
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
