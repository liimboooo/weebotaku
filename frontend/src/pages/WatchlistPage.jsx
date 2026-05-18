import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, BookOpen, Library, Search, Star, Play, Sparkles } from "lucide-react";
import Background from "../components/Background";
import AnimatedPage from "../components/AnimatedPage";
import { loadWatchlist, removeFromWatchlist } from "../services/storage";
import { loadReadlist, removeFromReadlist } from "../services/storage";
import "./WatchlistPage.css";

export default function WatchlistPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("anime");
  const [animeList, setAnimeList] = useState([]);
  const [mangaList, setMangaList] = useState([]);

  const refresh = () => {
    setAnimeList(loadWatchlist());
    setMangaList(loadReadlist());
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const removeAnime = (id) => {
    setAnimeList(removeFromWatchlist(id));
  };

  const removeManga = (id) => {
    setMangaList(removeFromReadlist(id));
  };

  const getProgress = (id) => {
    const history = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    const entry = history.find(h => h.animeId === id);
    return entry ? entry.episode : 0;
  };

  const getMangaProgress = (id) => {
    const progress = JSON.parse(localStorage.getItem("mangaProgress") || "{}");
    return progress[id] || 0;
  };

  const activeList = tab === "anime" ? animeList : mangaList;
  const totalItems = animeList.length + mangaList.length;
  const totalEps = animeList.reduce((s, a) => s + (a.episodes || 0), 0);
  const totalCh = mangaList.reduce((s, m) => s + (m.ch || 0), 0);

  return (
    <AnimatedPage>
      <div className="wl">
        <Background />
        <div className="wl-bg-ornament" />

        <main className="wl-shell">
          <motion.section className="wl-hero" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="wl-hero-bg" />
            <div className="wl-hero-gradient" />
            <div className="wl-hero-content">
              <span className="wl-eyebrow"><Sparkles size={14} /> YOUR COLLECTION</span>
              <h1>
                <span className="wl-hero-main">MY</span>
                <span className="wl-hero-accent">LIBRARY</span>
              </h1>
              <p className="wl-hero-desc">
                Every anime you are watching and every manga you are reading, all in one place.
                Track your progress and discover what is next.
              </p>
              <div className="wl-hero-metrics">
                <div className="wl-metric"><strong>{totalItems}</strong><span>Total Items</span></div>
                <div className="wl-metric"><strong>{totalEps}</strong><span>Episodes</span></div>
                <div className="wl-metric"><strong>{totalCh}</strong><span>Chapters</span></div>
              </div>
            </div>
            {activeList.length > 0 && (
              <div className="wl-hero-hud">
                <div className="wl-hud-img">
                  <img src={tab === "anime" ? activeList[0].img : activeList[0].cover} alt="" />
                </div>
                <div className="wl-hud-info">
                  <span className="wl-hud-label">{tab === "anime" ? "WATCHING" : "READING"}</span>
                  <span className="wl-hud-title">{tab === "anime" ? activeList[0].name : activeList[0].title}</span>
                  <span className="wl-hud-rating"><Star size={12} fill="currentColor" /> {tab === "anime" ? activeList[0].rating?.toFixed(1) || "?" : activeList[0].rating?.toFixed(1) || "?"}</span>
                </div>
              </div>
            )}
          </motion.section>

          <div className="wl-tabs">
            <button className={`wl-tab ${tab === "anime" ? "active" : ""}`} onClick={() => setTab("anime")}>
              <Heart size={14} /> Watchlist <span className="wl-tab-count">{animeList.length}</span>
            </button>
            <button className={`wl-tab ${tab === "manga" ? "active" : ""}`} onClick={() => setTab("manga")}>
              <BookOpen size={14} /> Readlist <span className="wl-tab-count">{mangaList.length}</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === "anime" ? (
              <motion.div key="anime" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {animeList.length > 0 ? (
                  <div className="wl-grid">
                    <AnimatePresence mode="popLayout">
                      {animeList.map((anime, i) => (
                        <motion.article
                          className="upcoming-card"
                          key={anime.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: (i % 12) * 0.03, type: "spring", stiffness: 100, damping: 14 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate(`/anime/${anime.id}`)}
                        >
                          <div className="upcoming-card-img">
                            <img src={anime.img} alt={anime.name} loading="lazy" />
                            <div className="upcoming-card-badge">{anime.status || "Unknown"}</div>
                          </div>
                          <div className="upcoming-card-body">
                            <h3>{anime.name}</h3>
                            <div className="upcoming-card-meta">
                              <span className="upcoming-card-tag">{anime.rating?.toFixed(1) || "?"}</span>
                              <span className="upcoming-card-type">{anime.episodes} eps</span>
                            </div>
                          </div>
                        </motion.article>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="wl-empty">
                    <Heart size={48} />
                    <h3>Watchlist is empty</h3>
                    <p>Browse anime and save them to your watchlist.</p>
                    <button className="wl-browse-btn" onClick={() => navigate("/browse/anime")}>
                      <Search size={14} /> Browse Anime
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="manga" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {mangaList.length > 0 ? (
                  <div className="wl-grid">
                    <AnimatePresence mode="popLayout">
                      {mangaList.map((manga, i) => (
                        <motion.article
                          className="upcoming-card"
                          key={manga.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: (i % 12) * 0.03, type: "spring", stiffness: 100, damping: 14 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate(`/manga/${manga.id}`)}
                        >
                          <div className="upcoming-card-img">
                            <img src={manga.cover} alt={manga.title} loading="lazy" />
                            <div className="upcoming-card-badge">{manga.status || "Unknown"}</div>
                          </div>
                          <div className="upcoming-card-body">
                            <h3>{manga.title}</h3>
                            <div className="upcoming-card-meta">
                              <span className="upcoming-card-tag">{manga.demo}</span>
                              <span className="upcoming-card-type">{manga.ch} ch</span>
                            </div>
                          </div>
                        </motion.article>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="wl-empty">
                    <BookOpen size={48} />
                    <h3>Readlist is empty</h3>
                    <p>Browse manga and save them to your readlist.</p>
                    <button className="wl-browse-btn" onClick={() => navigate("/browse/manga")}>
                      <Search size={14} /> Browse Manga
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </AnimatedPage>
  );
}
