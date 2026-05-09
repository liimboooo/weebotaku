import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, Play, Bookmark, Heart, Share2, Star, Calendar, Tv, ShieldCheck, User, Bell } from "lucide-react";
import { getAnimeById, getTrendingAnime } from "../data/animeData";

import Background from "../components/Background";
import Reviews from "../components/Reviews";
import FeaturedAnime from "../components/FeaturedAnime";
import AnimatedPage from "../components/AnimatedPage";
import { useToast } from "../components/Toast";
import "./AnimeDetail.css";

export default function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedEp, setSelectedEp] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  const anime = getAnimeById(parseInt(id));

  // Related anime (same genres)
  const getRelatedAnime = () => {
    const allAnime = getTrendingAnime();
    return allAnime
      .filter(a => a.id !== parseInt(id) && a.genres.some(g => anime?.genres.includes(g)))
      .slice(0, 6);
  };

  useEffect(() => {
    const storedWatchlist = JSON.parse(localStorage.getItem("watchlist") || "[]");
    setIsWatchlisted(storedWatchlist.includes(parseInt(id)));

    const storedFollowing = JSON.parse(localStorage.getItem("followingAnime") || "[]");
    setIsFollowing(storedFollowing.some(f => f.animeId === parseInt(id)));

    const storedLikes = JSON.parse(localStorage.getItem("likedAnime") || "[]");
    setIsLiked(storedLikes.includes(parseInt(id)));

    const storedRatings = JSON.parse(localStorage.getItem("userRatings") || "{}");
    if (storedRatings[id]) {
      setUserRating(storedRatings[id]);
    }

    window.scrollTo(0, 0);
  }, [id]);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from(".hero-bg", {
      scale: 1.3,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out"
    })
    .from(".detail-poster", {
      x: -50,
      opacity: 0,
      duration: 0.5,
      ease: "power2.out"
    }, "-=0.5")
    .from(".detail-content > *", {
      y: 20,
      opacity: 0,
      stagger: 0.05,
      duration: 0.4,
      ease: "power2.out"
    }, "-=0.3");

    // Simplified parallax - disabled for performance
  }, { dependencies: [id] });

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

  const toggleFollowing = () => {
    const stored = JSON.parse(localStorage.getItem("followingAnime") || "[]");
    const storedNotifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    const animeId = parseInt(id);
    let updated;
    if (isFollowing) {
      updated = stored.filter((f) => f.animeId !== animeId);
      const cleanedNotifications = storedNotifications.filter(
        (notification) => notification.animeId !== animeId || notification.type !== "follow"
      );
      localStorage.setItem("notifications", JSON.stringify(cleanedNotifications));
      showToast(`Unfollowed ${anime.name}`, "error");
    } else {
      updated = [...stored, {
        animeId: animeId,
        animeName: anime.name,
        animeImg: anime.img,
        followedAt: Date.now(),
        unreadUpdates: 0,
        lastUpdate: Date.now()
      }];
      const nextNotifications = [
        {
          id: `follow-${animeId}`,
          text: `Following ${anime.name}`,
          animeId,
          read: false,
          type: "follow",
        },
        ...storedNotifications.filter((notification) => notification.animeId !== animeId || notification.type !== "follow"),
      ];
      localStorage.setItem("notifications", JSON.stringify(nextNotifications));
      showToast(`Following ${anime.name}! 🔔`, "success");
    }
    localStorage.setItem("followingAnime", JSON.stringify(updated));
    setIsFollowing(!isFollowing);
  };

  const handleRate = (rating) => {
    const storedRatings = JSON.parse(localStorage.getItem("userRatings") || "{}");
    storedRatings[id] = rating;
    localStorage.setItem("userRatings", JSON.stringify(storedRatings));
    setUserRating(rating);
    showToast(`You rated ${anime.name} ${rating}/10!`, "success");
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

  if (!anime) {
    return (
      <AnimatedPage>
        <div className="anime-detail-page">
          <Background />
          <div className="detail-error">
            <h2>Anime not found</h2>
            <button onClick={() => navigate(-1)}>Go back</button>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="anime-detail-page">
        <Background />

        <div className="detail-hero">
          <img 
            src={anime.img} 
            alt={anime.name} 
            className="hero-bg" 
            style={{ viewTransitionName: `anime-card-${id}` }}
          />
          <div className="hero-overlay">
            <button
              className="back-btn"
              onClick={() => {
                if (document.startViewTransition) {
                  document.startViewTransition(() => navigate(-1));
                } else {
                  navigate(-1);
                }
              }}
            >
              <ArrowLeft size={20} /> Back
            </button>
          </div>
        </div>

      <div className={`detail-container ${isCinemaMode ? 'cinema-mode' : ''}`}>
        <div className="detail-poster">
          <img
            src={anime.img}
            alt={anime.name}
          />
          <div className="poster-badge">
            <span className={`status-badge ${anime.status.toLowerCase()}`}>
              {anime.status}
            </span>
          </div>
        </div>

        <div className="detail-content">
          <h1
            className="anime-title"
            style={{ viewTransitionName: `anime-title-${id}` }}
          >
            {anime.name}
          </h1>

          <div className="detail-rating">
            <div className="global-rating">
              <div className="stars">{renderStars(anime.rating)}</div>
              <span className="rating-value">{anime.rating}/10</span>
              <span className="votes">({anime.votes.toLocaleString()} votes)</span>
            </div>

            <div className="user-rating-box">
              <p>Your Rating:</p>
              <div className="user-stars">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <span
                    key={num}
                    className={`user-star ${userRating >= num ? 'active' : ''}`}
                    onClick={() => handleRate(num)}
                  >
                    ★
                  </span>
                ))}
                <span className="user-rating-val">{userRating > 0 ? `${userRating}/10` : 'Not Rated'}</span>
              </div>
            </div>
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
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary" 
                onClick={() => setShowPlayer(true)}
              >
                <Play size={18} fill="white" /> Watch Now
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`btn btn-secondary ${isWatchlisted ? "active" : ""}`}
                onClick={toggleWatchlist}
              >
                <Bookmark size={18} fill={isWatchlisted ? "white" : "none"} />
                {isWatchlisted ? "In Watchlist" : "Add to Watchlist"}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`btn btn-secondary ${isFollowing ? "active" : ""}`}
                onClick={toggleFollowing}
              >
                <Bell size={18} fill={isFollowing ? "white" : "none"} />
                {isFollowing ? "Following" : "Follow"}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`btn btn-secondary ${isLiked ? "active" : ""}`}
                onClick={toggleLiked}
              >
                <Heart size={18} fill={isLiked ? "#e63636" : "none"} color={isLiked ? "#e63636" : "currentColor"} />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast("Link copied to clipboard!", "success");
                }}
              >
                <Share2 size={18} /> Share
              </motion.button>
            </div>

          <AnimatePresence>
            {showPlayer && (
              <motion.div 
                className={`player-section ${isCinemaMode ? 'cinema' : ''}`}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
              >
                <div className="player-header">
                  <h2>Now Watching: Episode {selectedEp}</h2>
                  <div className="ep-controls">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`cinema-toggle ${isCinemaMode ? 'active' : ''}`}
                      onClick={() => setIsCinemaMode(!isCinemaMode)}
                      title="Cinema Mode"
                    >
                      {isCinemaMode ? <ShieldCheck size={18} /> : <Tv size={18} />}
                    </motion.button>
                    <select
                      value={selectedEp}
                      onChange={(e) => setSelectedEp(e.target.value)}
                      className="ep-selector"
                    >
                      {[...Array(anime.episodes)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>Episode {i + 1}</option>
                      ))}
                    </select>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="close-player" 
                      onClick={() => setShowPlayer(false)}
                    >
                      Close
                    </motion.button>
                  </div>
                </div>
                <div className="video-container">
                  <iframe
                    src={`https://vidsrcme.ru/embed/tv?imdb=${anime.imdbId}&season=1&episode=${selectedEp}`}
                    style={{ width: "100%", height: "100%" }}
                    frameBorder="0"
                    referrerPolicy="origin"
                    allowFullScreen
                    title="Video Player"
                  ></iframe>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

          <div className="watch-sources-section">
            <h2>📺 Where to Watch</h2>
            <div className="sources-grid">
              <a href="#" className="source-btn crunchyroll" target="_blank" rel="noopener noreferrer">
                <span className="source-logo">CR</span>
                <span className="source-name">Crunchyroll</span>
              </a>
              <a href="#" className="source-btn netflix" target="_blank" rel="noopener noreferrer">
                <span className="source-logo">📺</span>
                <span className="source-name">Netflix</span>
              </a>
              <a href="#" className="source-btn hulu" target="_blank" rel="noopener noreferrer">
                <span className="source-logo">H</span>
                <span className="source-name">Hulu</span>
              </a>
              <a href="#" className="source-btn hidive" target="_blank" rel="noopener noreferrer">
                <span className="source-logo">HD</span>
                <span className="source-name">HiDive</span>
              </a>
            </div>
          </div>

          <Reviews animeId={anime.id} selectedEp={selectedEp} />
        </div>
      </div>

      <div className="recommendations-container">
        <h2 className="section-header">🎌 Related Anime</h2>
        <FeaturedAnime 
          animeList={getRelatedAnime()} 
          title="Based on your interest" 
        />
      </div>

      <div className="recommendations-container">
        <FeaturedAnime 
          animeList={getTrendingAnime().filter(a => a.id !== parseInt(id))} 
          title="People Also Watched" 
        />
      </div>

    </div>
    </AnimatedPage>
  );
}
