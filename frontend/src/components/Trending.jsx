import React from "react";
import { useNavigate } from "react-router-dom";
import { getTrendingAnime } from "../data/animeData";
import "./Trending.css";

export default function Trending() {
  const navigate = useNavigate();
  const trendingAnime = getTrendingAnime();

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalf = rating % 2 >= 1;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <>
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="star full">★</span>
        ))}
        {hasHalf && <span className="star half">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="star empty">★</span>
        ))}
      </>
    );
  };

  return (
    <section className="trending-section">
      <h2>🔥 Trending Now</h2>
      <div className="trending-grid">
        {trendingAnime.map((anime, index) => (
          <div
            className="trending-card"
            key={anime.id}
            onClick={() => navigate(`/anime/${anime.id}`)}
          >
            <div className="trend-rank">#{index + 1}</div>
            <div className="trend-badge">{anime.trend}</div>
            <img src={anime.img} alt={anime.name} />
            <div className="trending-info">
              <h3>{anime.name}</h3>
              <div className="trending-rating">
                <div className="stars">{renderStars(anime.rating)}</div>
                <span>{anime.rating}/10</span>
              </div>
              <p className="trend-votes">{anime.votes.toLocaleString()} votes</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
