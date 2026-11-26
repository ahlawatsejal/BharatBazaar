import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SellerLayout from '../../components/seller/SellerLayout';
import SellerStatCard from '../../components/seller/SellerStatCard';
import { sellerService } from '../../services/sellerService';
import { productService } from '../../services/productService';

const STOCK_STATUS_BADGES = {
  IN_STOCK: { label: 'In Stock', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  LOW_STOCK: { label: 'Low Stock', bg: 'bg-amber-100', text: 'text-amber-800' },
  OUT_OF_STOCK: { label: 'Out of Stock', bg: 'bg-red-100', text: 'text-red-800' },
};

const APPROVAL_BADGES = {
  APPROVED: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700' },
  DRAFT: { label: 'Draft', bg: 'bg-stone-100', text: 'text-stone-700' },
  INACTIVE: { label: 'Inactive', bg: 'bg-gray-100', text: 'text-gray-700' },
};

export default function SellerInventoryPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    total_products: 0,
    in_stock_products: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    total_available_units: 0,
    alerts: [],
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ordering, setOrdering] = useState('stock_asc');

  // Stock Adjustment Modal
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [actionType, setActionType] = useState('increase');
  const [quantity, setQuantity] = useState('1');
  const [thresholdInput, setThresholdInput] = useState('5');
  const [reason, setReason] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [savingAdjust, setSavingAdjust] = useState(false);

  // Inventory History Modal
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    productService
      .getCategories()
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [invData, sumData] = await Promise.all([
        sellerService.getInventory({
          search,
          stock_status: stockStatusFilter,
          category: categoryFilter,
          ordering,
        }),
        sellerService.getInventorySummary(),
      ]);
      setItems(Array.isArray(invData) ? invData : invData.results || []);
      if (sumData) setSummary(sumData);
    } catch (err) {
      setError(err.message || 'Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  }, [search, stockStatusFilter, categoryFilter, ordering]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadData();
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const openAdjustModal = (item) => {
    setAdjustTarget(item);
    setActionType('increase');
    setQuantity('1');
    setThresholdInput(String(item.low_stock_threshold ?? 5));
    setReason('');
    setAdjustError('');
  };

  const getPreviewStock = () => {
    if (!adjustTarget) return 0;
    const current = Number(adjustTarget.available_stock || 0);
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) return current;
    if (actionType === 'increase') return current + qty;
    if (actionType === 'decrease') return current - qty;
    return qty;
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustError('');

    const qty = parseInt(quantity, 10);
    const threshold = parseInt(thresholdInput, 10);

    if (isNaN(qty) || qty < 0) {
      setAdjustError('Please enter a valid non-negative integer quantity.');
      return;
    }
    if ((actionType === 'increase' || actionType === 'decrease') && qty === 0 && threshold === adjustTarget.low_stock_threshold) {
      setAdjustError('Quantity must be greater than 0 for increase or decrease.');
      return;
    }
    if (actionType === 'decrease' && adjustTarget.available_stock - qty < 0) {
      setAdjustError(`Cannot decrease stock below 0 (currently ${adjustTarget.available_stock} available).`);
      return;
    }
    if (isNaN(threshold) || threshold < 0) {
      setAdjustError('Low-stock threshold must be a non-negative integer.');
      return;
    }

    const payload = {
      low_stock_threshold: threshold,
      reason: reason.trim(),
    };

    if (!(actionType !== 'set' && qty === 0)) {
      payload.action = actionType;
      payload.quantity = qty;
    }

    try {
      setSavingAdjust(true);
      await sellerService.adjustInventory(adjustTarget.id, payload);
      setSuccessMsg(`Inventory updated for "${adjustTarget.name}".`);
      setAdjustTarget(null);
      await loadData();
    } catch (err) {
      setAdjustError(err.message || 'Failed to update inventory.');
    } finally {
      setSavingAdjust(false);
    }
  };

  const openHistoryModal = async (item) => {
    setHistoryTarget(item);
    setHistoryLoading(true);
    setHistoryError('');
    setHistoryRecords([]);
    try {
      const data = await sellerService.getInventoryHistory(item.id);
      setHistoryRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistoryError(err.message || 'Failed to load stock adjustment history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <SellerLayout
      title="Inventory & Stock Control"
      subtitle="Monitor stock levels, configure low-stock thresholds, adjust quantities safely, and audit immutable stock history."
    >
      <div className="space-y-6">
        {/* Feedback Banners */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg('')} className="font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadData} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ── A. Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <SellerStatCard
            title="Total Products"
            value={loading ? '...' : summary.total_products}
            subtext="Catalog items tracked"
            highlightColor="#2C2C2C"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <SellerStatCard
            title="In Stock"
            value={loading ? '...' : summary.in_stock_products}
            subtext="Above threshold"
            highlightColor="#2D8A4E"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <SellerStatCard
            title="Low Stock"
            value={loading ? '...' : summary.low_stock_products}
            subtext="Needs replenishment"
            highlightColor="#C9962A"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <SellerStatCard
            title="Out of Stock"
            value={loading ? '...' : summary.out_of_stock_products}
            subtext="0 units available"
            highlightColor="#C0522B"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            }
          />
          <SellerStatCard
            title="Total Units"
            value={loading ? '...' : summary.total_available_units}
            subtext="Available across store"
            highlightColor="#C0522B"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />
        </div>

        {/* ── B. Low-Stock & Out-of-Stock Alerts Section ── */}
        {summary.alerts && summary.alerts.length > 0 && (
          <div className="p-5 rounded-sm bg-[#FFF8F0] border border-[#E4C89A] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <h2
                  className="text-sm font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Stock Attention Alerts ({summary.alerts.length})
                </h2>
              </div>
              <span className="text-[11px] text-[#7A5C4A]">
                Products at or below their configured low-stock threshold
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {summary.alerts.map((alert) => {
                const badge = STOCK_STATUS_BADGES[alert.inventory_status] || STOCK_STATUS_BADGES.LOW_STOCK;
                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-white rounded-sm border border-[#E8DED2] text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-[#2C2C2C] truncate">{alert.name}</p>
                      <p className="text-[11px] text-[#7A5C4A]">
                        Current: <strong>{alert.available_stock}</strong> • Threshold: {alert.low_stock_threshold}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => openAdjustModal(alert)}
                        className="px-2.5 py-1 rounded-sm text-[11px] font-semibold text-white cursor-pointer"
                        style={{ background: '#C0522B' }}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── C. Search & Filters ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-sm border border-[#E8DED2]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[#C0522B]"
          />

          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[#C0522B]"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[#C0522B]"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white focus:outline-none focus:border-[#C0522B]"
          >
            <option value="stock_asc">Stock: Low to High</option>
            <option value="stock_desc">Stock: High to Low</option>
            <option value="updated_desc">Recently Updated</option>
          </select>
        </div>

        {/* ── D. Inventory Table ── */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div className="w-7 h-7 border-2 border-[#C0522B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#7A5C4A]">Loading inventory ledger...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#FFF8F0', border: '1px solid #E8DED2' }}
            >
              <span className="text-2xl">📦</span>
            </div>
            <h3
              className="text-base font-bold text-[#2C2C2C]"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              No Inventory Records Found
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1 max-w-md mx-auto">
              {search || stockStatusFilter !== 'ALL' || categoryFilter !== 'all'
                ? 'No products match your current inventory filters.'
                : 'Add handcrafted products in the Products module to begin managing stock and alerts.'}
            </p>
            <Link
              to="/seller/products"
              className="inline-block mt-4 px-5 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-white"
              style={{ background: '#C0522B' }}
            >
              Go to Products
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-sm border border-[#E8DED2] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F0EBE3] bg-[#FAF7F2] text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Threshold</th>
                  <th className="py-3 px-4">Inventory Status</th>
                  <th className="py-3 px-4">Approval</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3] text-xs">
                {items.map((item) => {
                  const stockBadge = STOCK_STATUS_BADGES[item.inventory_status] || STOCK_STATUS_BADGES.IN_STOCK;
                  const appBadge = APPROVAL_BADGES[item.approval_status] || APPROVAL_BADGES.PENDING;
                  return (
                    <tr key={item.id} className="hover:bg-[#FDFBF9]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-sm bg-[#FAF7F2] border border-[#E8DED2] overflow-hidden shrink-0 flex items-center justify-center">
                            {item.primary_image ? (
                              <img src={item.primary_image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] text-[#8C7665]">No Img</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#2C2C2C] line-clamp-1">{item.name}</p>
                            <p className="text-[11px] text-[#7A5C4A] font-mono">{item.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#4A3728]">{item.category?.name || '—'}</td>
                      <td className="py-3 px-4 font-bold text-[#2C2C2C]">{item.available_stock}</td>
                      <td className="py-3 px-4 text-[#7A5C4A]">{item.low_stock_threshold}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${stockBadge.bg} ${stockBadge.text}`}>
                          {stockBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${appBadge.bg} ${appBadge.text}`}>
                          {appBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#7A5C4A] whitespace-nowrap">
                        {item.updated_at ? new Date(item.updated_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openAdjustModal(item)}
                          className="font-semibold text-[#C0522B] hover:underline cursor-pointer"
                        >
                          Adjust
                        </button>
                        <button
                          type="button"
                          onClick={() => openHistoryModal(item)}
                          className="font-semibold text-[#4A3728] hover:underline cursor-pointer"
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Stock Adjustment Modal ────────────────────────────────── */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#D6CCC2] shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
              <div>
                <h3
                  className="text-base font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Adjust Inventory Stock
                </h3>
                <p className="text-[11px] text-[#7A5C4A] mt-0.5">{adjustTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="text-[#7A5C4A] hover:text-[#2C2C2C] text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {adjustError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="p-3 bg-[#FAF7F2] border border-[#E8DED2] rounded-sm flex items-center justify-between text-xs">
                <span>Current Stock: <strong>{adjustTarget.available_stock}</strong></span>
                <span>
                  New Stock:{' '}
                  <strong className={getPreviewStock() < 0 ? 'text-red-600' : 'text-[#C0522B]'}>
                    {getPreviewStock()}
                  </strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Adjustment Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'increase', label: '+ Increase' },
                    { id: 'decrease', label: '− Decrease' },
                    { id: 'set', label: '= Set Exact' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setActionType(opt.id)}
                      className={`py-2 px-2 rounded-sm text-xs font-semibold border cursor-pointer ${
                        actionType === opt.id
                          ? 'text-white border-[#C0522B]'
                          : 'bg-white text-[#4A3728] border-[#D6CCC2]'
                      }`}
                      style={{ background: actionType === opt.id ? '#C0522B' : undefined }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    {actionType === 'set' ? 'Exact Quantity *' : 'Units to Adjust *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                    Low-Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Reason for Adjustment (Optional)
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. New artisan batch finished, damaged piece removed"
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0EBE3]">
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  disabled={savingAdjust}
                  className="px-4 py-2 text-xs font-semibold text-[#4A3728] hover:bg-[#FAF7F2] rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdjust}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-sm cursor-pointer disabled:opacity-50"
                  style={{ background: '#C0522B' }}
                >
                  {savingAdjust ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Immutable Inventory History Modal ──────────────────────── */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full p-6 rounded-sm border border-[#D6CCC2] shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
              <div>
                <h3
                  className="text-base font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Stock Adjustment History
                </h3>
                <p className="text-[11px] text-[#7A5C4A] mt-0.5">{historyTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="text-[#7A5C4A] hover:text-[#2C2C2C] text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="py-10 text-center">
                  <div className="w-6 h-6 border-2 border-[#C0522B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[#7A5C4A]">Loading audit history...</p>
                </div>
              ) : historyError ? (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs">
                  {historyError}
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#7A5C4A]">
                  No manual stock adjustments have been recorded for this product yet.
                </div>
              ) : (
                <div className="divide-y divide-[#F0EBE3]">
                  {historyRecords.map((rec) => {
                    const isPositive = rec.adjustment_amount >= 0;
                    return (
                      <div key={rec.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                        <div>
                          <p className="font-semibold text-[#2C2C2C]">
                            {rec.previous_stock} → {rec.new_stock}{' '}
                            <span
                              className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {isPositive ? `+${rec.adjustment_amount}` : rec.adjustment_amount}
                            </span>
                          </p>
                          <p className="text-[11px] text-[#4A3728] mt-0.5">
                            {rec.reason || 'Stock adjustment'}
                          </p>
                          <p className="text-[10px] text-[#8C7665] mt-0.5">
                            By {rec.adjusted_by_name}
                          </p>
                        </div>
                        <span className="text-[10px] text-[#7A5C4A] shrink-0">
                          {new Date(rec.created_at).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 mt-4 border-t border-[#F0EBE3] flex items-center justify-between text-[11px] text-[#8C7665]">
              <span>Audit records are immutable for inventory integrity.</span>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="px-4 py-1.5 bg-[#FAF7F2] border border-[#D6CCC2] text-[#2C2C2C] font-semibold rounded-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}
