import React, { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send } from "lucide-react";
import "./Reviews.css";

export default function Reviews({ animeId, selectedEp }) {
  const [reviews, setReviews] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`reviews-${animeId}`) || "[]");
    } catch { return []; }
  });
  const [newReview, setNewReview] = useState("");

  const addReview = () => {
    if (!newReview.trim()) return;
    const review = {
      id: Date.now(),
      text: newReview,
      user: localStorage.getItem("username") || "Anime Fan",
      time: Date.now(),
    };
    const updated = [review, ...reviews];
    setReviews(updated);
    localStorage.setItem(`reviews-${animeId}`, JSON.stringify(updated));
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
                {r.user.charAt(0).toUpperCase()}
              </div>
              <div className="review-body">
                <div className="review-head">
                  <strong>{r.user}</strong>
                  <span>{formatTimeAgo(r.time)}</span>
                </div>
                <p>{r.text}</p>
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
