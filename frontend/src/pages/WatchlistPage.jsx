import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthModal } from "../contexts/AuthModalContext";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Play, X, SlidersHorizontal, Layers, Bookmark, CheckCircle2, CircleDashed, Clock, MonitorPlay, XCircle, Check, Pause, Tv, Star, Pen, Trash2 } from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import { loadWatchlist, removeFromWatchlist, loadWatchHistory, updateListStatus } from "../services/storage";
import authService from "../services/authService";
import usePrefetchAnime from "../hooks/usePrefetchAnime";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./WatchlistPage.css";

const statusConfig = [
  { id: "All", label: "All", icon: Layers },
  { id: "Watching", label: "Watching", icon: MonitorPlay },
  { id: "Planning", label: "Planning", icon: CircleDashed },
  { id: "Completed", label: "Completed", icon: CheckCircle2 },
  { id: "Paused", label: "Paused", icon: Clock },
  { id: "Dropped", label: "Dropped", icon: XCircle }
];

const listStatusOptions = [
  { id: "Watching", label: "Watching", icon: Play, color: "#22c55e" },
  { id: "Planning", label: "Planning", icon: Clock, color: "#f97316" },
  { id: "Completed", label: "Completed", icon: Check, color: "#a1a1aa" },
  { id: "Paused", label: "Paused", icon: Pause, color: "#a855f7" },
  { id: "Dropped", label: "Dropped", icon: X, color: "#ef4444" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 15 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

export default function WatchlistPage() {
  useDocumentTitle("My Library");
  const navigate = useNavigate();
  const { openAuth } = useAuthModal();
  const prefetch = usePrefetchAnime();
  const [animeList, setAnimeList] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  const refresh = () => setAnimeList(loadWatchlist());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener("watchlist-updated", handler);
    const scrollHandler = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", scrollHandler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("watchlist-updated", handler);
      window.removeEventListener("scroll", scrollHandler);
    };
  }, []);

  const removeAnime = (id) => setAnimeList(removeFromWatchlist(id));

const [openMenuCard, setOpenMenuCard] = useState(null);

const handleStatusChange = useCallback((animeId, newStatus) => {
  updateListStatus(animeId, newStatus);
  setAnimeList(prev => prev.map(item => 
    String(item.id) === String(animeId) ? { ...item, listStatus: newStatus } : item
  ));
  setOpenMenuCard(null);
}, []);

const handleMenuOpen = (animeId, e) => {
  e.stopPropagation();
  setOpenMenuCard(prev => prev === animeId ? null : animeId);
};

const handleMenuClose = (e) => {
  e.stopPropagation();
  setOpenMenuCard(null);
};

