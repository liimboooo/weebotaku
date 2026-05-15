import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Send } from "lucide-react";
import reviewService from "../services/reviewService";
import "./Reviews.css";

export default function Reviews({ animeId, selectedEp }) {
  const [reviews, setReviews] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`reviews-${animeId}`) || "[]");
    } catch { return []; }
  });
  const [newReview, setNewReview] = useState("");
  const [backendReviews, setBackendReviews] = useState([]);

  // Fetch reviews from backend on mount
  useEffect(() => {
    reviewService.getReviews("anime", animeId)
      .then(res => {
        if (res?.data?.length > 0) {
          setBackendReviews(res.data);
        }
      })
      .catch(() => {});
  }, [animeId]);

  // Merge local + backend reviews (backend first, then local)
  const allReviews = [
    ...backendReviews.map(r => ({
      id: r._id,
      text: r.content,
      title: r.title,
      user: r.user?.username || "Unknown",
      avatar: r.user?.avatar || "",
      time: new Date(r.createdAt).getTime(),
      rating: r.rating,
      likes: r.likes?.length || 0,
      isBackend: true,
    })),
    ...reviews.filter(r => !backendReviews.some(br => br.content === r.text)),
  ];

  const addReview = async () => {
    if (!newReview.trim()) return;
    const username = localStorage.getItem("username") || "Anime Fan";

    // Add locally first for instant feedback
    const review = {
      id: Date.now(),
      text: newReview,
      user: username,
      time: Date.now(),
    };
    const updated = [review, ...reviews];
    setReviews(updated);
    localStorage.setItem(`reviews-${animeId}`, JSON.stringify(updated));

    // Sync to backend
    try {
      await reviewService.createReview(
        animeId,
        null,
        8,
        newReview.slice(0, 100),
        newReview,
        false
      );
      // Refresh from backend
      const res = await reviewService.getReviews("anime", animeId);
      if (res?.data) setBackendReviews(res.data);
    } catch {
      // Keep local-only review if backend fails
    }

    setNewReview("");
  };

  return (
    <div className="reviews-section">
      <h3>Reviews & Comments</h3>

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
        {allReviews.length === 0 ? (
          <p className="reviews-empty">No reviews yet. Be the first!</p>
        ) : (
          allReviews.map((r) => (
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
                  {r.rating && <span className="review-rating"><Star size={10} fill="#ffd700" color="#ffd700" /> {r.rating}/10</span>}
                  <span>{formatTimeAgo(r.time)}</span>
                </div>
                <p>{r.text}</p>
                {r.isBackend && r.likes > 0 && (
                  <span className="review-likes">❤️ {r.likes}</span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
