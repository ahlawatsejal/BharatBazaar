import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../components/customer/CustomerLayout';
import ReviewCard from '../../components/customer/ReviewCard';
import { customerService } from '../../services/customerService';

export default function CustomerReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Edit Review Modal
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editTitle, setEditTitle] = useState('');
  const [editComment, setEditComment] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await customerService.getMyReviews();
      setReviews(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch customer reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadReviews();
    });
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      setDeletingId(id);
      await customerService.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setFeedback('Your review has been removed.');
    } catch (err) {
      setError(err.message || 'Failed to delete review.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditTitle(review.title || '');
    setEditComment(review.comment || '');
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      const updated = await customerService.updateReview(editingReview.id, {
        rating: editRating,
        title: editTitle,
        comment: editComment,
      });
      setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setFeedback('Review updated successfully.');
      setEditingReview(null);
    } catch (err) {
      setError(err.message || 'Failed to update review.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <CustomerLayout
      title="My Craft Reviews"
      subtitle="Honest testimonials from your verified artisan consignment purchases."
    >
      <div className="space-y-6">
        {feedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback('')}
              className="text-emerald-600 hover:text-emerald-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="p-4 rounded-sm border border-[#EBE4DA] bg-white flex items-start gap-3">
          <svg className="w-4 h-4 text-[var(--burgundy)] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-[var(--brown-mid)] leading-relaxed">
            Reviews at BharatBazaar can only be submitted by verified patrons who have purchased authentic
            handicrafts from our registered artisan clusters.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
            <div className="inline-block animate-spin w-8 h-8 border-3 border-[var(--burgundy)] border-t-transparent rounded-full mb-3" />
            <p className="text-xs text-[var(--brown-mid)]">Loading review history...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-sm border border-[#EBE4DA]">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#FAF8F5] border border-[#EBE4DA] flex items-center justify-center text-[var(--brown-mid)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3
              className="text-base font-semibold text-[var(--brown-dark)]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              No Reviews Submitted Yet
            </h3>
            <p className="text-xs text-[var(--brown-mid)] mt-1 max-w-sm mx-auto">
              Once your delivered handcrafted orders arrive, share your thoughts to help fellow patrons discover authentic Indian artistry.
            </p>
            <Link
              to="/customer/orders"
              className="mt-4 inline-block px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-sm cursor-pointer"
              style={{ background: 'var(--burgundy)' }}
            >
              Check My Orders
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <ReviewCard
                key={rev.id}
                review={rev}
                onEdit={openEditModal}
                onDelete={handleDelete}
                isDeleting={deletingId === rev.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-sm border border-[#D6CCC2] shadow-xl">
            <h3
              className="text-base font-semibold text-[var(--brown-dark)] mb-3"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Edit Your Review
            </h3>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                  Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      className="cursor-pointer p-1"
                    >
                      <svg
                        className={`w-6 h-6 ${
                          star <= editRating ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#D6CCC2]'
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                  <span className="text-xs font-bold text-[var(--brown-dark)] ml-2">{editRating} / 5</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                  Headline / Title (Optional)
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)]"
                  placeholder="e.g. Exquisite texture and fast delivery"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--brown-dark)] mb-1">
                  Your Review Comment *
                </label>
                <textarea
                  rows="4"
                  required
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D6CCC2] rounded-sm text-xs focus:outline-none focus:border-[var(--burgundy)] resize-none"
                  placeholder="Describe the craftsmanship, quality, and your overall experience..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-semibold text-[var(--brown-dark)] hover:bg-[#FAF8F5] rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-sm transition-all cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--burgundy)' }}
                >
                  {savingEdit ? 'Updating...' : 'Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
