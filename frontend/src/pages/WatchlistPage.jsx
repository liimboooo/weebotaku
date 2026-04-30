import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAnimeById } from "../data/animeData";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import { useToast } from "../components/Toast";
import "./WatchlistPage.css";

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("watchlist") || "[]");
    setWatchlist(stored);
  }, []);

  const removeFromWatchlist = (id, name) => {
    const updated = watchlist.filter((wId) => wId !== id);
    localStorage.setItem("watchlist", JSON.stringify(updated));
    setWatchlist(updated);
    showToast(`${name} removed from Watchlist`, "error");
  };

  const watchlistAnime = watchlist.map((id) => getAnimeById(id)).filter(Boolean);

  return (
    <div className="watchlist-page">
      <Background />
      <Header />

      <div className="watchlist-hero">
        <h1>
          <ion-icon name="bookmark"></ion-icon> My Watchlist
        </h1>
        <p>{watchlistAnime.length} anime saved</p>
      </div>

      {watchlistAnime.length > 0 ? (
        <div className="watchlist-grid">
          {watchlistAnime.map((anime) => (
            <div className="watchlist-card" key={anime.id}>
              <div
                className="watchlist-img-wrap"
                onClick={() => navigate(`/anime/${anime.id}`)}
              >
                <img src={anime.img} alt={anime.name} />
                <div className="watchlist-play-overlay">
                  <ion-icon name="play-circle"></ion-icon>
                </div>
                <span className={`wl-status ${anime.status.toLowerCase()}`}>
                  {anime.status}
                </span>
              </div>
              <div className="watchlist-card-content">
                <h3 onClick={() => navigate(`/anime/${anime.id}`)}>{anime.name}</h3>
                <div className="wl-meta">
                  <span>{anime.year}</span>
                  <span>•</span>
                  <span>{anime.episodes} episodes</span>
                </div>
                <div className="wl-rating">
                  <span className="wl-star">★</span>
                  <span>{anime.rating}/10</span>
                </div>
                <div className="wl-genres">
                  {anime.genres.slice(0, 3).map((g) => (
                    <span key={g} className="wl-genre-tag">{g}</span>
                  ))}
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeFromWatchlist(anime.id, anime.name)}
                >
                  <ion-icon name="trash-outline"></ion-icon>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="watchlist-empty">
          <div className="empty-icon-wrap">
            <ion-icon name="bookmark-outline"></ion-icon>
          </div>
          <h3>Your watchlist is empty</h3>
          <p>Browse anime and add them to your watchlist to keep track of what you want to watch.</p>
          <button className="browse-btn" onClick={() => navigate("/search")}>
            <ion-icon name="search-outline"></ion-icon>
            Browse Anime
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}
