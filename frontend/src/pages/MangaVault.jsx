import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "../components/LoadingProvider";
import { Search, X, Star, BookOpen, Eye, Bookmark, Sparkles, Zap, Library, List, Grid3x3, Users, Activity, ChevronDown } from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Loader from "../components/Loader";
import Background from "../components/Background";
import { fetchTopManga, fetchSearchManga } from "../services/anilistApi";
import { loadReadlist, addToReadlist, removeFromReadlist } from "../services/storage";
import { addNotification } from "../services/notificationService";
import { searchManga as mdSearch, getMangaChapters, searchMangaNato, getMangaNatoChapters, getMangaNatoPages, searchToonily, getToonilyChapters, getToonilyPages, searchBato, getBatoChapters, getBatoPages } from "../services/mangaApi";
import MangaReader from "./Feeds/MangaReader";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./MangaVault.css";

const DEMOGRAPHICS = ["Shonen", "Seinen", "Shojo", "Josei"];
const STATUSES = ["Ongoing", "Completed", "Hiatus"];

function FilterDropdown({ label, icon: Icon, items, active, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="mv-drop" ref={ref}>
      <button className={`mv-drop-btn ${active.length > 0 ? "has-active" : ""}`} onClick={() => setOpen(!open)}>
        <Icon size={14} />
        {label}
        {active.length > 0 && <span className="mv-drop-count">{active.length}</span>}
        <ChevronDown size={12} className={`mv-drop-chevron ${open ? "open" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="mv-drop-panel"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mv-drop-items">
              {items.map((item) => typeof children === "function" ? children(item) : item)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MangaVault() {
  useDocumentTitle("Browse Manga");
  const navigate = useNavigate();
  const [allManga, setAllManga] = useState([]);
  const [heroManga, setHeroManga] = useState(null);
  const { showLoading: showGlobalLoading, hideLoading: hideGlobalLoading } = useLoading();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeDemo, setActiveDemo] = useState([]);
  const [activeStatus, setActiveStatus] = useState([]);
  const [sort, setSort] = useState("rating");
  const [view, setView] = useState("grid");
  const [preview, setPreview] = useState(null);
  const [wishlist, setWishlist] = useState(loadReadlist());
  const sentinelRef = useRef(null);
  const searchRef = useRef(debouncedSearch);
  searchRef.current = debouncedSearch;
  const loadingRef = useRef(false);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchTopManga(1).then(r => setHeroManga(r.data[0])).catch(() => {
      setHeroManga({ title: "Explore Manga", rating: 0, cover: "" });
    });
  }, []);

  const loadManga = useCallback(async (p, replace = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (replace) setLoading(true);
    else setLoadingMore(true);
    showGlobalLoading();
    try {
      const q = searchRef.current.trim();
      const result = q
        ? await fetchSearchManga(q, p)
        : await fetchTopManga(p);
      setAllManga(prev => {
        const merged = replace ? result.data : [...prev, ...result.data];
        const seen = new Set();
        return merged.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      });
      setHasMore(result.pagination.hasNextPage);
      setPage(p);
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error("Failed to load manga:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
      hideGlobalLoading();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAllManga([]);
    setPage(1);
    setHasMore(true);
    loadManga(1, true);
  }, [debouncedSearch, loadManga]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingRef.current) return;
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
        if (m.ch === null || m.ch === undefined) return false;
        if (activeDemo.length && !activeDemo.includes(m.demo)) return false;
        if (activeStatus.length && !activeStatus.includes(m.status)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sort === "chapters") return (b.ch || 0) - (a.ch || 0);
        if (sort === "title") return (a.title || "").localeCompare(b.title || "");
        return 0;
      });
  }, [allManga, activeDemo, activeStatus, sort]);

  const [readerManga, setReaderManga] = useState(null);
  const [readerChapters, setReaderChapters] = useState([]);
  const [readerChapter, setReaderChapter] = useState(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [readerError, setReaderError] = useState("");

  const openReader = async (manga) => {
    setChapterLoading(true);
    setReaderError("");
    try {
      const results = await mdSearch(manga.title);
      if (results.length > 0) {
        const md = results[0];
        const chapters = await getMangaChapters(md.id);
        if (chapters.length > 0) {
          setReaderManga(md);
          setReaderChapters(chapters);
          setReaderChapter(chapters[0]);
          setReaderOpen(true);
          return;
        }
      }

      const natoResults = await searchMangaNato(manga.title);
      if (natoResults.length > 0) {
        const nm = natoResults[0];
        const chapters = await getMangaNatoChapters(nm.id);
        if (chapters.length > 0) {
          for (const ch of chapters) {
            try {
              ch.pagesList = await getMangaNatoPages(ch.id);
              ch.pages = ch.pagesList.length;
              ch.provider = 'manganato';
            } catch { continue; }
          }
          const validChapters = chapters.filter(ch => ch.pages > 0);
          if (validChapters.length > 0) {
            setReaderManga(nm);
            setReaderChapters(validChapters);
            setReaderChapter(validChapters[0]);
            setReaderOpen(true);
            return;
          }
        }
      }

      const toonilyResults = await searchToonily(manga.title);
      if (toonilyResults.length > 0) {
        const tm = toonilyResults[0];
        const chapters = await getToonilyChapters(tm.id);
        if (chapters.length > 0) {
          for (const ch of chapters) {
            try {
              ch.pagesList = await getToonilyPages(ch.id);
              ch.pages = ch.pagesList.length;
              ch.provider = 'toonily';
            } catch { continue; }
          }
          const validChapters = chapters.filter(ch => ch.pages > 0);
          if (validChapters.length > 0) {
            setReaderManga(tm);
            setReaderChapters(validChapters);
            setReaderChapter(validChapters[0]);
            setReaderOpen(true);
            return;
          }
        }
      }

      const batoResults = await searchBato(manga.title);
      if (batoResults.length > 0) {
        const bm = batoResults[0];
        const chapters = await getBatoChapters(bm.id);
        if (chapters.length > 0) {
          for (const ch of chapters) {
            try {
              ch.pagesList = await getBatoPages(ch.id);
              ch.pages = ch.pagesList.length;
              ch.provider = 'bato';
            } catch { continue; }
          }
          const validChapters = chapters.filter(ch => ch.pages > 0);
          if (validChapters.length > 0) {
            setReaderManga(bm);
            setReaderChapters(validChapters);
            setReaderChapter(validChapters[0]);
            setReaderOpen(true);
            return;
          }
        }
      }

      setReaderError("No readable chapters found on any provider.");
      addNotification({ title: "No Chapters", body: "No readable chapters found for this manga.", type: "error" });
    } catch (e) {
      setReaderError(`Error: ${e?.message || "Unknown"}`);
    } finally {
      setChapterLoading(false);
    }
  };

  const openDetail = async (manga) => {
    try {
      const results = await mdSearch(manga.title);
      if (results.length > 0) navigate(`/manga/${results[0].id}`);
      else setReaderError("Manga not found on MangaDex.");
    } catch (e) {
      setReaderError(`MangaDex error: ${e?.message || "Unknown"}`);
    }
  };

  const topRated = heroManga;

  const toggleWishlist = (id) => {
    setWishlist(prev => {
      if (prev.some(i => i.id === id)) return removeFromReadlist(id);
      const manga = allManga.find(m => m.id === id);
      if (!manga) return prev;
      const item = { id: manga.id, title: manga.title, cover: manga.cover, rating: manga.rating, ch: manga.ch, demo: manga.demo, status: manga.status, author: manga.author };
      return addToReadlist(item);
    });
  };

  const totalCh = useMemo(() => allManga.reduce((s, m) => s + (m.ch || 0), 0), [allManga]);
  const totalVol = useMemo(() => allManga.reduce((s, m) => s + (m.volumes || 0), 0), [allManga]);

  const toggleValue = (setter, value) => setter(c => c.includes(value) ? c.filter(i => i !== value) : [...c, value]);

  const activeCount = activeDemo.length + activeStatus.length;

  const selectedPills = [
    ...activeDemo.map(v => ({ key: `d:${v}`, label: v, remove: () => setActiveDemo(c => c.filter(i => i !== v)) })),
    ...activeStatus.map(v => ({ key: `s:${v}`, label: v, remove: () => setActiveStatus(c => c.filter(i => i !== v)) })),
  ];

  const renderChip = (value, active, onClick) => (
    <button key={value} type="button" className={`mv-chip ${active ? "active" : ""}`} onClick={onClick}>{value}</button>
  );

  return (
    <AnimatedPage>
      <div className="mv">
        <Background />
        <div className="mv-bg-ornament" />

        <main className="mv-shell">
          <motion.section className="mv-hero" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mv-hero-bg" style={topRated?.cover ? { backgroundImage: `url(${topRated.cover})` } : {}} />
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
                <div className="mv-metric"><strong>{totalVol}</strong><span>Volumes</span></div>
              </div>
            </div>
            <div className="mv-hero-hud">
              {topRated?.cover && <div className="mv-hud-img"><img src={topRated.cover} alt={topRated.title} /></div>}
              <div className="mv-hud-info">
                <span className="mv-hud-label">TOP RATED</span>
                <span className="mv-hud-title">{topRated?.title || "Loading..."}</span>
                <span className="mv-hud-rating"><Star size={12} fill="currentColor" /> {topRated?.rating?.toFixed(1) || "?"}</span>
              </div>
            </div>
          </motion.section>

          <section className="mv-controls">
            <div className="mv-search-box">
              <Search size={18} className="mv-search-icon" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search manga..." />
            </div>
            <div className="mv-controls-right">
              <div className="mv-filters">
                <FilterDropdown label="Demographic" icon={Users} items={DEMOGRAPHICS} active={activeDemo}>
                  {(item) => renderChip(item, activeDemo.includes(item), () => toggleValue(setActiveDemo, item))}
                </FilterDropdown>
                <FilterDropdown label="Status" icon={Activity} items={STATUSES} active={activeStatus}>
                  {(item) => renderChip(item, activeStatus.includes(item), () => toggleValue(setActiveStatus, item))}
                </FilterDropdown>
              </div>
              {selectedPills.length > 0 && (
                <div className="mv-active-pills">
                  {selectedPills.map(p => (
                    <button key={p.key} type="button" className="mv-active-pill" onClick={p.remove}>
                      {p.label} <span className="mv-active-pill-x"><X size={10} /></span>
                    </button>
                  ))}
                  <button type="button" className="mv-active-pill mv-active-pill-clear" onClick={() => { setActiveDemo([]); setActiveStatus([]); }}>
                    Clear all
                  </button>
                </div>
              )}
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
              <div className="mv-summary">
                <span className="mv-count">{filtered.length} series found</span>
                {activeCount > 0 && <span className="mv-count-active">{activeCount} active</span>}
              </div>
            </div>

            {loading ? (
              <Loader text="Loading manga..." />
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
                          <div className="mv-card-thumb" onClick={() => { setPreview(m); setReaderError(""); }}>
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
                            <div className="mv-card-progress" style={{ width: '0%' }} />
                          </div>
                          <div className="mv-card-body">
                            <div className="mv-card-head">
                              <div>
                                <h3>{m.title}</h3>
                                <span className="mv-card-author">{m.author}</span>
                              </div>
                              <button className={`mv-wish-btn ${wishlist.some(i => i.id === m.id) ? "active" : ""}`} onClick={() => toggleWishlist(m.id)}>
                                <Bookmark size={14} fill={wishlist.some(i => i.id === m.id) ? "currentColor" : "none"} />
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
                          <div className="mv-row-thumb" onClick={() => { setPreview(m); setReaderError(""); }}>
                            <img src={m.cover} alt={m.title} loading="lazy" />
                          </div>
                          <div className="mv-row-body" onClick={() => { setPreview(m); setReaderError(""); }}>
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
                          <button className={`mv-row-wish ${wishlist.some(i => i.id === m.id) ? "active" : ""}`} onClick={() => toggleWishlist(m.id)}>
                            <Bookmark size={15} fill={wishlist.some(i => i.id === m.id) ? "currentColor" : "none"} />
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
                  <Loader text="Loading more..." />
                )}

                {hasMore && !loadingMore && <div ref={sentinelRef} className="mv-sentinel" />}
              </>
            )}

            {!loading && filtered.length === 0 && (
              <div className="mv-empty">
                <BookOpen size={40} />
                <h3>{hasLoadedOnce.current ? "No results found" : "Could not load"}</h3>
                <p>{hasLoadedOnce.current ? "Try adjusting your search or filters." : "Check your connection or try refreshing the page."}</p>
                {!hasLoadedOnce.current && (
                  <button className="mv-retry-btn" onClick={() => { setAllManga([]); setPage(1); setHasMore(true); loadManga(1, true); }}>
                    Retry
                  </button>
                )}
              </div>
            )}
          </section>
        </main>


        {preview && createPortal(
            <div className="mv-modal-overlay" onClick={() => { setPreview(null); setReaderError(""); }}>
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
                  <button className="mv-modal-close" onClick={() => { setPreview(null); setReaderError(""); }}><X size={22} /></button>
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
                    {readerError && <div className="mv-modal-error">{readerError}</div>}
                    <button className="mv-modal-btn" onClick={() => toggleWishlist(preview.id)}>
                      <Bookmark size={16} fill={wishlist.some(i => i.id === preview.id) ? "currentColor" : "none"} />
                      {wishlist.some(i => i.id === preview.id) ? "In Your List" : "Add to List"}
                    </button>
                    <button className="mv-modal-btn mv-modal-btn-primary" onClick={() => openReader(preview)} disabled={chapterLoading}>
                      {chapterLoading ? "Searching..." : "Read Online"}
                    </button>
                    <button className="mv-modal-btn mv-modal-btn-secondary" onClick={() => openDetail(preview)}>
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>,
            document.body
          )}

        {readerOpen && (
          <MangaReader
            manga={readerManga}
            chapters={readerChapters}
            initialChapter={readerChapter}
            onClose={() => setReaderOpen(false)}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
