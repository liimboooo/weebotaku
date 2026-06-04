import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Trash2, Play, X, Compass, Timer,
  Film, History, ChevronRight, Search, TrendingUp
} from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import {
  loadWatchHistory,
  clearWatchHistory as clearStorageHistory,
  removeFromWatchHistory
} from "../services/storage";
import authService from "../services/authService";
import usePrefetchAnime from "../hooks/usePrefetchAnime";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./HistoryPage.css";

/* ─── Helpers ─── */
function groupByDate(items) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo   = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const buckets   = { today: [], yesterday: [], week: [], older: [] };
  items.forEach(item => {
    const d = new Date(item.timestamp);
    if      (d >= today)     buckets.today.push(item);
    else if (d >= yesterday) buckets.yesterday.push(item);
    else if (d >= weekAgo)   buckets.week.push(item);
    else                     buckets.older.push(item);
  });
  return [
    buckets.today.length     && { label: "Today",     items: buckets.today },
    buckets.yesterday.length && { label: "Yesterday", items: buckets.yesterday },
    buckets.week.length      && { label: "This Week", items: buckets.week },
    buckets.older.length     && { label: "Earlier",   items: buckets.older },
  ].filter(Boolean);
}

function fmtTime(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = Math.floor(totalSecs % 60);
  if (h > 0)  return `${h}h ${m}m ${s}s`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Animation Variants ─── */
const rowVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { type: "spring", stiffness: 140, damping: 18, delay: i * 0.03 },
  }),
  exit: { opacity: 0, x: 20, transition: { duration: 0.18 } },
};

