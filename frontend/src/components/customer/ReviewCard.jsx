import { Link } from 'react-router-dom';

export default function ReviewCard({ review, onEdit, onDelete, isDeleting }) {
  const renderStars = (rating) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        className={`w-3.5 h-3.5 ${star <= rating ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#E2D8CC]'}`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  const formattedDate = review.created_at
    ? new Date(review.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div className="p-5 rounded-sm border border-[#EBE4DA] bg-white hover:border-[#D6CCC2] transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#F2ECE4]">
        {/* Product reference */}
        <div>
          <span className="text-[11px] font-medium text-[var(--brown-light)] uppercase tracking-wider block">
            Craft Review
          </span>
          <Link
            to={review.product_slug ? `/product/${review.product_slug}` : '/shop'}
            className="text-sm font-semibold text-[var(--brown-dark)] hover:text-[var(--burgundy)] transition-colors"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {review.product_name || `Product #${review.product}`}
          </Link>
        </div>

        {/* Rating and date */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-0.5">{renderStars(review.rating)}</div>
          <span className="text-xs text-[var(--brown-light)]">•</span>
          <span className="text-xs text-[var(--brown-light)]">{formattedDate}</span>
        </div>
      </div>

      <div className="pt-3">
        {/* Verified purchase badge */}
        {review.is_verified_purchase && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm mb-2">
            <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Verified Craft Patron
          </span>
        )}

        {review.title && (
          <h4
            className="text-sm font-semibold text-[var(--brown-dark)] mb-1"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {review.title}
          </h4>
        )}

        <p className="text-xs leading-relaxed text-[var(--brown-mid)] whitespace-pre-line">
          {review.comment}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-[#F2ECE4] flex items-center justify-end gap-3 text-xs">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(review)}
            className="font-medium text-[var(--brown-dark)] hover:text-[var(--burgundy)] transition-colors cursor-pointer"
          >
            Edit Review
          </button>
        )}
        {onEdit && onDelete && <span className="text-[#D6CCC2]">•</span>}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(review.id)}
            disabled={isDeleting}
            className="font-medium text-red-600 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}
