import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Trash2, Play, X, Compass, Sparkles, Film } from "lucide-react";

import Background from "../components/Background";
import AnimatedPage from "../components/AnimatedPage";

import "./HistoryPage.css";

function groupByDate(items) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

  const groups = [];
  const buckets = { today: [], yesterday: [], week: [], older: [] };

  items.forEach(item => {
    const d = new Date(item.timestamp);
    if (d >= today) buckets.today.push(item);
    else if (d >= yesterday) buckets.yesterday.push(item);
    else if (d >= weekAgo) buckets.week.push(item);
    else buckets.older.push(item);
  });

  if (buckets.today.length) groups.push({ label: "Today", items: buckets.today });
  if (buckets.yesterday.length) groups.push({ label: "Yesterday", items: buckets.yesterday });
  if (buckets.week.length) groups.push({ label: "This Week", items: buckets.week });
  if (buckets.older.length) groups.push({ label: "Earlier", items: buckets.older });

  return groups;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    setHistory(stored);
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("watchHistory");
    setHistory([]);
  };

  const removeItem = (timestamp) => {
    const updated = history.filter(h => h.timestamp !== timestamp);
    localStorage.setItem("watchHistory", JSON.stringify(updated));
    setHistory(updated);
  };

  const groups = useMemo(() => groupByDate(history), [history]);

  const lastWatched = history[0] || null;

  const stats = useMemo(() => {
    const uniqueAnime = new Set(history.map(h => h.animeId)).size;
    const totalEps = history.length;
    const hours = Math.round(totalEps * 24 / 60);
    return { uniqueAnime, totalEps, hours };
  }, [history]);

  return (
    <AnimatedPage>
      <div className="hp">
        <Background />
        <div className="hp-bg-ornament" />

        <main className="hp-shell">
          <motion.section className="hp-hero" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="hp-hero-bg">
              {(lastWatched?.img || lastWatched?.animeImg) && <img src={lastWatched.img || lastWatched.animeImg} alt="" />}
            </div>
            <div className="hp-hero-gradient" />
            <div className="hp-hero-content">
              <span className="hp-eyebrow"><Sparkles size={14} /> YOUR ACTIVITY</span>
              <h1>
                <span className="hp-hero-main">WATCH</span>
                <span className="hp-hero-accent">HISTORY</span>
              </h1>
              <p className="hp-hero-desc">
                Pick up right where you left off. Your recently watched anime, organized and ready to continue.
              </p>
              <div className="hp-hero-metrics">
                <div className="hp-metric"><strong>{stats.uniqueAnime}</strong><span>Anime</span></div>
                <div className="hp-metric"><strong>{stats.totalEps}</strong><span>Episodes</span></div>
                <div className="hp-metric"><strong>{stats.hours}h</strong><span>Watched</span></div>
              </div>
            </div>
            {lastWatched && (
              <div className="hp-hero-hud" onClick={() => navigate(`/anime/${lastWatched.animeId}/info?ep=${lastWatched.episode || 1}`)}>
                <div className="hp-hud-img">
                  <img src={lastWatched.img || lastWatched.animeImg || ""} alt="" />
                </div>
                <div className="hp-hud-info">
                  <span className="hp-hud-label">LAST WATCHED</span>
                  <span className="hp-hud-title">{lastWatched.name || lastWatched.animeName || "Unknown"}</span>
                  <span className="hp-hud-ep"><Play size={10} /> Episode {lastWatched.episode || 1}</span>
                </div>
              </div>
            )}
            {history.length > 0 && !lastWatched && (
              <div className="hp-hero-actions">
                <button className="hp-clear-btn" onClick={clearHistory}>
                  <Trash2 size={14} /> Clear All
                </button>
              </div>
            )}
          </motion.section>

          {history.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <button className="hp-clear-btn" onClick={clearHistory}>
                <Trash2 size={14} /> Clear History
              </button>
            </div>
          )}

          {groups.length > 0 ? (
            groups.map(group => (
              <div className="hp-group" key={group.label}>
                <div className="hp-group-header">
                  <span className="hp-group-label">{group.label}</span>
                  <span className="hp-group-count">{group.items.length}</span>
                  <div className="hp-group-line" />
                </div>
                <div className="hp-grid">
                  <AnimatePresence mode="popLayout">
                    {group.items.map((item, i) => {
                      const date = new Date(item.timestamp).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      });
                      const totalEps = item.totalEpisodes || 12;
                      const progress = Math.min((item.episode || 1) / totalEps * 100, 100);

                      return (
                        <motion.div
                          className="hp-card"
                          key={item.timestamp}
                          layout
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: (i % 12) * 0.03, type: "spring", stiffness: 120, damping: 16 }}
                          onClick={() => navigate(`/anime/${item.animeId}/info?ep=${item.episode || 1}`)}
                        >
                          <div className="hp-card-thumb">
                            <img src={item.img || item.animeImg || ""} alt="" loading="lazy" />
                            <div className="hp-card-play">
                              <div className="hp-card-play-icon"><Play size={14} fill="currentColor" /></div>
                            </div>
                            {progress > 0 && (
                              <div className="hp-card-progress-bar" style={{ width: `${progress}%` }} />
                            )}
                          </div>
                          <div className="hp-card-body">
                            <div>
                              <h3 className="hp-card-title">{item.name || item.animeName || "Unknown"}</h3>
                              <div className="hp-card-ep">
                                <Film size={11} /> Episode {item.episode || 1}
                              </div>
                            </div>
                            <div className="hp-card-meta">
                              <span className="hp-card-date"><Clock size={11} /> {date}</span>
                              {progress > 0 && (
                                <div className="hp-card-progress">
                                  <div className="hp-card-progress-track">
                                    <div className="hp-card-progress-fill" style={{ width: `${progress}%` }} />
                                  </div>
                                  <span className="hp-card-progress-label">{Math.round(progress)}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button className="hp-card-remove" onClick={e => { e.stopPropagation(); removeItem(item.timestamp); }}>
                            <X size={14} />
                          </button>
                          <div className="hp-card-glow" />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))
          ) : (
            <motion.div
              className="hp-empty"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <div className="hp-empty-icon">
                <Clock size={32} />
              </div>
              <h3>No Watch History</h3>
              <p>Start watching anime to build your history. Your progress is saved automatically.</p>
              <button className="hp-browse-btn" onClick={() => navigate("/home")}>
                <Compass size={16} /> Discover Anime
              </button>
            </motion.div>
          )}
        </main>
      </div>
    </AnimatedPage>
  );
}
