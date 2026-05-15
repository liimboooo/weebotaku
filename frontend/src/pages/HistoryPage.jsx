import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Trash2, PlayCircle, X, Compass } from "lucide-react";
import { getAnimeById } from "../data/animeData";

import Background from "../components/Background";
import AnimatedPage from "../components/AnimatedPage";

import "./HistoryPage.css";

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

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    setHistory(storedHistory);
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("watchHistory");
    setHistory([]);
  };

  const removeHistoryItem = (timestamp) => {
    const updated = history.filter((h) => h.timestamp !== timestamp);
    localStorage.setItem("watchHistory", JSON.stringify(updated));
    setHistory(updated);
  };

  const filteredHistory = history;

  const navigateWithViewTransition = (anime, episode, event) => {
    if (document.startViewTransition) {
      const x = event.clientX;
      const y = event.clientY;
      const card = event.currentTarget;
      const img = card.querySelector("img");
      const title = card.querySelector("h3");

      document.querySelectorAll(".history-card img, .history-card h3").forEach((el) => {
        el.style.viewTransitionName = "";
      });

      if (img) img.style.viewTransitionName = `anime-card-${anime.id}`;
      if (title) title.style.viewTransitionName = `anime-title-${anime.id}`;

      document.startViewTransition(() => {
        navigate(`/anime/${anime.id}?ep=${episode}`);
      }).ready.then(() => {
        document.documentElement.style.setProperty("--reveal-x", `${x}px`);
        document.documentElement.style.setProperty("--reveal-y", `${y}px`);
        document.documentElement.style.setProperty("--reveal-radius", "0%");

        requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--reveal-radius", "110%");
        });
      });
    } else {
      navigate(`/anime/${anime.id}?ep=${episode}`);
    }
  };

  return (
    <AnimatedPage>
      <div className="history-page">
        <Background />

        <div className="history-hero">
          <div className="history-header-content">
            <h1>
              <Clock size={24} /> Watch History
            </h1>
            <p>Pick up right where you left off</p>
          </div>
          {history.length > 0 && (
            <button className="clear-history-btn" onClick={clearHistory}>
              <Trash2 size={16} /> Clear History
            </button>
          )}
        </div>

        {/* genre filter removed per user preference */}

        {filteredHistory.length > 0 ? (
          <motion.div
            className="history-list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={`${history.length}`}
          >
            <AnimatePresence mode="popLayout">
              {filteredHistory.map((item) => {
                const staticAnime = getAnimeById(item.animeId);
                const anime = staticAnime || (item.animeName ? { name: item.animeName, img: item.animeImg || "", episodes: null, id: item.animeId } : null);
                if (!anime) return null;

                const date = new Date(item.timestamp).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const progress = anime.episodes && anime.episodes !== '?'
                  ? Math.min((item.episode / Number(anime.episodes)) * 100, 100)
                  : 0;

                return (
                  <motion.div
                    className="history-card"
                    key={item.timestamp}
                    variants={itemVariants}
                    exit="exit"
                    whileHover={{
                      y: -10,
                      boxShadow: "0 20px 40px rgba(230, 54, 54, 0.18)",
                      borderColor: "rgba(230, 54, 54, 0.28)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => navigateWithViewTransition(anime, item.episode, e)}
                  >
                    <div className="history-img-wrap">
                      <img src={anime.img} alt={anime.name} />
                      <div className="play-overlay">
                        <PlayCircle size={28} />
                      </div>
                    </div>
                    <div className="history-details">
                      <div className="history-title-row">
                        <h3>{anime.name}</h3>
                        <span className="history-date">{date}</span>
                      </div>
                      <p className="history-ep">Episode {item.episode}</p>
                      {progress > 0 && (
                        <div className="history-progress">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span>Watching</span>
                        </div>
                      )}
                    </div>
                    <button
                      className="remove-item-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistoryItem(item.timestamp);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            className="history-empty"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="empty-icon-wrap">
              <Clock size={32} />
            </div>
            <h3>No Watch History</h3>
            <p>You haven't watched any anime recently. Start watching now!</p>
            <button className="browse-btn" onClick={() => navigate("/home") }>
              <Compass size={16} />
              Discover Anime
            </button>
          </motion.div>
        )}

      </div>
    </AnimatedPage>
  );
}