const handleCardClick = (animeId, e) => {
  if (e.target.closest('.wl-wish-btn') || e.target.closest('.wl-add-btn') || e.target.closest('.wl-menu-overlay') || e.target.closest('.wl-menu-close') || e.target.closest('.wl-menu-option')) {
    return;
  }
  if (openMenuCard === animeId) {
    setOpenMenuCard(null);
    return;
  }
  navigate(`/anime/${animeId}/info`);
};

  const progressMap = useMemo(() => {
    const history = loadWatchHistory();
    const map = {};
    history.forEach(h => { 
      if (h.animeId) map[String(h.animeId)] = h;
      if (h.animeName) map[h.animeName.toLowerCase()] = h;
    });
    return map;
  }, []);

  const filteredAnime = useMemo(() => {
    let list = animeList;
    if (statusFilter !== "All") list = list.filter(a => (a.listStatus || "Planning") === statusFilter);
    if (search) { const q = search.toLowerCase(); list = list.filter(a => (a.name || '').toLowerCase().includes(q)); }
    const sorted = [...list];
    if (sortBy === "title") sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sortBy === "rating") sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === "progress") sorted.sort((a, b) => ((progressMap[String(b.id)]?.episode || progressMap[(b.name || '').toLowerCase()]?.episode) || 0) - ((progressMap[String(a.id)]?.episode || progressMap[(a.name || '').toLowerCase()]?.episode) || 0));
    return sorted;
  }, [animeList, search, statusFilter, sortBy, progressMap]);

  const watchStats = useMemo(() => {
    let totalSecs = 0;
    let totalEps = 0;

    animeList.forEach(a => {
      const h = progressMap[String(a.id)] || progressMap[(a.name || '').toLowerCase()];
      if (h) {
        totalEps += h.episode;
        const completedEps = Math.max(0, h.episode - 1);
        totalSecs += (completedEps * 24 * 60) + (Math.floor(h.position) || 0);
      }
    });

    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = Math.floor(totalSecs % 60);

    let timeString = '';
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0 || hours > 0) timeString += `${minutes}m `;
    timeString += `${seconds}s watched`;

    return { totalEps, timeString };
  }, [animeList, progressMap]);

  return (
    <AnimatedPage>
      <div className="watchlist-layout">
        {/* Premium Animated Background */}
        <div className="wl-ambient-bg">
          <div className="wl-ambient-orb orb-1"></div>
          <div className="wl-ambient-orb orb-2"></div>
        </div>

        <main className="wl-container">
          {/* Header Section */}
          <header className={`wl-header ${isScrolled ? 'scrolled' : ''}`}>
            <div className="wl-header-content">
              <div className="wl-title-area">
                <h1 className="wl-title">My Library</h1>
                <p className="wl-subtitle">Your curated collection of {animeList.length} anime series</p>
                {animeList.length > 0 && (
                  <div className="wl-hero-stats">
                    <span>{watchStats.timeString}</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>•</span>
                    <span>{watchStats.totalEps} episodes</span>
                  </div>
                )}
              </div>

              {!authService.isLoggedIn() && (
                <div className="wl-auth-prompt" onClick={() => openAuth('login', '/watchlist')}>
                  <div className="wl-auth-icon">✨</div>
                  <div className="wl-auth-text">
                    <strong>Sync your library</strong>
                    <span>Sign in to save across devices</span>
                  </div>
                </div>
              )}
            </div>

            {/* Premium Controls */}
            <div className="wl-controls-bar glass-panel">
              <div className="wl-status-tabs">
                {statusConfig.map(status => {
                  const Icon = status.icon;
                  const count = animeList.filter(a => status.id === "All" || (status.id === "Planning" ? (!a.listStatus || a.listStatus === status.id) : a.listStatus === status.id)).length;
                  
                  return (
                    <button
                      key={status.id}
                      className={`wl-tab-btn ${statusFilter === status.id ? 'active' : ''}`}
                      onClick={() => setStatusFilter(status.id)}
                    >
                      <Icon size={14} className="wl-tab-icon" />
                      <span>{status.label}</span>
                      <span className="wl-tab-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="wl-tools">
                <div className="wl-searchbox">
                  <Search size={16} className="wl-search-icon" />
                  <input
                    type="text"
                    placeholder="Search library..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="wl-clear-btn" onClick={() => setSearch('')}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <div className="wl-sort-dropdown">
                  <SlidersHorizontal size={16} className="wl-sort-icon" />
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="recent">Recently Added</option>
                    <option value="title">Title A–Z</option>
                    <option value="rating">Highest Rated</option>
                    <option value="progress">Most Progress</option>
                  </select>
                </div>
              </div>
            </div>
          </header>

          {/* Grid Section */}
          <section className="wl-content">
            {filteredAnime.length > 0 ? (
              <motion.div 
                className="wl-anime-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Note: Removed mode="popLayout" as it breaks CSS Grid completely and causes cards to vanish */}
                <AnimatePresence>
{filteredAnime.map((anime) => {
                    const h = progressMap[String(anime.id)] || progressMap[(anime.name || '').toLowerCase()];
                    const totalEps = anime.episodes || 24;
                    const statusStr = (anime.status || '').toLowerCase();
                    const isUpcoming = statusStr.includes('upcoming') || statusStr.includes('not yet') || statusStr.includes('tba') || statusStr === 'not_yet_released';
                    const currentListStatus = anime.listStatus || 'Planning';
                    const statusOption = listStatusOptions.find(s => s.id === currentListStatus) || listStatusOptions[1];
                    const isMenuOpen = openMenuCard === anime.id;

                    return (
                      <motion.article
                        key={anime.id}
                        layout
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="wl-card"
                        onClick={(e) => handleCardClick(anime.id, e)}
                        onMouseEnter={() => { prefetch.onMouseEnter(anime.id); setHoveredCard(anime.id); }}
                        onMouseLeave={() => { prefetch.onMouseLeave(); setHoveredCard(null); }}
                      >
                        <div className="wl-card-poster">
                          <img src={anime.img} alt={anime.name} loading="lazy" />

                          {/* Dark overlay for play hover */}
                          <div className="wl-card-hover-overlay" />

                          {/* Poster hover: Play button */}
                          <div className="wl-card-play">
                            {isUpcoming ? (
                              <span className="wl-card-upcoming">Upcoming</span>
                            ) : (
                              <div className="wl-card-play-btn">
                                <Play fill="currentColor" size={28} />
                              </div>
                            )}
                          </div>

                          {/* Top-Left: Dynamic Status Text */}
                          <span className="wl-card-status-text" style={{ color: statusOption.color }}>
                            {currentListStatus}
                          </span>

                          {/* Top-Right: Edit (Pencil) Button */}
                          <button
                            className="wl-card-edit"
                            onClick={(e) => { e.stopPropagation(); handleMenuOpen(anime.id, e); }}
                            title="Edit status"
                          >
                            <Pen size={14} strokeWidth={2} />
                          </button>

                          {/* Bottom-Left: Stats Pill */}
                          <div className="wl-card-stats-pill">
                            <div className="wl-stat-item">
                              <Tv size={11} />
                              <span>{totalEps}</span>
                            </div>
                            <span className="wl-stat-divider" />
                            <div className="wl-stat-item">
                              <Play size={11} />
                              <span>{h?.episode || 0}</span>
                            </div>
                            <span className="wl-stat-divider" />
                            <div className="wl-stat-item">
                              <Star size={11} />
                              <span>{anime.rating?.toFixed(1) || '-'}</span>
                            </div>
                          </div>

                          {/* Status Menu Overlay */}
                          {isMenuOpen && (
                            <div className="wl-menu-overlay" onClick={handleMenuClose}>
                              <div className="wl-menu-content" onClick={(e) => e.stopPropagation()}>
                                <div className="wl-menu-header">
                                  <span className="wl-menu-title">ADD TO LIST</span>
                                  <button className="wl-menu-close" onClick={handleMenuClose}>
                                    <X size={16} strokeWidth={2.5} />
                                  </button>
                                </div>
                                <div className="wl-menu-options">
                                  {listStatusOptions.map(opt => (
                                    <button
                                      key={opt.id}
                                      className={`wl-menu-option ${currentListStatus === opt.id ? 'active' : ''}`}
                                      onClick={(e) => { e.stopPropagation(); handleStatusChange(anime.id, opt.id); }}
                                    >
                                      <opt.icon size={16} style={{ color: opt.color }} />
                                      <span>{opt.label}</span>
                                      {currentListStatus === opt.id && (
                                        <Check size={16} style={{ color: opt.color, marginLeft: 'auto' }} />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottom Title Section */}
                        <div className="wl-card-body">
                          <div className="wl-card-title-row">
                            <span className="wl-title-dot" />
                            <h3 className="wl-card-title">{anime.name}</h3>
                            <button
                              className="wl-card-delete"
                              onClick={(e) => { e.stopPropagation(); removeAnime(anime.id); }}
                              title="Remove from library"
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          </div>
                          <div className="wl-card-subtitle">
                            {anime.type || 'TV'} &bull; {totalEps} ep
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div 
                className="wl-empty-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="wl-empty-icon-wrap">
                  <Bookmark size={48} className="wl-empty-icon" />
                  <div className="wl-empty-glow"></div>
                </div>
                <h2>{search ? 'No anime found' : 'Your library is empty'}</h2>
                <p>{search ? `No results match "${search}" in your watchlist.` : 'Start exploring and add some amazing anime to your collection.'}</p>
                {!search && (
                  <button className="wl-cta-btn" onClick={() => navigate('/browse/anime')}>
                    Explore Anime <Search size={16} />
                  </button>
                )}
              </motion.div>
            )}
          </section>
        </main>
      </div>
    </AnimatedPage>
  );
}