/* ═══════════════════════════════════════════════════════════ */
export default function HistoryPage() {
  useDocumentTitle("Watch History");
  const navigate = useNavigate();
  const prefetch  = usePrefetchAnime();
  const [history, setHistory]       = useState([]);
  const [search,  setSearch]        = useState("");
  const [confirmClear, setConfirm]  = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    setHistory(loadWatchHistory());
    const sync = () => setHistory(loadWatchHistory());
    window.addEventListener("storage",         sync);
    window.addEventListener("history-updated", sync);
    return () => {
      window.removeEventListener("storage",         sync);
      window.removeEventListener("history-updated", sync);
    };
  }, []);

  const clearAll  = () => { clearStorageHistory(); setHistory([]); setConfirm(false); };
  const removeOne = (ts) => setHistory(removeFromWatchHistory(ts));

  /* filtered list */
  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(h =>
      (h.animeName || h.name || "").toLowerCase().includes(q)
    );
  }, [history, search]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  /* last watched for hero */
  const last = history[0] || null;

  /* stats */
  const stats = useMemo(() => {
    const animeSet  = new Set(history.map(h => h.animeId));
    const totalSecs = history.reduce((acc, h) => {
      const eps = Math.max(0, (h.episode || 1) - 1);
      return acc + eps * 24 * 60 + Math.floor(h.position || 0);
    }, 0);
    return {
      anime:     animeSet.size,
      episodes:  history.length,
      watchTime: fmtTime(totalSecs),
    };
  }, [history]);

  /* ─── Render ─── */
  return (
    <AnimatedPage>
      <div className="hp">

        {/* ── HERO BANNER ── */}
        <section className="hp-banner">
          {last?.animeImg || last?.img
            ? <img className="hp-banner-bg" src={last.animeImg || last.img} alt="" />
            : null}
          <div className="hp-banner-mask" />

          <div className="hp-banner-body">
            {/* Left: text */}
            <div className="hp-banner-left">
              <span className="hp-eyebrow">
                <History size={12} strokeWidth={2.5} /> WATCH HISTORY
              </span>
              <h1 className="hp-banner-title">
                Your Viewing<br />
                <span className="hp-banner-dim">Timeline</span>
              </h1>
              <p className="hp-banner-sub">
                Every anime you've ever watched, right where you left off.
              </p>
            </div>

            {/* Right: stat pills */}
            <div className="hp-stats-row">
              <div className="hp-stat-pill">
                <span className="hp-stat-val">{stats.anime}</span>
                <span className="hp-stat-lbl">Anime</span>
              </div>
              <div className="hp-stat-divider" />
              <div className="hp-stat-pill">
                <span className="hp-stat-val">{stats.episodes}</span>
                <span className="hp-stat-lbl">Episodes</span>
              </div>
              <div className="hp-stat-divider" />
              <div className="hp-stat-pill">
                <span className="hp-stat-val">{stats.watchTime}</span>
                <span className="hp-stat-lbl">Watched</span>
              </div>
            </div>
          </div>

          {/* Continue HUD */}
          {last && (
            <button
              className="hp-continue-hud"
              onClick={() => navigate(`/anime/${last.animeId}?ep=${last.episode || 1}`)}
            >
              <div className="hp-continue-poster">
                <img src={last.animeImg || last.img || ""} alt="" />
                <div className="hp-continue-play"><Play size={12} fill="currentColor" /></div>
              </div>
              <div className="hp-continue-info">
                <span className="hp-continue-lbl">Continue Watching</span>
                <span className="hp-continue-name">{last.animeName || last.name || "Unknown"}</span>
                <span className="hp-continue-ep">Episode {last.episode || 1}</span>
              </div>
              <ChevronRight size={16} className="hp-continue-arrow" />
            </button>
          )}
        </section>

        {/* ── SHELL ── */}
        <div className="hp-shell">

          {/* Sign-in nudge */}
          {!authService.isLoggedIn() && history.length > 0 && (
            <div className="hp-nudge">
              <span>History is saved locally. Sign in to sync across devices.</span>
              <button
                className="hp-nudge-btn"
                onClick={() => navigate("/auth?next=/history")}
              >
                Sign In
              </button>
            </div>
          )}

          {/* Toolbar */}
          {history.length > 0 && (
            <div className="hp-toolbar">
              {/* Search */}
              <div className="hp-search" onClick={() => searchRef.current?.focus()}>
                <Search size={15} className="hp-search-icon" />
                <input
                  ref={searchRef}
                  className="hp-search-input"
                  type="text"
                  placeholder="Search history…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <AnimatePresence>
                  {search && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{   opacity: 0, scale: 0.7 }}
                      className="hp-search-clear"
                      onClick={() => setSearch("")}
                    >
                      <X size={13} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Count + clear */}
              <div className="hp-toolbar-right">
                <span className="hp-count">
                  <TrendingUp size={13} /> {filtered.length} entries
                </span>

                <AnimatePresence mode="wait">
                  {confirmClear ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="hp-confirm-row"
                    >
                      <span className="hp-confirm-txt">Clear all history?</span>
                      <button className="hp-btn hp-btn-danger" onClick={clearAll}>Yes, clear</button>
                      <button className="hp-btn" onClick={() => setConfirm(false)}>Cancel</button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="clear"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hp-btn hp-btn-ghost"
                      onClick={() => setConfirm(true)}
                    >
                      <Trash2 size={14} /> Clear
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Groups */}
          {groups.length > 0 ? (
            <div className="hp-groups">
              {groups.map(group => (
                <div key={group.label} className="hp-group">
                  {/* Group heading */}
                  <div className="hp-group-head">
                    <span className="hp-group-label">{group.label}</span>
                    <span className="hp-group-pill">{group.items.length}</span>
                    <div className="hp-group-rule" />
                  </div>

                  {/* Row list */}
                  <ul className="hp-list">
                    <AnimatePresence>
                      {group.items.map((item, idx) => {
                        const secs     = Math.max(0, (item.episode || 1) - 1) * 24 * 60 + Math.floor(item.position || 0);
                        const totalEps = item.totalEpisodes || 0;
                        const pct      = totalEps > 0 ? Math.min((item.episode || 1) / totalEps * 100, 100) : 0;
                        const title    = item.animeName || item.name || "Unknown";
                        const thumb    = item.animeImg  || item.img  || "";

                        return (
                          <motion.li
                            key={item.timestamp}
                            className="hp-row"
                            custom={idx}
                            variants={rowVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            layout
                            onClick={() => navigate(`/anime/${item.animeId}?ep=${item.episode || 1}`)}
                            onMouseEnter={() => prefetch.onMouseEnter(item.animeId)}
                            onMouseLeave={prefetch.onMouseLeave}
                          >
                            {/* Poster */}
                            <div className="hp-row-poster">
                              <img src={thumb} alt={title} loading="lazy" />
                              <div className="hp-row-play">
                                <Play size={16} fill="currentColor" />
                              </div>
                              {pct > 0 && (
                                <div
                                  className="hp-row-pbar"
                                  style={{ width: `${pct}%` }}
                                />
                              )}
                            </div>

                            {/* Info */}
                            <div className="hp-row-info">
                              <span className="hp-row-title">{title}</span>
                              <div className="hp-row-meta">
                                <span className="hp-row-ep">
                                  <Film size={10} />
                                  Ep {item.episode || 1}
                                  {totalEps > 0 && <span className="hp-row-ep-total"> / {totalEps}</span>}
                                </span>
                                {secs > 0 && (
                                  <span className="hp-row-watched">
                                    <Timer size={10} /> {fmtTime(secs)}
                                  </span>
                                )}
                              </div>

                              {/* Progress bar */}
                              {pct > 0 && (
                                <div className="hp-row-track">
                                  <div className="hp-row-fill" style={{ width: `${pct}%` }} />
                                </div>
                              )}
                            </div>

                            {/* Right: time ago + remove */}
                            <div className="hp-row-right">
                              <span className="hp-row-ago">
                                <Clock size={10} />
                                {fmtAgo(item.timestamp)}
                              </span>
                              <button
                                className="hp-row-remove"
                                title={`Remove ${title}`}
                                onClick={e => { e.stopPropagation(); removeOne(item.timestamp); }}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <motion.div
              className="hp-empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="hp-empty-icon">
                <History size={36} />
                <div className="hp-empty-ring" />
              </div>
              <h3>{search ? `No results for "${search}"` : "No Watch History Yet"}</h3>
              <p>
                {search
                  ? "Try a different keyword."
                  : "Start watching anime to build your history. Every second is tracked automatically."}
              </p>
              {!search && (
                <button className="hp-cta" onClick={() => navigate("/home")}>
                  <Compass size={16} /> Discover Anime
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
