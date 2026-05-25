import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Play, Tv, Newspaper, X, BarChart3, Calendar, ExternalLink, Clock } from "lucide-react";
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
  const [heroIndex, setHeroIndex] = useState(0);
  const [feedFilter, setFeedFilter] = useState("all");
  const [feedSort, setFeedSort] = useState("latest");
  const [visibleCount, setVisibleCount] = useState(20);
  const [feedSearch, setFeedSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trailerModal, setTrailerModal] = useState(null);
  const feedEndRef = useRef(null);
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
    if (!data?.featured?.length) return;
    heroTimerRef.current = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % data.featured.length);
    }, 6000);
    return () => clearInterval(heroTimerRef.current);
  }, [data?.featured?.length]);

  useEffect(() => {
    if (!feedEndRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(c => c + 20);
    }, { rootMargin: "400px" });
    observer.observe(feedEndRef.current);
    return () => observer.disconnect();
  }, []);

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
  const visibleFeed = sortedFeed.slice(0, visibleCount);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setVisibleCount(20);
    fetchAggregatedNews()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const featured = data?.featured || [];
  const hero = featured[heroIndex] || null;

  const SIDEBAR_SECTIONS = [
    { id: "airing", icon: Tv, label: "Airing", items: data?.airing?.slice(0, 5) || [] },
    { id: "trending-side", icon: TrendingUp, label: "Trending", items: data?.trending?.slice(0, 5) || [] },
    { id: "popular-side", icon: BarChart3, label: "Popular", items: data?.popular?.slice(0, 5) || [] },
  ];

  return (
    <AnimatedPage>
      <div className="news-page">
        <Background />

        {trailerModal && (
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
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}

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

          {!loading && !error && featured.length > 0 && (
            <section className="news-hero">
              <AnimatePresence mode="wait">
                <motion.div
                  key={heroIndex}
                  className="news-hero-card"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div
                    className="news-hero-bg"
                    style={{ backgroundImage: `url(${hero.image || hero.coverImage?.large || ""})` }}
                  />
                  <div className="news-hero-gradient" />
                  <div className="news-hero-content">
                    <div className="news-hero-badges">
                      {hero.kind === "trailer" && <span className="hero-badge hero-badge-trailer"><Play size={12} /> Trailer</span>}
                      {hero.kind === "airing" && <span className="hero-badge hero-badge-airing"><Tv size={12} /> Airing</span>}
                      {hero.kind === "anime" && <span className="hero-badge hero-badge-trending"><TrendingUp size={12} /> Trending</span>}
                      {hero.sourceLabel && <span className="hero-badge hero-badge-source">{hero.sourceLabel}</span>}
                    </div>
                    <h2 className="news-hero-title">{hero.title || hero.name || ""}</h2>
                    <p className="news-hero-desc">
                      {hero.description || hero.synopsis || ""}
                    </p>
                    <div className="news-hero-meta">
                      {hero.score && <span><Star size={14} /> {hero.score}</span>}
                      {hero.trending && <span><TrendingUp size={14} /> #{hero.trending}</span>}
                      {hero.date && <span><Clock size={14} /> {formatTimestamp(hero.date)}</span>}
                    </div>
                    <div className="news-hero-actions">
                      {hero.kind === "trailer" && hero.embedUrl && (
                        <button className="hero-action-btn hero-action-play" onClick={() => setTrailerModal(hero)}>
                          <Play size={16} /> Watch Trailer
                        </button>
                      )}
                      {(hero.kind === "anime" || hero.kind === "airing") && (
                        <button className="hero-action-btn hero-action-info" onClick={() => navigate(`/anime/${hero.id}/info`)}>
                          View Details
                        </button>
                      )}
                      {hero.url && (
                        <a href={hero.url} target="_blank" rel="noopener noreferrer" className="hero-action-btn hero-action-link">
                          <ExternalLink size={14} /> Open
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="news-hero-dots">
                {featured.map((_, i) => (
                  <button
                    key={i}
                    className={`hero-dot ${i === heroIndex ? "active" : ""}`}
                    onClick={() => setHeroIndex(i)}
                  />
                ))}
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
                        whileHover={{ y: -4 }}
                        onClick={() => {
                          if (item.kind === "trailer" || item.source === "youtube") setTrailerModal(item);
                          else if (item.id?.startsWith("rss-") && item.url) window.open(item.url, "_blank");
                          else if (item.kind === "anime" || item.animeId) navigate(`/anime/${item.animeId || item.id}/info`);
                        }}
                      >
                        <div className="news-rail-card-img">
                          <img src={item.image || item.coverImage?.large || ""} alt={item.title || item.name || ""} loading="lazy" />
                          {item.kind === "trailer" && <div className="news-rail-play"><Play size={18} /></div>}
                          <div className="rail-card-img-badge">
                            {item.kind === "trailer" ? "TRAILER" : item.score || ""}
                          </div>
                        </div>
                        <div className="news-rail-card-body">
                          <h4>{item.title || item.name || ""}</h4>
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
                  {feedFilter === "all" ? "All News" : feedFilter}
                  <span className="news-feed-count">{sortedFeed.length}</span>
                </h2>
                <div className="news-feed-controls">
                  <div className="news-feed-tabs">
                    {[{ key: "all", label: "All" }, { key: "new_episode", label: "Episodes" }, { key: "trailer", label: "Trailers" }].map(tab => (
                      <button
                        key={tab.key}
                        className={`feed-tab ${feedFilter === tab.key ? "active" : ""}`}
                        onClick={() => { setFeedFilter(tab.key); setVisibleCount(20); }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="news-feed-sort">
                    <button className={`feed-sort-btn ${feedSort === "latest" ? "active" : ""}`} onClick={() => setFeedSort("latest")}>Latest</button>
                    <button className={`feed-sort-btn ${feedSort === "popular" ? "active" : ""}`} onClick={() => setFeedSort("popular")}>Popular</button>
                  </div>
                  <input
                    className="news-feed-search"
                    type="text"
                    placeholder="Search feed..."
                    value={feedSearch}
                    onChange={e => { setFeedSearch(e.target.value); setVisibleCount(20); }}
                  />
                </div>
              </div>

              <div className="news-feed">
                {loading ? (
                  <div className="news-feed-loading"><Loader text="Loading news feed..." /></div>
                ) : visibleFeed.length === 0 ? (
                  <div className="news-feed-empty">
                    <Newspaper size={40} />
                    <p>No news found</p>
                  </div>
                ) : (
                  <>
                    {visibleFeed.map((item, i) => {
                        const cardType = item.source === "youtube" ? "trailer" :
                          item.type === "new_episode" ? "episode" :
                          item.type === "trending" || item.type === "popular" ? "trending" :
                          "article";
                        return (
                          <motion.article
                            key={item.id}
                            className={`feed-card feed-card-${cardType}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.025, 0.35), duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                            onClick={() => {
                              if (item.embedUrl) setTrailerModal(item);
                              else if (item.url?.startsWith("http")) window.open(item.url, "_blank");
                              else if (item.animeId) navigate(`/anime/${item.animeId}/info`);
                            }}
                          >
                            <div className="feed-card-glow" />
                            <div className="feed-card-media">
                              <div className="feed-card-img">
                                <img src={item.image || item.coverImage?.large || ""} alt="" loading="lazy" />
                                <div className="feed-card-img-gradient" />
                                {item.embedUrl && (
                                  <div className="feed-card-play">
                                    <div className="feed-card-play-ring" />
                                    <Play size={22} className="feed-card-play-icon" />
                                  </div>
                                )}
                              </div>
                              <div className="feed-card-badge">
                                {cardType === "trailer" && <><Play size={10} /> Trailer</>}
                                {cardType === "episode" && <><Tv size={10} /> Episode</>}
                                {cardType === "article" && <><Newspaper size={10} /> News</>}
                                {cardType === "trending" && <><TrendingUp size={10} /> Trending</>}
                              </div>
                              {item.score && cardType === "trending" && (
                                <div className="feed-card-score">
                                  <Star size={11} /> {item.score}
                                </div>
                              )}
                            </div>
                            <div className="feed-card-body">
                              <div className="feed-card-meta">
                                <span className="feed-card-source">{item.sourceLabel || "AniList"}</span>
                                <span className="feed-card-dot">·</span>
                                <span className="feed-card-time">{formatTimestamp(item.date)}</span>
                              </div>
                              <h3 className="feed-card-title">{item.title || item.name || ""}</h3>
                              {item.description && cardType !== "trailer" && (
                                <p className="feed-card-desc">{item.description.slice(0, 150)}</p>
                              )}
                              <div className="feed-card-tags">
                                {item.genres?.slice(0, 2).map(g => <span key={g} className="feed-card-tag">{g}</span>)}
                                {item.score && cardType !== "trending" && <span className="feed-card-tag feed-card-tag-score"><Star size={9} /> {item.score}</span>}
                                {item.trending && cardType !== "trending" && <span className="feed-card-tag">#{item.trending}</span>}
                              </div>
                            </div>
                          </motion.article>
                      );
                    })}
                    <div ref={feedEndRef} className="feed-sentinel" />
                  </>
                )}
              </div>
            </div>

            <aside className={`news-sidebar ${sidebarOpen ? "open" : ""}`}>
              <div className="news-sidebar-inner">
                <div className="news-sidebar-top">
                  <h3 className="news-sidebar-title">Discover</h3>
                  <button className="news-sidebar-close" onClick={() => setSidebarOpen(false)}><X size={14} /></button>
                </div>
                <div className="news-sidebar-sections">
                  {SIDEBAR_SECTIONS.map(section => (
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
                            </div>
                            <div className="sidebar-entry-info">
                              <span className="sidebar-entry-title">{item.title || item.name || ""}</span>
                              <span className="sidebar-entry-sub">
                                {item.score && <>Score {item.score}</>}
                                {item.trending && <> · #{item.trending}</>}
                                {item.nextEpisode?.ep && <> · Ep {item.nextEpisode.ep}</>}
                              </span>
                            </div>
                          </div>
                        ))}
                        {section.items.length === 0 && <span className="sidebar-group-empty">—</span>}
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
  );
}

function Star(props) {
  return (
    <svg width={props.size || 14} height={props.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={props.fill || "#ffd700"} stroke="#ffd700" />
    </svg>
  );
}
