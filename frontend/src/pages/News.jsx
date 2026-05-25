import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Play, Tv, Newspaper, X, BarChart3 } from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Background from "../components/Background";
import Loader from "../components/Loader";
import { fetchAggregatedNews, formatTimestamp } from "../services/newsAggregator";
import "./News.css";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

export default function News() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedFilter, setFeedFilter] = useState("all");
  const [feedSort, setFeedSort] = useState("latest");
  const [visibleCount, setVisibleCount] = useState(8);
  const [feedSearch, setFeedSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [trailerModal, setTrailerModal] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTimerRef = useRef(null);
  const debouncedSearch = useDebounce(feedSearch, 300);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAggregatedNews()
      .then(res => { if (mounted) setData(res); })
      .catch(err => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (sortedFeed.length < 2) return;
    heroTimerRef.current = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(sortedFeed.length, 5));
    }, 6000);
    return () => clearInterval(heroTimerRef.current);
  }, [sortedFeed.length]);

  const filteredFeed = (data?.allNews || []).filter(item => {
    if (feedFilter !== "all" && item.type !== feedFilter && item.source !== feedFilter) return false;
    const q = debouncedSearch.toLowerCase().trim();
    if (q && !item.title?.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q)) return false;
    return true;
  });
  const sortedFeed = [...filteredFeed].sort((a, b) => {
    if (feedSort === "popular") return (b.score || b.trending || 0) - (a.score || a.trending || 0);
    return new Date(b.date) - new Date(a.date);
  });
  const heroItems = sortedFeed.slice(0, 5);
  const gridItems = sortedFeed.slice(4, 4 + visibleCount);

  const handleItemClick = useCallback((item) => {
    if (item.embedUrl) setTrailerModal(item);
    else if (item.animeId) navigate(`/anime/${item.animeId}/info`);
  }, [navigate]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setVisibleCount(8);
    setHeroIndex(0);
    fetchAggregatedNews()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const SIDEBAR_SECTIONS = [
    { id: "airing", icon: Tv, label: "Airing", items: data?.airing?.slice(0, 5) || [] },
    { id: "trending-side", icon: TrendingUp, label: "Trending", items: data?.trending?.slice(0, 5) || [] },
    { id: "popular-side", icon: BarChart3, label: "Popular", items: data?.popular?.slice(0, 5) || [] },
  ];

  return (
    <>
      <AnimatedPage>
        <div className="news-page">
          <Background />
          <div className="news-container">
          <div className="news-header">
            <div>
              <h1 className="news-title">Anime News Hub</h1>
              <p className="news-subtitle">Trending episodes, trailers, community discussions & industry news</p>
            </div>
            <div className="news-header-actions">
              <button className={`news-sidebar-toggle ${sidebarOpen ? "active" : ""}`} onClick={() => setSidebarOpen(s => !s)}>
                <BarChart3 size={16} />
                <span>Sidebar</span>
              </button>
              <button className="news-refresh" onClick={refresh} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {error && (
            <div className="news-error">
              <span>{error}</span>
              <button className="news-retry-btn" onClick={refresh}>Retry</button>
            </div>
          )}

          {!loading && !error && sortedFeed.length > 0 && (
            <section className="news-magazine">
              <div className="magazine-grid">
                <div className="magazine-main">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroItems[heroIndex]?.id || heroIndex}
                      className="magazine-main-card"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      onClick={() => handleItemClick(heroItems[heroIndex])}
                    >
                      <div
                        className="magazine-main-bg"
                        style={{ backgroundImage: `url(${heroItems[heroIndex]?.bannerImage || heroItems[heroIndex]?.coverImage?.extraLarge || heroItems[heroIndex]?.image || ""})` }}
                      />
                      <div className="magazine-main-gradient" />
                      <div className="magazine-main-content">
                        <div className="magazine-main-meta">
                          <span className="magazine-main-date">
                            {heroItems[heroIndex]?.date ? new Date(heroItems[heroIndex].date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                          </span>
                          <span className="magazine-main-category">
                            {heroItems[heroIndex]?.type === "trailer" ? "Trailer" : heroItems[heroIndex]?.type === "new_episode" ? "New Episode" : "Trending"}
                          </span>
                        </div>
                        <h2 className="magazine-main-title">{heroItems[heroIndex]?.title || heroItems[heroIndex]?.name || ""}</h2>
                        <p className="magazine-main-desc">{heroItems[heroIndex]?.description || heroItems[heroIndex]?.synopsis || ""}</p>
                        <div className="magazine-main-actions">
                          {heroItems[heroIndex]?.embedUrl && (
                            <button className="magazine-action-btn magazine-action-play" onClick={e => { e.stopPropagation(); setTrailerModal(heroItems[heroIndex]); }}>
                              <Play size={16} /> Watch Trailer
                            </button>
                          )}
                          {heroItems[heroIndex]?.animeId && (
                            <button className="magazine-action-btn magazine-action-info" onClick={e => { e.stopPropagation(); navigate(`/anime/${heroItems[heroIndex].animeId}/info`); }}>
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  {heroItems.length > 1 && (
                    <div className="magazine-dots">
                      {heroItems.map((_, i) => (
                        <button key={i} className={`magazine-dot ${i === heroIndex ? "active" : ""}`} onClick={() => setHeroIndex(i)} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="magazine-stack">
                  {sortedFeed.filter(item => item.id !== heroItems[heroIndex]?.id).slice(0, 3).map(item => (
                    <div key={item.id} className="magazine-stack-item" onClick={() => handleItemClick(item)}>
                      <div className="magazine-stack-text">
                        <span className="magazine-stack-tag">
                          {item.type === "trailer" ? "Trailer" : item.type === "new_episode" ? "Episode" : "News"}
                        </span>
                        <h4 className="magazine-stack-title">{item.title || item.name || ""}</h4>
                      </div>
                      <div className="magazine-stack-img">
                        <img src={item.image || item.coverImage?.large || ""} alt="" loading="lazy" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {!loading && data?.rails?.length > 0 && (
            <section className="news-rails">
              {data.rails.map(rail => (
                <div key={rail.id} className="news-rail">
                  <div className="news-rail-header">
                    <span className="news-rail-icon">{rail.icon}</span>
                    <h3 className="news-rail-title">{rail.label}</h3>
                  </div>
                  <div className="news-rail-scroll">
                    {rail.items.map(item => (
                      <motion.div
                        key={item.id}
                        className="news-rail-card"
                        whileHover={{ y: -6 }}
                        onClick={() => {
                          if (item.kind === "trailer" || item.source === "youtube") setTrailerModal(item);
                          else if (item.id?.startsWith("rss-") && item.url) window.open(item.url, "_blank");
                          else if (item.kind === "anime" || item.animeId) navigate(`/anime/${item.animeId || item.id}/info`);
                        }}
                      >
                        <div className="news-rail-card-img">
                          <img src={item.image || item.coverImage?.large || ""} alt={item.title || item.name || ""} loading="lazy" />
                          <div className="rail-card-img-gradient" />
                          {item.kind === "trailer" && (
                            <div className="news-rail-play">
                              <div className="news-rail-play-ring"><Play size={18} /></div>
                            </div>
                          )}
                          <div className="rail-card-img-badge">
                            {item.kind === "trailer" ? "TRAILER" : item.kind === "new_episode" ? "EPISODE" : "NEW"}
                          </div>
                          {item.score && (
                            <div className="rail-card-score">
                              ★ {item.score}
                            </div>
                          )}
                        </div>
                        <div className="news-rail-card-body">
                          <h4>{item.title || item.name || ""}</h4>
                          {item.genres?.length > 0 && (
                            <div className="rail-card-sub">{item.genres.slice(0, 2).join(" · ")}</div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          <div className="news-main-layout">
            <div className="news-feed-section">
              <div className="news-feed-header">
                <h2 className="news-feed-title">
                  More News
                  <span className="news-feed-count">{Math.max(0, sortedFeed.length - 4)}</span>
                </h2>
                <div className="news-feed-controls">
                  <div className="news-feed-tabs">
                    {[{ key: "all", label: "All" }, { key: "new_episode", label: "Episodes" }, { key: "trailer", label: "Trailers" }].map(tab => (
                      <button
                        key={tab.key}
                        className={`feed-tab ${feedFilter === tab.key ? "active" : ""}`}
                        onClick={() => { setFeedFilter(tab.key); setVisibleCount(8); setHeroIndex(0); }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="news-feed-sort">
                    <button className={`feed-sort-btn ${feedSort === "latest" ? "active" : ""}`} onClick={() => { setFeedSort("latest"); setHeroIndex(0); }}>Latest</button>
                    <button className={`feed-sort-btn ${feedSort === "popular" ? "active" : ""}`} onClick={() => { setFeedSort("popular"); setHeroIndex(0); }}>Popular</button>
                  </div>
                  <input
                    className="news-feed-search"
                    type="text"
                    placeholder="Search feed..."
                    value={feedSearch}
                    onChange={e => { setFeedSearch(e.target.value); setVisibleCount(8); setHeroIndex(0); }}
                  />
                </div>
              </div>

              {loading ? (
                <div className="news-feed-loading"><Loader text="Loading news feed..." /></div>
              ) : gridItems.length === 0 && sortedFeed.length <= 4 ? (
                <div className="news-feed-empty">
                  <Newspaper size={40} />
                  <p>No news found</p>
                </div>
              ) : (
                <>
                  <div className="news-grid">
                    {gridItems.map((item, i) => (
                      <motion.div
                        key={item.id}
                        className="news-grid-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.35), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="news-grid-thumb">
                          <img src={item.image || item.coverImage?.large || ""} alt="" loading="lazy" />
                          <div className="news-grid-thumb-gradient" />
                          {item.embedUrl && (
                            <div className="news-grid-play">
                              <div className="news-grid-play-ring"><Play size={16} /></div>
                            </div>
                          )}
                          <div className="news-grid-badge">
                            {item.type === "trailer" ? "Trailer" : item.type === "new_episode" ? "Episode" : "News"}
                          </div>
                          {item.score && <div className="news-grid-score">★ {item.score}</div>}
                        </div>
                        <div className="news-grid-body">
                          <div className="news-grid-meta">
                            <span className="news-grid-source">{item.sourceLabel || "AniList"}</span>
                            <span className="news-grid-dot">·</span>
                            <span className="news-grid-time">{formatTimestamp(item.date)}</span>
                          </div>
                          <h3 className="news-grid-title">{item.title || item.name || ""}</h3>
                          <p className="news-grid-excerpt">{item.description || item.synopsis || ""}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {4 + visibleCount < sortedFeed.length && (
                    <div className="news-load-more-wrap">
                      <button className="news-load-more" onClick={() => setVisibleCount(p => p + 8)}>
                        Load More ({sortedFeed.length - 4 - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <aside className={`news-sidebar ${sidebarOpen ? "open" : ""}`}>
              <div className="news-sidebar-inner">
                <div className="news-sidebar-top">
                  <h3 className="news-sidebar-title">Discover</h3>
                  <button className="news-sidebar-close" onClick={() => setSidebarOpen(false)}><X size={14} /></button>
                </div>
                <div className="news-sidebar-sections">
                  {SIDEBAR_SECTIONS.filter(s => s.items.length > 0).map(section => (
                    <div key={section.id} className="sidebar-group">
                      <div className="sidebar-group-header">
                        <section.icon size={12} />
                        <span>{section.label}</span>
                      </div>
                      <div className="sidebar-group-list">
                        {section.items.map(item => (
                          <div key={item.id} className="sidebar-entry" onClick={() => navigate(`/anime/${item.id}/info`)}>
                            <div className="sidebar-entry-img">
                              <img src={item.image || item.coverImage?.large || ""} alt="" loading="lazy" />
                              {item.score && <span className="sidebar-entry-img-badge">{item.score}</span>}
                            </div>
                            <div className="sidebar-entry-info">
                              <span className="sidebar-entry-title">{item.title || item.name || ""}</span>
                              <span className="sidebar-entry-sub">
                                {item.genres?.[0] && <>{item.genres[0]}</>}
                                {item.trending && <> · #{item.trending}</>}
                                {item.nextEpisode?.ep && <> · Ep {item.nextEpisode.ep}</>}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      </AnimatedPage>

      {trailerModal && createPortal(
        <motion.div
          className="news-trailer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setTrailerModal(null)}
        >
          <motion.div
            className="news-trailer-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="news-trailer-close" onClick={() => setTrailerModal(null)}><X size={20} /></button>
            <iframe
              src={trailerModal.embedUrl}
              title={trailerModal.title}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </motion.div>
        </motion.div>,
        document.body
      )}
    </>
  );
}

function Star(props) {
  return (
    <svg width={props.size || 14} height={props.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={props.fill || "#ffd700"} stroke="#ffd700" />
    </svg>
  );
}
