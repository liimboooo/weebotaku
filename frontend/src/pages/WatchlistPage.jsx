import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAnimeById } from "../data/animeData";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import { useToast } from "../components/Toast";
import AnimatedPage from "../components/AnimatedPage";
import "./WatchlistPage.css";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 20,
    },
  },
};

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

  const navigateWithViewTransition = (anime, event) => {
    if (document.startViewTransition) {
      const x = event.clientX;
      const y = event.clientY;
      const card = event.currentTarget;
      const img = card.querySelector("img");
      const title = card.querySelector("h3");

      document.querySelectorAll(".watchlist-card img, .watchlist-card h3").forEach((el) => {
        el.style.viewTransitionName = "";
      });

      if (img) img.style.viewTransitionName = `anime-card-${anime.id}`;
      if (title) title.style.viewTransitionName = `anime-title-${anime.id}`;

      document.startViewTransition(() => {
        navigate(`/anime/${anime.id}`);
      }).ready.then(() => {
        document.documentElement.style.setProperty("--reveal-x", `${x}px`);
        document.documentElement.style.setProperty("--reveal-y", `${y}px`);
        document.documentElement.style.setProperty("--reveal-radius", "0%");

        requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--reveal-radius", "110%");
        });
      });
    } else {
      navigate(`/anime/${anime.id}`);
    }
  };

  const watchlistAnime = watchlist.map((id) => getAnimeById(id)).filter(Boolean);
  const filteredWatchlistAnime = watchlistAnime;

  return (
    <AnimatedPage>
      <div className="watchlist-page">
        <Background />
        <Header />

        <div className="watchlist-hero">
          <h1>
            <ion-icon name="bookmark"></ion-icon> My Watchlist
          </h1>
          <p>{watchlistAnime.length} anime saved</p>
        </div>

        {/* genre filter removed per user preference */}

        {filteredWatchlistAnime.length > 0 ? (
          <motion.div
            className="watchlist-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={`${watchlistAnime.length}`}
          >
            <AnimatePresence mode="popLayout">
              {filteredWatchlistAnime.map((anime) => (
                <motion.div
                  className="watchlist-card"
                  key={anime.id}
                  variants={itemVariants}
                  exit="exit"
                  whileHover={{
                    y: -10,
                    boxShadow: "0 20px 40px rgba(230, 54, 54, 0.18)",
                    borderColor: "rgba(230, 54, 54, 0.35)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => navigateWithViewTransition(anime, e)}
                >
                  <div className="watchlist-img-wrap">
                    <img src={anime.img} alt={anime.name} />
                    <div className="watchlist-play-overlay">
                      <ion-icon name="play-circle"></ion-icon>
                    </div>
                    <span className={`wl-status ${anime.status.toLowerCase()}`}>
                      {anime.status}
                    </span>
                  </div>
                  <div className="watchlist-card-content">
                    <h3>{anime.name}</h3>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(anime.id, anime.name);
                      }}
                    >
                      <ion-icon name="trash-outline"></ion-icon>
                      Remove
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="watchlist-empty">
            <div className="empty-icon-wrap">
              <ion-icon name="bookmark-outline"></ion-icon>
            </div>
            <h3>Your watchlist is empty</h3>
            <p>Browse anime and add them to your watchlist to keep track of what you want to watch.</p>
            <button className="browse-btn" onClick={() => navigate("/search") }>
              <ion-icon name="search-outline"></ion-icon>
              Browse Anime
            </button>
          </div>
        )}

        <Footer />
      </div>
    </AnimatedPage>
  );
}
