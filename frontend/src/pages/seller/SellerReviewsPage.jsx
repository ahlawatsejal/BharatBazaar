import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SellerLayout from '../../components/seller/SellerLayout';
import SellerStatCard from '../../components/seller/SellerStatCard';
import { sellerService } from '../../services/sellerService';

export default function SellerReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState({
    total_reviews: 0,
    average_rating: 0,
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0,
    unreplied_count: 0,
  });
  const [products, setProducts] = useState([]);

  // Filters
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [replyStatus, setReplyStatus] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reply Modal
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isUpdatingReply, setIsUpdatingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  useEffect(() => {
    sellerService
      .getProducts()
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(() => {});
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [revRes, sumRes] = await Promise.all([
        sellerService.getReviews({
          rating: ratingFilter,
          reply_status: replyStatus,
          product: productFilter,
          start_date: startDate,
          end_date: endDate,
          search,
          page,
        }),
        sellerService.getReviewsSummary(),
      ]);

      if (revRes && Array.isArray(revRes.results)) {
        setReviews(revRes.results);
        setTotalCount(revRes.count || revRes.results.length);
        setHasNext(Boolean(revRes.next));
        setHasPrev(Boolean(revRes.previous));
      } else {
        setReviews(Array.isArray(revRes) ? revRes : []);
        setTotalCount(Array.isArray(revRes) ? revRes.length : 0);
        setHasNext(false);
        setHasPrev(false);
      }

      if (sumRes) setSummary(sumRes);
    } catch (err) {
      setError(err.message || 'Failed to load customer reviews.');
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, replyStatus, productFilter, startDate, endDate, search, page]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadReviews();
    });
    return () => {
      active = false;
    };
  }, [loadReviews]);

  const openReplyModal = (review) => {
    setReplyTarget(review);
    setReplyText(review.seller_reply || '');
    setIsUpdatingReply(Boolean(review.seller_reply));
    setReplyError('');
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    setReplyError('');
    const trimmed = replyText.trim();
    if (trimmed.length < 3) {
      setReplyError('Reply must be at least 3 characters long.');
      return;
    }
    if (trimmed.length > 1000) {
      setReplyError('Reply cannot exceed 1000 characters.');
      return;
    }

    try {
      setSavingReply(true);
      await sellerService.replyToReview(replyTarget.id, {
        reply: trimmed,
        allow_update: isUpdatingReply,
      });
      setSuccessMsg(`Your response to "${replyTarget.product_name}" has been published.`);
      setReplyTarget(null);
      await loadReviews();
    } catch (err) {
      setReplyError(err.message || 'Failed to submit reply.');
    } finally {
      setSavingReply(false);
    }
  };

  const starBuckets = [
    { stars: 5, count: summary.five_star },
    { stars: 4, count: summary.four_star },
    { stars: 3, count: summary.three_star },
    { stars: 2, count: summary.two_star },
    { stars: 1, count: summary.one_star },
  ];

  return (
    <SellerLayout
      title="Patron Reviews & Ratings"
      subtitle="View verified customer feedback on your handcrafted creations and respond directly as an artisan studio."
    >
      <div className="space-y-6">
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
            <button type="button" onClick={loadReviews} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ── Top Summary & Star Distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SellerStatCard
              title="Average Rating"
              value={loading ? '...' : `${summary.average_rating.toFixed(1)} ★`}
              subtext={`Across ${summary.total_reviews} verified reviews`}
              highlightColor="#C9962A"
              icon={<span className="text-base">★</span>}
            />
            <SellerStatCard
              title="Awaiting Reply"
              value={loading ? '...' : summary.unreplied_count}
              subtext="Reviews without studio response"
              highlightColor="#C0522B"
              icon={<span className="text-base">💬</span>}
            />
          </div>

          <div className="lg:col-span-7 p-5 bg-white rounded-sm border border-[#E8DED2]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C] mb-3">
              Star Rating Distribution
            </h3>
            <div className="space-y-2">
              {starBuckets.map((b) => {
                const pct = summary.total_reviews > 0 ? Math.round((b.count / summary.total_reviews) * 100) : 0;
                return (
                  <button
                    key={b.stars}
                    type="button"
                    onClick={() => {
                      setRatingFilter(ratingFilter === String(b.stars) ? 'ALL' : String(b.stars));
                      setPage(1);
                    }}
                    className="w-full flex items-center gap-3 text-xs hover:opacity-80 cursor-pointer"
                  >
                    <span className="w-12 text-left font-semibold text-[#4A3728]">{b.stars} ★</span>
                    <div className="flex-1 h-2 bg-[#F2ECE4] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: '#C9962A' }}
                      />
                    </div>
                    <span className="w-14 text-right text-[#7A5C4A]">
                      {b.count} ({pct}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Filters & Search ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-white p-4 rounded-sm border border-[#E8DED2]">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search review or product..."
            className="lg:col-span-2 px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[#C0522B]"
          />

          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <select
            value={replyStatus}
            onChange={(e) => {
              setReplyStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white"
          >
            <option value="all">All Reply States</option>
            <option value="unreplied">Without Reply</option>
            <option value="replied">Replied</option>
          </select>

          <select
            value={productFilter}
            onChange={(e) => {
              setProductFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs bg-white"
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              title="From Date"
              className="w-1/2 px-2 py-2 border border-[#D6CCC2] rounded-sm text-[11px] bg-white"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              title="To Date"
              className="w-1/2 px-2 py-2 border border-[#D6CCC2] rounded-sm text-[11px] bg-white"
            />
          </div>
        </div>

        {/* ── Reviews List ── */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div className="w-7 h-7 border-2 border-[#C0522B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#7A5C4A]">Loading verified patron reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#E8DED2]">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#FFF8F0', border: '1px solid #E8DED2' }}
            >
              <span className="text-2xl text-[#C9962A]">★</span>
            </div>
            <h3
              className="text-base font-bold text-[#2C2C2C]"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
            >
              No Reviews Yet
            </h3>
            <p className="text-xs text-[#7A5C4A] mt-1 max-w-md mx-auto">
              {ratingFilter !== 'ALL' || replyStatus !== 'all' || productFilter !== 'all' || search
                ? 'No reviews match your current filter criteria.'
                : 'Verified patron reviews will appear here once customers receive and review your handcrafted creations.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 bg-white rounded-sm border border-[#E8DED2] space-y-3"
              >
                {/* Product & Rating Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE3]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-sm bg-[#FAF7F2] border border-[#E8DED2] overflow-hidden shrink-0">
                      {rev.product_image ? (
                        <img src={rev.product_image} alt={rev.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-[#8C7665]">
                          Craft
                        </div>
                      )}
                    </div>
                    <div>
                      <Link
                        to={`/product/${rev.product_slug}`}
                        className="text-sm font-bold text-[#2C2C2C] hover:text-[#C0522B]"
                        style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                      >
                        {rev.product_name}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-[#7A5C4A] mt-0.5">
                        <span>By <strong>{rev.customer_name}</strong></span>
                        {rev.is_verified_purchase && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                            ✓ Verified Purchase
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#C9962A] font-bold">
                      {'★'.repeat(rev.rating)}
                      <span className="text-[#E2D8CC]">{'★'.repeat(5 - rev.rating)}</span>
                    </span>
                    <span className="text-[11px] text-[#7A5C4A]">
                      {new Date(rev.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Review Body */}
                <div>
                  {rev.title && <h4 className="text-sm font-semibold text-[#2C2C2C] mb-1">{rev.title}</h4>}
                  <p className="text-xs text-[#4A3728] leading-relaxed whitespace-pre-line">{rev.comment}</p>
                </div>

                {/* Existing Seller Reply */}
                {rev.seller_reply ? (
                  <div className="p-3.5 rounded-sm bg-[#FAF7F2] border-l-2 border-[#C0522B]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C0522B]">
                        Your Studio Response
                      </span>
                      <div className="flex items-center gap-3">
                        {rev.seller_replied_at && (
                          <span className="text-[10px] text-[#7A5C4A]">
                            {new Date(rev.seller_replied_at).toLocaleDateString('en-IN')}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => openReplyModal(rev)}
                          className="text-[11px] font-semibold text-[#C0522B] hover:underline cursor-pointer"
                        >
                          Edit Reply
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#2C2C2C] leading-relaxed">{rev.seller_reply}</p>
                  </div>
                ) : (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => openReplyModal(rev)}
                      className="px-4 py-1.5 rounded-sm text-xs font-semibold text-white cursor-pointer hover:opacity-90"
                      style={{ background: '#C0522B' }}
                    >
                      Reply to Patron
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {(hasPrev || hasNext) && (
              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="text-[#7A5C4A]">Total matching reviews: {totalCount}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-[#D6CCC2] bg-white rounded-sm font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-[#D6CCC2] bg-white rounded-sm font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Reply Modal ───────────────────────────────────────────── */}
      {replyTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-6 rounded-sm border border-[#D6CCC2] shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0EBE3]">
              <div>
                <h3
                  className="text-base font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
                >
                  {isUpdatingReply ? 'Update Your Studio Reply' : 'Respond to Patron Review'}
                </h3>
                <p className="text-[11px] text-[#7A5C4A] mt-0.5">{replyTarget.product_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="text-[#7A5C4A] hover:text-[#2C2C2C] text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 mb-4 bg-[#FAF7F2] border border-[#E8DED2] rounded-sm text-xs">
              <p className="font-semibold text-[#C9962A] mb-1">
                {'★'.repeat(replyTarget.rating)} — {replyTarget.customer_name}
              </p>
              <p className="text-[#4A3728] italic">"{replyTarget.comment}"</p>
            </div>

            {replyError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs">
                {replyError}
              </div>
            )}

            <form onSubmit={handleReplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2C2C2C] mb-1">
                  Your Public Response * (3–1000 characters)
                </label>
                <textarea
                  rows="4"
                  required
                  minLength={3}
                  maxLength={1000}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Thank the patron, share craft care tips, or address their feedback professionally..."
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs resize-none"
                />
                <p className="text-[10px] text-[#8C7665] text-right mt-1">
                  {replyText.length} / 1000
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0EBE3]">
                <button
                  type="button"
                  onClick={() => setReplyTarget(null)}
                  disabled={savingReply}
                  className="px-4 py-2 text-xs font-semibold text-[#4A3728] hover:bg-[#FAF7F2] rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReply}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-sm cursor-pointer disabled:opacity-50"
                  style={{ background: '#C0522B' }}
                >
                  {savingReply ? 'Publishing...' : isUpdatingReply ? 'Update Reply' : 'Publish Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}
