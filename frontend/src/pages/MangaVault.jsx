import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Star, BookOpen, Eye, Heart, Sparkles, Zap, Library, List, Grid3x3, Loader2, ChevronDown } from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Background from "../components/Background";
import { fetchTopManga, fetchSearchManga } from "../services/jikanApi";
import "./MangaVault.css";

const DEMOGRAPHICS = ["All", "Shonen", "Seinen", "Shojo", "Josei"];
const STATUSES = ["All", "Ongoing", "Completed", "Hiatus"];
const HERO_VIDEO_ID = "-0Mhu7RSz-c";

export default function MangaVault() {
  const [allManga, setAllManga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [demo, setDemo] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("rating");
  const [view, setView] = useState("grid");
  const [preview, setPreview] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const sentinelRef = useRef(null);
  const searchRef = useRef(search);
  searchRef.current = search;

  const loadManga = useCallback(async (p, replace = false) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const q = searchRef.current.trim();
      const result = q
        ? await fetchSearchManga(q, p)
        : await fetchTopManga(p);
      setAllManga(prev => replace ? result.data : [...prev, ...result.data]);
      setHasMore(result.pagination.has_next_page);
      setPage(p);
    } catch (err) {
      console.error("Failed to load manga:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setAllManga([]);
    setPage(1);
    setHasMore(true);
    loadManga(1, true);
  }, [search, loadManga]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadManga(page + 1);
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadManga, page]);

  const filtered = useMemo(() => {
    return allManga
      .filter(m => {
        if (demo !== "All" && m.demo !== demo) return false;
        if (status !== "All" && m.status !== status) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sort === "chapters") return (b.ch || 0) - (a.ch || 0);
        if (sort === "title") return (a.title || "").localeCompare(b.title || "");
        return 0;
      });
  }, [allManga, demo, status, sort]);

  const topRated = allManga.length > 0
    ? allManga.reduce((best, m) => (m.rating || 0) > (best.rating || 0) ? m : best, allManga[0])
    : null;

  const toggleWishlist = (id) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const totalCh = useMemo(() => allManga.reduce((s, m) => s + (m.ch || 0), 0), [allManga]);
  const allGenres = useMemo(() => {
    const g = new Set();
    allManga.forEach(m => m.genres?.forEach(gen => g.add(gen)));
    return g.size;
  }, [allManga]);

  return (
    <AnimatedPage>
      <div className="mv">
        <Background />
        <Header />
        <div className="mv-bg-ornament" />

        <main className="mv-shell">
          <motion.section className="mv-hero" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mv-hero-bg">
              <iframe
                className="mv-hero-video"
                src={`https://www.youtube.com/embed/${HERO_VIDEO_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${HERO_VIDEO_ID}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0`}
                title="Hero Video"
                allow="autoplay; fullscreen"
                loading="lazy"
              />
            </div>
            <div className="mv-hero-gradient" />
            <div className="mv-hero-texture" />
            <div className="mv-hero-content">
              <span className="mv-eyebrow"><Sparkles size={14} /> MANGA COLLECTION</span>
              <h1>
                <span className="mv-hero-main">EXPLORE</span>
                <span className="mv-hero-accent">MANGA</span>
              </h1>
              <p className="mv-hero-desc">
                Browse thousands of series across every genre. Track your reading, discover hidden gems,
                and build your perfect manga collection.
              </p>
              <div className="mv-hero-metrics">
                <div className="mv-metric"><strong>{allManga.length}</strong><span>Series</span></div>
                <div className="mv-metric"><strong>{totalCh}</strong><span>Chapters</span></div>
                <div className="mv-metric"><strong>{allGenres}</strong><span>Genres</span></div>
              </div>
            </div>
            <div className="mv-hero-hud">
              <span className="mv-hud-label">TOP RATED</span>
              <span className="mv-hud-title">{topRated?.title || "Loading..."}</span>
              <span className="mv-hud-rating"><Star size={12} fill="currentColor" /> {topRated?.rating?.toFixed(1) || "?"}</span>
            </div>
          </motion.section>

          <section className="mv-controls">
            <div className="mv-search-box">
              <Search size={18} className="mv-search-icon" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search manga..." />
            </div>
            <div className="mv-controls-right">
              <div className="mv-pills">
                {DEMOGRAPHICS.map(d => (
                  <button key={d} className={`mv-pill ${demo === d ? "active" : ""}`} onClick={() => setDemo(d)}>{d}</button>
                ))}
                <div className="mv-pill-divider" />
                {STATUSES.map(s => (
                  <button key={s} className={`mv-pill ${status === s ? "active" : ""}`} onClick={() => setStatus(s)}>{s}</button>
                ))}
              </div>
              <div className="mv-utils">
                <select value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="rating">Rating</option>
                  <option value="chapters">Chapters</option>
                  <option value="title">Title</option>
                </select>
                <div className="mv-view-toggle">
                  <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><Grid3x3 size={15} /></button>
                  <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={15} /></button>
                </div>
              </div>
            </div>
          </section>

          <section className="mv-grid-section">
            <div className="mv-grid-header">
              <h2><Library size={18} /> Browse All</h2>
              <span className="mv-count">{filtered.length} series found</span>
            </div>

            {loading ? (
              <div className="mv-empty">
                <Loader2 size={36} className="mv-spin" />
                <h3>Loading manga...</h3>
              </div>
            ) : (
              <div className={`mv-grid ${view === "list" ? "mv-list" : ""}`}>
                <AnimatePresence mode="popLayout">
                  {filtered.map((m, i) => (
                    <motion.article
                      key={m.id}
                      className={view === "grid" ? "mv-card" : "mv-row-card"}
                      layout
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ delay: (i % 12) * 0.025 }}
                    >
                      {view === "grid" ? (
                        <>
                          <div className="mv-card-thumb" onClick={() => setPreview(m)}>
                            <img src={m.cover} alt={m.title} loading="lazy" />
                            <div className="mv-card-overlay">
                              <div className="mv-card-play"><Eye size={20} /></div>
                              <div className="mv-card-tech">
                                <span>Ch. {m.last}</span>
                                <span>{m.demo}</span>
                              </div>
                            </div>
                            <div className="mv-card-badge">
                              {m.status === "Ongoing" ? <Zap size={10} /> : null}
                              {m.status}
                            </div>
                            <div className="mv-card-progress" style={{ width: `${(m.progress || 0) * 100}%` }} />
                          </div>
                          <div className="mv-card-body">
                            <div className="mv-card-head">
                              <div>
                                <h3>{m.title}</h3>
                                <span className="mv-card-author">{m.author}</span>
                              </div>
                              <button className={`mv-wish-btn ${wishlist.includes(m.id) ? "active" : ""}`} onClick={() => toggleWishlist(m.id)}>
                                <Heart size={14} fill={wishlist.includes(m.id) ? "currentColor" : "none"} />
                              </button>
                            </div>
                            <p className="mv-card-desc">{m.desc}</p>
                            <div className="mv-card-foot">
                              <span className="mv-card-rating"><Star size={11} fill="currentColor" /> {m.rating}</span>
                              <span className="mv-card-ch"><BookOpen size={11} /> {m.ch} ch</span>
                              <span className="mv-card-tag">{m.demo}</span>
                            </div>
                          </div>
                          <div className="mv-card-glow" />
                        </>
                      ) : (
                        <>
                          <div className="mv-row-thumb" onClick={() => setPreview(m)}>
                            <img src={m.cover} alt={m.title} loading="lazy" />
                          </div>
                          <div className="mv-row-body" onClick={() => setPreview(m)}>
                            <div className="mv-row-head">
                              <h3>{m.title}</h3>
                              <span className="mv-row-author">{m.author}</span>
                            </div>
                            <p className="mv-row-desc">{m.desc}</p>
                            <div className="mv-row-meta">
                              <span><Star size={11} /> {m.rating}</span>
                              <span><BookOpen size={11} /> {m.ch} chapters</span>
                              <span className="mv-row-tag">{m.demo}</span>
                              <span className={`mv-row-status ${(m.status || "").toLowerCase()}`}>{m.status}</span>
                            </div>
                          </div>
                          <button className={`mv-row-wish ${wishlist.includes(m.id) ? "active" : ""}`} onClick={() => toggleWishlist(m.id)}>
                            <Heart size={15} fill={wishlist.includes(m.id) ? "currentColor" : "none"} />
                          </button>
                          <div className="mv-card-glow" />
                        </>
                      )}
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {!loading && (
              <>
                {loadingMore && (
                  <div className="mv-empty" style={{ padding: "24px" }}>
                    <Loader2 size={24} className="mv-spin" />
                  </div>
                )}

                {hasMore && !loadingMore && <div ref={sentinelRef} className="mv-sentinel" />}

                {hasMore && (
                  <div className="mv-load-more-wrap">
                    <button
                      className="mv-load-more"
                      onClick={() => loadManga(page + 1)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <><Loader2 size={16} className="mv-spin" /> Loading...</>
                      ) : (
                        <><ChevronDown size={16} /> Load More</>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {!loading && filtered.length === 0 && (
              <div className="mv-empty">
                <BookOpen size={40} />
                <h3>No results found</h3>
                <p>Try adjusting your search or filters.</p>
              </div>
            )}
          </section>
        </main>


        <AnimatePresence>
          {preview && (
            <div className="mv-modal-overlay" onClick={() => setPreview(null)}>
              <motion.div
                className="mv-modal"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="mv-modal-head">
                  <div className="mv-modal-head-info">
                    <span className="mv-modal-status"><span className="mv-pulse-dot" /> {preview.status}</span>
                    <h2>{preview.title}</h2>
                  </div>
                  <button className="mv-modal-close" onClick={() => setPreview(null)}><X size={22} /></button>
                </div>
                <div className="mv-modal-body">
                  <div className="mv-modal-cover">
                    <img src={preview.cover} alt={preview.title} />
                  </div>
                  <div className="mv-modal-sidebar">
                    <div className="mv-modal-section">
                      <label>Author</label>
                      <div className="mv-modal-author">{preview.author}</div>
                    </div>
                    <div className="mv-modal-section">
                      <label>Details</label>
                      <div className="mv-modal-details">
                        <div className="mv-modal-detail"><Star size={13} /> {preview.rating} Rating</div>
                        <div className="mv-modal-detail"><BookOpen size={13} /> {preview.ch} Chapters</div>
                        <div className="mv-modal-detail"><Zap size={13} /> {Math.round((preview.progress || 0) * 100)}% Read</div>
                      </div>
                    </div>
                    <div className="mv-modal-section">
                      <label>Genres</label>
                      <div className="mv-modal-tags">
                        {preview.genres?.map(g => <span key={g}>{g}</span>)}
                        <span className="mv-modal-tag-accent">{preview.demo}</span>
                      </div>
                    </div>
                    <div className="mv-modal-section">
                      <label>Synopsis</label>
                      <p>{preview.desc}</p>
                    </div>
                    <div className="mv-modal-bar">
                      <div className="mv-modal-bar-fill" style={{ width: `${(preview.progress || 0) * 100}%` }} />
                    </div>
                    <button className="mv-modal-btn" onClick={() => toggleWishlist(preview.id)}>
                      <Heart size={16} fill={wishlist.includes(preview.id) ? "currentColor" : "none"} />
                      {wishlist.includes(preview.id) ? "In Your List" : "Add to List"}
                    </button>
                    <button className="mv-modal-btn mv-modal-btn-primary">Continue Ch. {preview.last}</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
