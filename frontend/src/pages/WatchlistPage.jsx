import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Star, Play, Sparkles, X, ArrowUpDown } from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import { loadWatchlist, removeFromWatchlist, loadWatchHistory } from "../services/storage";
import authService from "../services/authService";
import usePrefetchAnime from "../hooks/usePrefetchAnime";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./WatchlistPage.css";

export default function WatchlistPage() {
  useDocumentTitle("My Library");
  const navigate = useNavigate();
  const prefetch = usePrefetchAnime();
  const [animeList, setAnimeList] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");

  const refresh = () => {
    setAnimeList(loadWatchlist());
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener("watchlist-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("watchlist-updated", handler);
    };
  }, []);

  const removeAnime = (id) => {
    setAnimeList(removeFromWatchlist(id));
  };

  const progressMap = useMemo(() => {
    const history = loadWatchHistory();
    const map = {};
    history.forEach(h => { if (!map[h.animeId]) map[h.animeId] = h.episode; });
    return map;
  }, [animeList]);

  const getProgress = (id) => progressMap[id] || 0;

  const sortList = (list, key, getName, getRating, getProgress) => {
    const sorted = [...list];
    if (key === "title") sorted.sort((a, b) => (getName(a) || "").localeCompare(getName(b) || ""));
    else if (key === "rating") sorted.sort((a, b) => (getRating(b) || 0) - (getRating(a) || 0));
    else if (key === "progress") sorted.sort((a, b) => (getProgress(b) || 0) - (getProgress(a) || 0));
    return sorted;
  };

  const filteredAnime = useMemo(() => {
    let list = animeList;
    if (statusFilter !== "All") {
      list = list.filter(a => (a.listStatus || "Watch Later") === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => (a.name || '').toLowerCase().includes(q));
    }
    return sortList(list, sortBy, a => a.name, a => a.rating, a => progressMap[a.id] || 0);
  }, [animeList, search, statusFilter, sortBy, progressMap]);

  const lastWatched = useMemo(() => {
    const history = loadWatchHistory();
    const wlIds = new Set(animeList.map(a => a.id));
    const recent = history.find(h => wlIds.has(h.animeId));
    if (!recent) return null;
    const wlItem = animeList.find(a => a.id === recent.animeId);
    return wlItem ? { ...wlItem, episode: recent.episode, timestamp: recent.timestamp } : null;
  }, [animeList]);
  const totalItems = animeList.length;
  const totalEps = animeList.reduce((s, a) => s + (a.episodes || 0), 0);

  return (
    <AnimatedPage>
      <div className="wl">
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
                Every anime you are watching, all in one place.
                Track your progress and discover what is next.
              </p>
              <div className="wl-hero-metrics">
                <div className="wl-metric"><strong>{totalItems}</strong><span>Total Items</span></div>
                <div className="wl-metric"><strong>{totalEps}</strong><span>Episodes</span></div>
              </div>
            </div>
            {(lastWatched || filteredAnime.length > 0) && (
              <div
                className="wl-hero-hud"
                onClick={() => lastWatched ? navigate(`/anime/${lastWatched.id}?ep=${lastWatched.episode}`) : navigate(`/anime/${filteredAnime[0].id}/info`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="wl-hud-img">
                  <img src={lastWatched?.img || filteredAnime[0]?.img} alt="" />
                </div>
                <div className="wl-hud-info">
                  <span className="wl-hud-label">{lastWatched ? `CONTINUE EP ${lastWatched.episode}` : "IN YOUR LIST"}</span>
                  <span className="wl-hud-title">{lastWatched?.name || filteredAnime[0]?.name}</span>
                  <span className="wl-hud-rating">
                    <Star size={12} fill="currentColor" /> {(lastWatched?.rating || filteredAnime[0]?.rating)?.toFixed?.(1) || "?"}
                  </span>
                </div>
              </div>
            )}
          </motion.section>

          {!authService.isLoggedIn() && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', margin: '0 0 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, fontSize: 13, color: '#c4b5fd' }}>
              <span>Saved locally on this device. <strong>Sign in</strong> to sync across devices.</span>
              <button onClick={() => navigate('/auth?next=/watchlist')} style={{ background: 'linear-gradient(135deg,#374151,#d1d5db)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Sign In</button>
            </div>
          )}

          <div className="wl-tabs">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ArrowUpDown size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                aria-label="Sort by"
                style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer', appearance: 'none' }}
              >
                <option value="recent" style={{ background: '#1a1a1f' }}>Recently Added</option>
                <option value="title" style={{ background: '#1a1a1f' }}>Title A–Z</option>
                <option value="rating" style={{ background: '#1a1a1f' }}>Highest Rated</option>
                <option value="progress" style={{ background: '#1a1a1f' }}>Most Progress</option>
              </select>
            </div>
            <div className="wl-search-wrap" style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input
                className="wl-search-input"
                type="text"
                placeholder="Search watchlist..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 32px 8px 34px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', width: 200 }}
              />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={14} /></button>}
            </div>
          </div>

          <div className="wl-status-filters">
            {["All", "Watch Later", "Watching", "Completed", "On Hold", "Dropped"].map(s => (
              <button key={s} className={`wl-status-pill ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                {s}{s !== "All" && <span className="wl-status-count">{animeList.filter(a => s === "Watch Later" ? (!a.listStatus || a.listStatus === s) : a.listStatus === s).length}</span>}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key="anime" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {filteredAnime.length > 0 ? (
                <div className="wl-grid">
                  <AnimatePresence mode="popLayout">
                    {filteredAnime.map((anime, i) => (
                      <motion.article
                        className="wl-card"
                        key={anime.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: (i % 12) * 0.03, type: "spring", stiffness: 100, damping: 14 }}
                        whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(255,255,255,0.3)", borderColor: "#ffffff" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/anime/${anime.id}/info`)}
                        onMouseEnter={() => prefetch.onMouseEnter(anime.id)}
                        onMouseLeave={prefetch.onMouseLeave}
                      >
                        <div className="wl-card-thumb">
                          <img src={anime.img} alt={anime.name} loading="lazy" decoding="async" />
                          <div className="wl-card-overlay">
                            <div className="wl-card-play"><Play size={20} fill="currentColor" /></div>
                            <div className="wl-card-tech">
                              <span>{anime.episodes} eps</span>
                              {getProgress(anime.id) > 0 && <span>Ep {getProgress(anime.id)}</span>}
                            </div>
                          </div>
                          {getProgress(anime.id) > 0 && (
                            <div className="wl-card-progress" style={{ width: `${(getProgress(anime.id) / (anime.episodes || 1)) * 100}%` }} />
                          )}
                          <span className={`wl-badge ${(anime.status || "").toLowerCase()}`}>{anime.status || "Unknown"}</span>
                          <button
                            className="wl-card-wish active"
                            onClick={e => { e.stopPropagation(); removeAnime(anime.id); }}
                          >
                            <Heart size={13} fill="currentColor" />
                          </button>
                        </div>
                        <div className="wl-card-body">
                          <h3>{anime.name}</h3>
                          <div className="wl-card-meta">
                            <span>{anime.year}</span><span>•</span><span>{anime.episodes} eps</span>
                          </div>
                          <div className="wl-card-rating">
                            <Star size={11} fill="currentColor" /> {anime.rating?.toFixed(1) || "?"}
                          </div>
                          {anime.genres && anime.genres.length > 0 && (
                            <div className="wl-card-tags">
                              {anime.genres.slice(0, 3).map(g => <span key={g} className="wl-tag">{g}</span>)}
                            </div>
                          )}
                        </div>
                        <div className="wl-card-glow" />
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="wl-empty">
                  <Heart size={48} />
                  <h3>{search ? 'No matches' : 'Watchlist is empty'}</h3>
                  <p>{search ? `No anime matching "${search}"` : 'Browse anime and save them to your watchlist.'}</p>
                  {!search && <button className="wl-browse-btn" onClick={() => navigate("/browse/anime")}>
                    <Search size={14} /> Browse Anime
                  </button>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </AnimatedPage>
  );
}
