import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import SellerLayout from '../../components/seller/SellerLayout';
import SellerStatCard from '../../components/seller/SellerStatCard';
import { sellerService } from '../../services/sellerService';
import { useTheme } from '../../context/useTheme';

const RANGE_OPTIONS = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
];

export default function SellerAnalyticsPage() {
  const { isDark } = useTheme();
  const chartTickColor = isDark ? '#C9BEB4' : '#7A5C4A';
  const chartGridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F0EBE3';
  const chartTooltipBg = isDark ? '#29231F' : '#2F211B';
  const chartTooltipBorder = isDark ? '#463B34' : '#D4C8B8';
  const chartTooltipText = '#F3EDE6';

  const [range, setRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustom, setAppliedCustom] = useState(null);

  const [overview, setOverview] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [productsData, setProductsData] = useState(null);
  const [ordersData, setOrdersData] = useState(null);

  const [chartView, setChartView] = useState('daily'); // 'daily' | 'monthly'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Chart.js Canvas Refs
  const salesCanvasRef = useRef(null);
  const ordersCanvasRef = useRef(null);
  const salesChartInstance = useRef(null);
  const ordersChartInstance = useRef(null);

  const loadAnalytics = useCallback(async () => {
    const params = { range };
    if (range === 'custom') {
      if (!appliedCustom?.start_date || !appliedCustom?.end_date) return;
      params.start_date = appliedCustom.start_date;
      params.end_date = appliedCustom.end_date;
    }

    try {
      setLoading(true);
      setError('');
      const [ov, sa, pr, or] = await Promise.all([
        sellerService.getAnalyticsOverview(params),
        sellerService.getAnalyticsSales(params),
        sellerService.getAnalyticsProducts(params),
        sellerService.getAnalyticsOrders(params),
      ]);
      setOverview(ov);
      setSalesData(sa);
      setProductsData(pr);
      setOrdersData(or);
    } catch (err) {
      setError(err.message || 'Failed to load seller analytics.');
    } finally {
      setLoading(false);
    }
  }, [range, appliedCustom]);

  useEffect(() => {
    let active = true;
    if (range !== 'custom' || (appliedCustom?.start_date && appliedCustom?.end_date)) {
      Promise.resolve().then(() => {
        if (active) loadAnalytics();
      });
    }
    return () => {
      active = false;
    };
  }, [range, appliedCustom, loadAnalytics]);

  // Render Sales Trend Chart (Chart.js)
  useEffect(() => {
    if (!salesCanvasRef.current || !salesData) return;

    if (salesChartInstance.current) {
      salesChartInstance.current.destroy();
    }

    const series = chartView === 'monthly' ? salesData.monthly_trend || [] : salesData.daily_trend || [];
    if (series.length === 0) return;

    const labels = series.map((pt) => (chartView === 'monthly' ? pt.month : pt.date));
    const values = series.map((pt) => pt.sales);

    salesChartInstance.current = new Chart(salesCanvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Gross Sales (₹)',
            data: values,
            borderColor: '#C0522B',
            backgroundColor: 'rgba(192, 82, 43, 0.12)',
            borderWidth: 2.5,
            pointBackgroundColor: '#C0522B',
            pointRadius: 3.5,
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: chartTooltipBg,
            titleColor: chartTooltipText,
            bodyColor: chartTooltipText,
            borderColor: chartTooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `₹${Number(ctx.parsed.y || 0).toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: chartTickColor,
              callback: (val) => `₹${Number(val).toLocaleString('en-IN')}`,
              font: { size: 11 },
            },
            grid: { color: chartGridColor },
          },
          x: {
            ticks: { color: chartTickColor, font: { size: 10 }, maxRotation: 45 },
            grid: { display: false },
          },
        },
      },
    });

    return () => {
      if (salesChartInstance.current) salesChartInstance.current.destroy();
    };
  }, [salesData, chartView, isDark, chartTickColor, chartGridColor, chartTooltipBg, chartTooltipBorder, chartTooltipText]);

  // Render Order Volume Chart (Chart.js)
  useEffect(() => {
    if (!ordersCanvasRef.current || !salesData) return;

    if (ordersChartInstance.current) {
      ordersChartInstance.current.destroy();
    }

    const series = chartView === 'monthly' ? salesData.monthly_trend || [] : salesData.daily_trend || [];
    if (series.length === 0) return;

    const labels = series.map((pt) => (chartView === 'monthly' ? pt.month : pt.date));
    const values = series.map((pt) => pt.orders);

    ordersChartInstance.current = new Chart(ordersCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Orders',
            data: values,
            backgroundColor: '#C9962A',
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: chartTooltipBg,
            titleColor: chartTooltipText,
            bodyColor: chartTooltipText,
            borderColor: chartTooltipBorder,
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: chartTickColor, stepSize: 1, precision: 0, font: { size: 11 } },
            grid: { color: chartGridColor },
          },
          x: {
            ticks: { color: chartTickColor, font: { size: 10 }, maxRotation: 45 },
            grid: { display: false },
          },
        },
      },
    });

    return () => {
      if (ordersChartInstance.current) ordersChartInstance.current.destroy();
    };
  }, [salesData, chartView, isDark, chartTickColor, chartGridColor, chartTooltipBg, chartTooltipBorder, chartTooltipText]);

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      setError('Please select both a start date and an end date.');
      return;
    }
    if (customStart > customEnd) {
      setError('Start date cannot be after end date.');
      return;
    }
    setError('');
    setAppliedCustom({ start_date: customStart, end_date: customEnd });
  };

  const trendSeries = chartView === 'monthly' ? salesData?.monthly_trend || [] : salesData?.daily_trend || [];
  const hasTrendData = trendSeries.length > 0;
  const growth = overview?.sales_growth_percent;

  return (
    <SellerLayout
      title="Studio Sales & Craft Analytics"
      subtitle="Real-time revenue, order fulfillment metrics, and product performance from verified paid consignments."
    >
      <div className="space-y-6">
        {/* ── Date Range Filter Bar ── */}
        <div className="p-4 bg-white rounded-sm border border-[#E8DED2] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRange(opt.id)}
                className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                  range === opt.id
                    ? 'text-white border-[#C0522B]'
                    : 'bg-white text-[#4A3728] border-[#D6CCC2] hover:bg-[#FAF7F2]'
                }`}
                style={{ background: range === opt.id ? '#C0522B' : undefined }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {range === 'custom' ? (
            <form onSubmit={handleApplyCustom} className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 border border-[#D6CCC2] rounded-sm text-xs"
              />
              <span className="text-xs text-[#7A5C4A]">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 border border-[#D6CCC2] rounded-sm text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-sm text-xs font-semibold text-white cursor-pointer"
                style={{ background: '#C0522B' }}
              >
                Apply
              </button>
            </form>
          ) : (
            overview?.period && (
              <span className="text-[11px] text-[#7A5C4A]">
                Period: <strong>{overview.period.start_date}</strong> to <strong>{overview.period.end_date}</strong>
              </span>
            )
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadAnalytics} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ── Summary Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SellerStatCard
            title="Verified Sales"
            value={loading ? '...' : `₹${Number(overview?.total_sales || 0).toLocaleString('en-IN')}`}
            subtext={
              growth !== null && growth !== undefined
                ? `${growth >= 0 ? '+' : ''}${growth}% vs previous period`
                : `Prev period: ₹${Number(overview?.previous_period_sales || 0).toLocaleString('en-IN')}`
            }
            highlightColor="#C0522B"
            icon={<span className="text-base font-bold">₹</span>}
          />
          <SellerStatCard
            title="Paid Orders"
            value={loading ? '...' : overview?.total_orders || 0}
            subtext={`Avg Order Value: ₹${Number(overview?.average_order_value || 0).toLocaleString('en-IN')}`}
            highlightColor="#C9962A"
            icon={<span className="text-base">🛍️</span>}
          />
          <SellerStatCard
            title="Active Catalog"
            value={loading ? '...' : `${overview?.active_products || 0} / ${overview?.total_products || 0}`}
            subtext={`${overview?.low_stock_products || 0} low stock • ${overview?.out_of_stock_products || 0} out of stock`}
            highlightColor="#2D8A4E"
            icon={<span className="text-base">🏺</span>}
          />
          <SellerStatCard
            title="Top Craft Item"
            value={
              loading
                ? '...'
                : overview?.best_selling_product
                ? `${overview.best_selling_product.units_sold} units`
                : 'No sales yet'
            }
            subtext={
              overview?.best_selling_product
                ? overview.best_selling_product.product_name
                : 'Awaiting first paid order'
            }
            highlightColor="#C0522B"
            icon={<span className="text-base">★</span>}
          />
        </div>

        {/* ── Charts Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sales Trend Chart (7 Cols) */}
          <div className="lg:col-span-7 p-5 bg-white rounded-sm border border-[#E8DED2]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
              <div>
                <h2
                  className="text-base font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  Sales Revenue Trend
                </h2>
                <p className="text-[11px] text-[#7A5C4A]">Excludes unpaid, failed, and cancelled items.</p>
              </div>
              <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-sm border border-[#E8DED2]">
                <button
                  type="button"
                  onClick={() => setChartView('daily')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm cursor-pointer ${
                    chartView === 'daily' ? 'bg-white text-[#C0522B] shadow-xs' : 'text-[#7A5C4A]'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('monthly')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm cursor-pointer ${
                    chartView === 'monthly' ? 'bg-white text-[#C0522B] shadow-xs' : 'text-[#7A5C4A]'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#7A5C4A]">
                Loading sales trend...
              </div>
            ) : !hasTrendData ? (
              <div className="h-64 flex flex-col items-center justify-center text-center px-4">
                <span className="text-2xl mb-2">📈</span>
                <p className="text-xs font-semibold text-[#2C2C2C]">No Paid Sales in Selected Period</p>
                <p className="text-[11px] text-[#7A5C4A] mt-1 max-w-xs">
                  Daily and monthly revenue charts populate automatically as paid customer consignments are recorded.
                </p>
              </div>
            ) : (
              <div className="h-64">
                <canvas ref={salesCanvasRef} />
              </div>
            )}
          </div>

          {/* Order Volume Chart (5 Cols) */}
          <div className="lg:col-span-5 p-5 bg-white rounded-sm border border-[#E8DED2]">
            <div className="pb-3 mb-4 border-b border-[#F0EBE3]">
              <h2
                className="text-base font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Order Volume Over Time
              </h2>
              <p className="text-[11px] text-[#7A5C4A]">
                Period comparison: {salesData?.comparison?.current_orders || 0} vs{' '}
                {salesData?.comparison?.previous_orders || 0} orders previously
              </p>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#7A5C4A]">
                Loading order volume...
              </div>
            ) : !hasTrendData ? (
              <div className="h-64 flex flex-col items-center justify-center text-center px-4">
                <span className="text-2xl mb-2">📊</span>
                <p className="text-xs font-semibold text-[#2C2C2C]">No Order Volume Data Yet</p>
                <p className="text-[11px] text-[#7A5C4A] mt-1">
                  Order bars will render once paid orders arrive in this date range.
                </p>
              </div>
            ) : (
              <div className="h-64">
                <canvas ref={ordersCanvasRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── Fulfillment Breakdown ── */}
        <div className="p-5 bg-white rounded-sm border border-[#E8DED2]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
            <div>
              <h2
                className="text-base font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Fulfillment Pipeline Breakdown
              </h2>
              <p className="text-[11px] text-[#7A5C4A]">Distinct parent orders across seller item stages</p>
            </div>
            <Link to="/seller/orders" className="text-xs font-semibold text-[#C0522B] hover:underline">
              Manage Orders →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            {[
              { label: 'New', val: ordersData?.new_orders ?? 0, color: 'text-blue-700 bg-blue-50' },
              { label: 'Processing', val: ordersData?.processing_orders ?? 0, color: 'text-amber-700 bg-amber-50' },
              { label: 'Ready', val: ordersData?.ready_to_dispatch_orders ?? 0, color: 'text-purple-700 bg-purple-50' },
              { label: 'Shipped', val: ordersData?.shipped_orders ?? 0, color: 'text-cyan-700 bg-cyan-50' },
              { label: 'Delivered', val: ordersData?.delivered_orders ?? 0, color: 'text-emerald-700 bg-emerald-50' },
              { label: 'Cancelled', val: ordersData?.cancelled_orders ?? 0, color: 'text-red-700 bg-red-50' },
            ].map((b) => (
              <div key={b.label} className={`p-3 rounded-sm border border-[#E8DED2] ${b.color}`}>
                <p className="text-xl font-bold">{loading ? '...' : b.val}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5">{b.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Product Performance Table ── */}
        <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
          <div className="p-5 border-b border-[#F0EBE3] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2
                className="text-base font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Product-Wise Performance
              </h2>
              <p className="text-[11px] text-[#7A5C4A]">
                Units sold and revenue calculated from verified paid, non-cancelled order items.
              </p>
            </div>
            {productsData && (
              <div className="text-[11px] text-[#7A5C4A]">
                Low sales: <strong>{productsData.low_sales?.length || 0}</strong> • No sales:{' '}
                <strong>{productsData.no_sales?.length || 0}</strong>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-[#7A5C4A]">Calculating product performance...</div>
          ) : !productsData?.products?.length ? (
            <div className="p-10 text-center text-xs text-[#7A5C4A]">
              No products in your studio catalog yet.{' '}
              <Link to="/seller/products" className="text-[#C0522B] font-semibold underline">
                Add your first craft
              </Link>
              .
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#F0EBE3] bg-[#FAF7F2] text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Units Sold</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE3] text-xs">
                  {productsData.products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#FDFBF9]">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#2C2C2C]">{prod.name}</p>
                        <p className="text-[10px] text-[#7A5C4A] font-mono">{prod.sku}</p>
                      </td>
                      <td className="py-3 px-4 text-[#4A3728]">{prod.category_name}</td>
                      <td className="py-3 px-4">₹{Number(prod.price).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">{prod.available_stock}</td>
                      <td className="py-3 px-4 font-semibold text-[#2C2C2C]">{prod.units_sold}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#C0522B]">
                        ₹{Number(prod.revenue).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}
