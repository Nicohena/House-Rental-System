import React from "react";
import { Star, Loader2 } from "lucide-react";

const ReviewCard = ({ review }) => (
  <div className="bg-slate-50 rounded-2xl p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
        {review.tenantId?.name?.charAt(0)?.toUpperCase() || "?"}
      </div>
      <div>
        <p className="font-bold text-slate-900 text-sm">
          {review.tenantId?.name || "Anonymous"}
        </p>
        <p className="text-xs text-slate-400">
          {new Date(review.createdAt).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
    <div className="flex gap-0.5 mb-2">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={
            s <= review.score
              ? "text-yellow-400 fill-yellow-400"
              : "text-slate-200"
          }
        />
      ))}
    </div>
    {review.comment && (
      <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
    )}
  </div>
);

const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

const ReviewsSection = ({
  ratings,
  averageRating,
  user,
  ratingScore,
  setRatingScore,
  ratingHover,
  setRatingHover,
  ratingComment,
  setRatingComment,
  ratingLoading,
  onSubmitRating,
}) => {
  return (
    <div className="pt-12 border-t border-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <Star className="text-yellow-400 fill-yellow-400" size={24} />
        <h3 className="text-xl font-black text-slate-900">
          {averageRating?.toFixed(1) || "New"} · {ratings?.length || 0} review
          {ratings?.length !== 1 ? "s" : ""}
        </h3>
      </div>

      {/* Existing Reviews */}
      {ratings?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {ratings.map((review, idx) => (
            <ReviewCard key={idx} review={review} />
          ))}
        </div>
      )}

      {/* Submit Review Form */}
      {user && user.role === "tenant" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h4 className="font-bold text-slate-900 mb-4">Leave a Review</h4>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRatingScore(s)}
                onMouseEnter={() => setRatingHover(s)}
                onMouseLeave={() => setRatingHover(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={28}
                  className={
                    s <= (ratingHover || ratingScore)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-slate-200"
                  }
                />
              </button>
            ))}
            {ratingScore > 0 && (
              <span className="ml-2 text-sm text-slate-500 self-center font-medium">
                {ratingLabels[ratingScore]}
              </span>
            )}
          </div>
          <textarea
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
            placeholder="Tell others about your experience (optional)..."
            rows={3}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none mb-4"
          />
          <button
            onClick={onSubmitRating}
            disabled={ratingLoading || ratingScore === 0}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {ratingLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Star size={16} />
            )}
            Submit Review
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
