import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAnimeById } from "../data/animeData";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import Reviews from "../components/Reviews";
import { useToast } from "../components/Toast";
import "./AnimeDetail.css";

export default function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedEp, setSelectedEp] = useState(1);
  const [isLiked, setIsLiked] = useState(false);

  const anime = getAnimeById(parseInt(id));

  useEffect(() => {
    const storedWatchlist = JSON.parse(localStorage.getItem("watchlist") || "[]");
    setIsWatchlisted(storedWatchlist.includes(parseInt(id)));
    const storedLikes = JSON.parse(localStorage.getItem("likedAnime") || "[]");
    setIsLiked(storedLikes.includes(parseInt(id)));
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (showPlayer) {
      const storedHistory = JSON.parse(localStorage.getItem("watchHistory") || "[]");
      const newItem = {
        animeId: parseInt(id),
        episode: selectedEp,
        timestamp: Date.now()
      };
      
      const filteredHistory = storedHistory.filter(item => item.animeId !== parseInt(id));
      localStorage.setItem("watchHistory", JSON.stringify([newItem, ...filteredHistory].slice(0, 50)));
    }
  }, [showPlayer, selectedEp, id]);

  const toggleWatchlist = () => {
    const stored = JSON.parse(localStorage.getItem("watchlist") || "[]");
    const animeId = parseInt(id);
    let updated;
    if (stored.includes(animeId)) {
      updated = stored.filter((wId) => wId !== animeId);
      showToast(`${anime.name} removed from Watchlist!`, "error");
    } else {
      updated = [...stored, animeId];
      showToast(`${anime.name} added to Watchlist!`, "success");
    }
    localStorage.setItem("watchlist", JSON.stringify(updated));
    setIsWatchlisted(!isWatchlisted);
  };

  const toggleLiked = () => {
    const stored = JSON.parse(localStorage.getItem("likedAnime") || "[]");
    const animeId = parseInt(id);
    let updated;
    if (stored.includes(animeId)) {
      updated = stored.filter((lId) => lId !== animeId);
      showToast(`Removed ${anime.name} from Liked`, "error");
    } else {
      updated = [...stored, animeId];
      showToast(`You liked ${anime.name}! ❤️`, "success");
    }
    localStorage.setItem("likedAnime", JSON.stringify(updated));
    setIsLiked(!isLiked);
  };

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
    <div className="anime-detail-page">
      <Background />
      <Header />

      <div className="detail-hero">
        <img src={anime.img} alt={anime.name} className="hero-bg" />
        <div className="hero-overlay">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ion-icon name="arrow-back"></ion-icon> Back
          </button>
        </div>
      </div>

      <div className="detail-container">
        <div className="detail-poster">
          <img src={anime.img} alt={anime.name} />
          <div className="poster-badge">
            <span className={`status-badge ${anime.status.toLowerCase()}`}>
              {anime.status}
            </span>
          </div>
        </div>

        <div className="detail-content">
          <h1 className="anime-title">{anime.name}</h1>

          <div className="detail-rating">
            <div className="stars">{renderStars(anime.rating)}</div>
            <span className="rating-value">{anime.rating}/10</span>
            <span className="votes">({anime.votes.toLocaleString()} votes)</span>
          </div>

          <div className="anime-meta">
            <div className="meta-item">
              <span className="meta-label">Year</span>
              <span className="meta-value">{anime.year}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Episodes</span>
              <span className="meta-value">{anime.episodes}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Season</span>
              <span className="meta-value">{anime.season}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Studio</span>
              <span className="meta-value">{anime.studio}</span>
            </div>
          </div>

          <div className="genres">
            {anime.genres.map((genre) => (
              <span key={genre} className="genre-tag">
                {genre}
              </span>
            ))}
          </div>

          <div className="synopsis">
            <h2>Synopsis</h2>
            <p>{anime.synopsis}</p>
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={() => setShowPlayer(true)}>
              <ion-icon name="play"></ion-icon> Watch Now
            </button>
            <button
              className={`btn btn-secondary ${isWatchlisted ? "active" : ""}`}
              onClick={toggleWatchlist}
            >
              <ion-icon name={isWatchlisted ? "bookmark" : "bookmark-outline"}></ion-icon>
              {isWatchlisted ? "In Watchlist" : "Add to Watchlist"}
            </button>
            <button
              className={`btn btn-secondary ${isLiked ? "active" : ""}`}
              onClick={toggleLiked}
            >
              <ion-icon name={isLiked ? "heart" : "heart-outline"}></ion-icon>
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                showToast("Link copied to clipboard!", "success");
              }}
            >
              <ion-icon name="share-social-outline"></ion-icon> Share
            </button>
          </div>

          {showPlayer && (
            <div className="player-section">
              <div className="player-header">
                <h2>Now Watching: Episode {selectedEp}</h2>
                <div className="ep-controls">
                  <select 
                    value={selectedEp} 
                    onChange={(e) => setSelectedEp(e.target.value)}
                    className="ep-selector"
                  >
                    {[...Array(anime.episodes)].map((_, i) => (
                      <option key={i+1} value={i+1}>Episode {i+1}</option>
                    ))}
                  </select>
                  <button className="close-player" onClick={() => setShowPlayer(false)}>Close</button>
                </div>
              </div>
              <div className="video-container">
                <iframe 
                  src={`https://vidsrcme.ru/embed/tv?imdb=${anime.imdbId}&season=1&episode=${selectedEp}`}
                  style={{ width: "100%", height: "100%" }} 
                  frameBorder="0" 
                  referrerPolicy="origin" 
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          <div className="additional-info">
            <div className="info-box">
              <h3>Director</h3>
              <p>{anime.director}</p>
            </div>
            <div className="info-box">
              <h3>Studio</h3>
              <p>{anime.studio}</p>
            </div>
          </div>
          
          <Reviews animeId={anime.id} selectedEp={selectedEp} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
