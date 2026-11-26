import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminService } from '../../services/adminService';
import { useTheme } from '../../context/useTheme';

const RANGE_OPTIONS = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom Range' },
];

function formatCurrency(val) {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminAnalyticsPage() {
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
  const [chartGranularity, setChartGranularity] = useState('daily');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Chart refs
  const gmvCanvasRef = useRef(null);
  const ordersCanvasRef = useRef(null);
  const paymentDistCanvasRef = useRef(null);
  const orderDistCanvasRef = useRef(null);

  const gmvChartRef = useRef(null);
  const ordersChartRef = useRef(null);
  const paymentDistChartRef = useRef(null);
  const orderDistChartRef = useRef(null);

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
      const res = await adminService.getPlatformAnalytics(params);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load platform analytics.');
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

  // 1. Paid GMV Trend Chart
  useEffect(() => {
    if (!gmvCanvasRef.current || !data?.trends) return;
    if (gmvChartRef.current) gmvChartRef.current.destroy();

    const series =
      chartGranularity === 'monthly' ? data.trends.monthly || [] : data.trends.daily || [];
    if (series.length === 0) return;

    const labels = series.map((pt) => (chartGranularity === 'monthly' ? pt.month : pt.date));
    const values = series.map((pt) => pt.paid_gmv);

    gmvChartRef.current = new Chart(gmvCanvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Paid GMV (₹)',
            data: values,
            borderColor: '#C0522B',
            backgroundColor: 'rgba(192, 82, 43, 0.12)',
            borderWidth: 2.5,
            pointBackgroundColor: '#C0522B',
            pointRadius: 3,
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
              label: (ctx) => `Paid GMV: ${formatCurrency(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: chartGridColor },
            ticks: {
              color: chartTickColor,
              callback: (val) => `₹${Number(val).toLocaleString('en-IN')}`,
              font: { size: 11 },
            },
          },
          x: {
            grid: { color: chartGridColor },
            ticks: { color: chartTickColor, font: { size: 10 }, maxRotation: 45 },
          },
        },
      },
    });

    return () => {
      if (gmvChartRef.current) gmvChartRef.current.destroy();
    };
  }, [data, chartGranularity, isDark, chartTickColor, chartGridColor, chartTooltipBg, chartTooltipBorder, chartTooltipText]);

  // 2. Orders Trend Chart
  useEffect(() => {
    if (!ordersCanvasRef.current || !data?.trends) return;
    if (ordersChartRef.current) ordersChartRef.current.destroy();

    const series =
      chartGranularity === 'monthly' ? data.trends.monthly || [] : data.trends.daily || [];
    if (series.length === 0) return;

    const labels = series.map((pt) => (chartGranularity === 'monthly' ? pt.month : pt.date));

    ordersChartRef.current = new Chart(ordersCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Orders',
            data: series.map((pt) => pt.total_orders),
            backgroundColor: isDark ? '#463B34' : '#E8DED2',
            borderColor: isDark ? '#A6988C' : '#7A5C4A',
            borderWidth: 1,
          },
          {
            label: 'Paid Orders',
            data: series.map((pt) => pt.paid_orders),
            backgroundColor: isDark ? '#C84B70' : '#2C2C2C',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: chartTickColor, boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            backgroundColor: chartTooltipBg,
            titleColor: chartTooltipText,
            bodyColor: chartTooltipText,
            borderColor: chartTooltipBorder,
            borderWidth: 1,
          },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: chartGridColor }, ticks: { color: chartTickColor, precision: 0, font: { size: 11 } } },
          x: { grid: { color: chartGridColor }, ticks: { color: chartTickColor, font: { size: 10 }, maxRotation: 45 } },
        },
      },
    });

    return () => {
      if (ordersChartRef.current) ordersChartRef.current.destroy();
    };
  }, [data, chartGranularity, isDark, chartTickColor, chartGridColor, chartTooltipBg, chartTooltipBorder, chartTooltipText]);

  // 3. Payment Status Distribution Chart
  useEffect(() => {
    if (!paymentDistCanvasRef.current || !data?.distributions?.payment_status) return;
    if (paymentDistChartRef.current) paymentDistChartRef.current.destroy();

    const dist = data.distributions.payment_status;
    const total = Object.values(dist).reduce((a, b) => a + (b || 0), 0);
    if (total === 0) return;

    paymentDistChartRef.current = new Chart(paymentDistCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: ['PAID', 'PENDING', 'FAILED', 'REFUNDED'],
        datasets: [
          {
            data: [dist.PAID || 0, dist.PENDING || 0, dist.FAILED || 0, dist.REFUNDED || 0],
            backgroundColor: ['#059669', '#D97706', '#DC2626', '#7C3AED'],
            borderColor: isDark ? '#211C19' : '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: chartTickColor, boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            backgroundColor: chartTooltipBg,
            titleColor: chartTooltipText,
            bodyColor: chartTooltipText,
            borderColor: chartTooltipBorder,
            borderWidth: 1,
          },
        },
      },
    });

    return () => {
      if (paymentDistChartRef.current) paymentDistChartRef.current.destroy();
    };
  }, [data, isDark, chartTickColor, chartTooltipBg, chartTooltipBorder, chartTooltipText]);

  // 4. Order Status Distribution Chart
  useEffect(() => {
    if (!orderDistCanvasRef.current || !data?.distributions?.order_status) return;
    if (orderDistChartRef.current) orderDistChartRef.current.destroy();

    const dist = data.distributions.order_status;
    const total = Object.values(dist).reduce((a, b) => a + (b || 0), 0);
    if (total === 0) return;

    const labels = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    orderDistChartRef.current = new Chart(orderDistCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Orders',
            data: labels.map((k) => dist[k] || 0),
            backgroundColor: ['#A8A29E', '#C9962A', '#D97706', '#0284C7', '#059669', '#DC2626'],
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
          y: { beginAtZero: true, grid: { color: chartGridColor }, ticks: { color: chartTickColor, precision: 0, font: { size: 11 } } },
          x: { grid: { color: chartGridColor }, ticks: { color: chartTickColor, font: { size: 10 } } },
        },
      },
    });

    return () => {
      if (orderDistChartRef.current) orderDistChartRef.current.destroy();
    };
  }, [data, isDark, chartTickColor, chartGridColor, chartTooltipBg, chartTooltipBorder, chartTooltipText]);

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    setAppliedCustom({ start_date: customStart, end_date: customEnd });
  };

  const overview = data?.overview;
  const trendSeries =
    chartGranularity === 'monthly' ? data?.trends?.monthly || [] : data?.trends?.daily || [];

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header & Date Range Selector */}
        <div className="p-6 bg-white rounded-sm border border-[#E8DED2] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C0522B]">
                Platform Intelligence
              </span>
              <h1
                className="text-2xl font-bold text-[#2C2C2C] mt-1"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                Platform Analytics
              </h1>
              <p className="text-xs text-[#7A5C4A] mt-1">
                Verified marketplace metrics computed directly from MySQL order, product, seller, and customer records.
              </p>
            </div>
            {data?.period && (
              <div className="text-[11px] text-[#7A5C4A] bg-[#FAF7F2] px-3 py-2 rounded-sm border border-[#E8DED2]">
                {data.period.start_date && data.period.end_date
                  ? `${data.period.start_date} to ${data.period.end_date}`
                  : 'All Time'}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F0EBE3]">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRange(opt.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                  range === opt.id
                    ? 'bg-[#2C2C2C] text-white'
                    : 'bg-[#FAF7F2] text-[#4A3728] border border-[#E8DED2] hover:border-[#C0522B]'
                }`}
              >
                {opt.label}
              </button>
            ))}

            {range === 'custom' && (
              <form onSubmit={handleApplyCustom} className="flex flex-wrap items-center gap-2 ml-auto">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  required
                  className="px-2.5 py-1.5 text-xs border border-[#E8DED2] rounded-sm"
                />
                <span className="text-xs text-[#7A5C4A]">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  required
                  className="px-2.5 py-1.5 text-xs border border-[#E8DED2] rounded-sm"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#C0522B] rounded-sm hover:opacity-90 cursor-pointer"
                >
                  Apply
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadAnalytics} className="underline font-semibold cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 bg-white rounded-sm border border-[#E8DED2] text-center text-xs text-[#7A5C4A]">
            Computing platform analytics...
          </div>
        ) : overview ? (
          <>
            {/* Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Paid GMV (Paid Order Value)
                </p>
                <p className="text-2xl font-bold text-[#C0522B] mt-1">
                  {formatCurrency(overview.paid_gmv)}
                </p>
                <p className="text-[11px] text-[#7A5C4A] mt-1">
                  Avg Paid Order: {formatCurrency(overview.average_paid_order_value)}
                </p>
              </div>

              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Orders &amp; Payments (Period)
                </p>
                <p className="text-2xl font-bold text-[#2C2C2C] mt-1">
                  {overview.total_orders} orders
                </p>
                <p className="text-[11px] text-[#7A5C4A] mt-1">
                  {overview.paid_orders} paid · {overview.pending_payments} pending ·{' '}
                  {overview.failed_payments} failed
                </p>
              </div>

              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Cancellations &amp; Refunds
                </p>
                <p className="text-2xl font-bold text-[#2C2C2C] mt-1">
                  {overview.cancelled_orders} cancelled
                </p>
                <p className="text-[11px] text-[#7A5C4A] mt-1">
                  {overview.cancelled_paid_orders} paid awaiting refund ·{' '}
                  {overview.confirmed_refunds_count} confirmed ({formatCurrency(overview.confirmed_refunds_amount)})
                </p>
              </div>

              <div className="p-4 bg-white rounded-sm border border-[#E8DED2]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A]">
                  Marketplace Directory
                </p>
                <p className="text-2xl font-bold text-[#2C2C2C] mt-1">
                  {overview.total_customers} patrons
                </p>
                <p className="text-[11px] text-[#7A5C4A] mt-1">
                  {overview.approved_sellers}/{overview.total_sellers} sellers approved ·{' '}
                  {overview.approved_products}/{overview.total_products} products live
                </p>
              </div>
            </div>

            {/* Catalog & Seller Breakdown Strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-sm border border-[#E8DED2] text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] block mb-2">
                  Seller Status Breakdown (All Time)
                </span>
                <div className="flex flex-wrap gap-3 text-[#4A3728]">
                  <span>Approved: <strong>{overview.approved_sellers}</strong></span>
                  <span>Pending: <strong>{overview.pending_sellers}</strong></span>
                  <span>Suspended: <strong>{overview.suspended_sellers}</strong></span>
                  <span>Rejected: <strong>{overview.rejected_sellers}</strong></span>
                  <span className="text-[#C0522B]">
                    New in period: <strong>{overview.new_sellers_in_period}</strong>
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-sm border border-[#E8DED2] text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A5C4A] block mb-2">
                  Product Catalog Breakdown (All Time)
                </span>
                <div className="flex flex-wrap gap-3 text-[#4A3728]">
                  <span>Approved: <strong>{overview.approved_products}</strong></span>
                  <span>Pending: <strong>{overview.pending_products}</strong></span>
                  <span>Inactive: <strong>{overview.inactive_products}</strong></span>
                  <span>Rejected: <strong>{overview.rejected_products}</strong></span>
                  <span className="text-[#C0522B]">
                    New customers in period: <strong>{overview.new_customers_in_period}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Trend Charts */}
            <div className="flex items-center justify-between">
              <h2
                className="text-lg font-bold text-[#2C2C2C]"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
              >
                GMV &amp; Order Trends
              </h2>
              <div className="flex gap-1">
                {['daily', 'monthly'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setChartGranularity(g)}
                    className={`px-3 py-1 text-xs font-semibold rounded-sm cursor-pointer ${
                      chartGranularity === g
                        ? 'bg-[#2C2C2C] text-white'
                        : 'bg-white border border-[#E8DED2] text-[#4A3728]'
                    }`}
                  >
                    {g === 'daily' ? 'Daily' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-5 bg-white rounded-sm border border-[#E8DED2]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] mb-3">
                  Paid GMV Trend (Captured Order Value)
                </h3>
                {trendSeries.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs text-[#7A5C4A]">
                    No order data in selected period.
                  </div>
                ) : (
                  <div className="h-56">
                    <canvas ref={gmvCanvasRef} />
                  </div>
                )}
              </div>

              <div className="p-5 bg-white rounded-sm border border-[#E8DED2]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] mb-3">
                  Orders Trend (Total vs. Paid)
                </h3>
                {trendSeries.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs text-[#7A5C4A]">
                    No order data in selected period.
                  </div>
                ) : (
                  <div className="h-56">
                    <canvas ref={ordersCanvasRef} />
                  </div>
                )}
              </div>

              <div className="p-5 bg-white rounded-sm border border-[#E8DED2]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] mb-3">
                  Payment Status Distribution
                </h3>
                {overview.total_orders === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs text-[#7A5C4A]">
                    No payment data in selected period.
                  </div>
                ) : (
                  <div className="h-56">
                    <canvas ref={paymentDistCanvasRef} />
                  </div>
                )}
              </div>

              <div className="p-5 bg-white rounded-sm border border-[#E8DED2]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] mb-3">
                  Order Status Distribution
                </h3>
                {overview.total_orders === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs text-[#7A5C4A]">
                    No order status data in selected period.
                  </div>
                ) : (
                  <div className="h-56">
                    <canvas ref={orderDistCanvasRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Top Products & Top Sellers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
                <div className="px-5 py-3 bg-[#FAF7F2] border-b border-[#E8DED2]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
                    Top-Selling Products (Paid Orders)
                  </h3>
                </div>
                {(data.top_products || []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#7A5C4A]">
                    No paid product sales in selected period.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0EBE3] text-xs">
                    {data.top_products.map((p, idx) => (
                      <div key={`${p.product_id}-${idx}`} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#2C2C2C]">{p.product_name}</p>
                          <p className="text-[11px] text-[#7A5C4A]">
                            {p.store_name} · {p.units_sold} units · {p.order_count} orders
                          </p>
                        </div>
                        <span className="font-bold text-[#C0522B]">
                          {formatCurrency(p.paid_sales)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
                <div className="px-5 py-3 bg-[#FAF7F2] border-b border-[#E8DED2]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
                    Top-Performing Sellers (Paid Sales)
                  </h3>
                </div>
                {(data.top_sellers || []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#7A5C4A]">
                    No paid seller sales in selected period.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0EBE3] text-xs">
                    {data.top_sellers.map((s) => (
                      <div key={s.seller_id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div>
                          <Link
                            to={`/admin/sellers/${s.seller_id}`}
                            className="font-semibold text-[#2C2C2C] hover:text-[#C0522B]"
                          >
                            {s.store_name}
                          </Link>
                          <p className="text-[11px] text-[#7A5C4A]">
                            {[s.city, s.state].filter(Boolean).join(', ') || 'India'} ·{' '}
                            {s.units_sold} units · {s.order_count} orders
                          </p>
                        </div>
                        <span className="font-bold text-[#C0522B]">
                          {formatCurrency(s.paid_sales)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Marketplace Insights: Categories & Regions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
                <div className="px-5 py-3 bg-[#FAF7F2] border-b border-[#E8DED2]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
                    Popular Craft Categories (Paid Sales)
                  </h3>
                </div>
                {(data.insights?.popular_categories || []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#7A5C4A]">
                    No category sales in selected period.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0EBE3] text-xs">
                    {data.insights.popular_categories.map((c) => (
                      <div key={c.category_id} className="px-5 py-3 flex items-center justify-between">
                        <span className="font-semibold text-[#2C2C2C]">{c.category_name}</span>
                        <span className="text-[#4A3728]">
                          {c.units_sold} units · <strong>{formatCurrency(c.paid_sales)}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-sm border border-[#E8DED2] overflow-hidden">
                <div className="px-5 py-3 bg-[#FAF7F2] border-b border-[#E8DED2]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
                    Approved Product Distribution by Region
                  </h3>
                </div>
                {(data.insights?.regional_distribution || []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#7A5C4A]">
                    No regional origin data available.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0EBE3] text-xs">
                    {data.insights.regional_distribution.map((r) => (
                      <div key={r.state} className="px-5 py-3 flex items-center justify-between">
                        <span className="font-semibold text-[#2C2C2C]">{r.state}</span>
                        <span className="text-[#4A3728]">
                          <strong>{r.product_count}</strong>{' '}
                          {r.product_count === 1 ? 'product' : 'products'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Accuracy & Unavailable Metrics Note */}
            {data.unavailable_metrics?.platform_profit_and_net_revenue && (
              <div className="p-4 bg-[#FAF7F2] border border-[#E8DED2] rounded-sm text-[11px] text-[#7A5C4A] space-y-1">
                <p>
                  <strong className="text-[#2C2C2C]">Financial Accounting Note:</strong>{' '}
                  {data.unavailable_metrics.platform_profit_and_net_revenue}
                </p>
                <p>{data.period?.date_basis}</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
