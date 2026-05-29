import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Send, Heart } from "lucide-react";
import reviewService from "../services/reviewService";
import authService from "../services/authService";
import { formatTimeAgo } from "../utils/helpers";
import "./Reviews.css";

export default function Reviews({ animeId, selectedEp }) {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState("");
  const [reviewRating, setReviewRating] = useState(0);

  useEffect(() => {
    reviewService.getReviews("anime", animeId)
      .then(res => {
        if (res?.data) {
          setReviews(res.data.map(r => ({
            id: r._id,
            text: r.content,
            title: r.title,
            user: r.user?.username || "Unknown",
            avatar: r.user?.avatar || "",
            time: new Date(r.createdAt).getTime(),
            rating: r.rating,
            likes: r.likes?.length || 0,
          })));
        }
      })
      .catch(() => {});
  }, [animeId]);

  const addReview = async () => {
    if (!newReview.trim()) return;
    const currentUser = authService.getCurrentUser();
    const username = currentUser?.username || "Anime Fan";

    const optimistic = {
      id: Date.now(),
      text: newReview,
      user: username,
      avatar: currentUser?.avatar || "",
      time: Date.now(),
      rating: reviewRating || null,
      likes: 0,
    };
    setReviews(prev => [optimistic, ...prev]);

    try {
      await reviewService.createReview(
        animeId,
        null,
        reviewRating || 8,
        newReview.slice(0, 100),
        newReview,
        false
      );
      const res = await reviewService.getReviews("anime", animeId);
      if (res?.data) {
        setReviews(res.data.map(r => ({
          id: r._id,
          text: r.content,
          title: r.title,
          user: r.user?.username || "Unknown",
          avatar: r.user?.avatar || "",
          time: new Date(r.createdAt).getTime(),
          rating: r.rating,
          likes: r.likes?.length || 0,
        })));
      }
    } catch {}

    setNewReview("");
    setReviewRating(0);
  };

  return (
    <div className="reviews-section">
      <h3>Reviews & Comments</h3>

      <div className="review-rating-row">
        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
          <span
            key={n}
            className={`review-star-picker ${reviewRating >= n ? "active" : ""}`}
            onClick={() => setReviewRating(reviewRating === n ? 0 : n)}
          ><Star size={14} /></span>
        ))}
        {reviewRating > 0 && <span className="review-rating-label">{reviewRating}/10</span>}
      </div>
      <div className="review-input-row">
        <input
          value={newReview}
          onChange={(e) => setNewReview(e.target.value)}
          placeholder="Share your thoughts..."
          onKeyDown={(e) => e.key === "Enter" && addReview()}
        />
        <button onClick={addReview}><Send size={16} /></button>
      </div>

      <div className="reviews-list">
        {reviews.length === 0 ? (
          <p className="reviews-empty">No reviews yet. Be the first!</p>
        ) : (
          reviews.map((r) => (
            <motion.div
              key={r.id}
              className="review-item"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="review-avatar">
                {r.avatar ? (
                  <img src={r.avatar} alt={r.user} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  r.user.charAt(0).toUpperCase()
                )}
              </div>
              <div className="review-body">
                <div className="review-head">
                  <strong>{r.user}</strong>
                  {r.rating && <span className="review-rating"><Star size={10} fill="#ffffff" color="#ffffff" /> {r.rating}/10</span>}
                  <span>{formatTimeAgo(r.time)}</span>
                </div>
                <p>{r.text}</p>
                {r.likes > 0 && (
                  <span className="review-likes"><Heart size={12} fill="currentColor" /> {r.likes}</span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

