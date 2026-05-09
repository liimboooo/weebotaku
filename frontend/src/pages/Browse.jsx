import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Sparkles,
  Heart,
  List,
  Grid3x3,
  Library,
  Loader2,
} from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Background from "../components/Background";
import { fetchTopAnime, fetchSearchAnime, fetchAnimeGenres } from "../services/jikanApi";
import "./Browse.css";

const sortOptions = [
  { value: "popularity", label: "Popularity" },
  { value: "score", label: "Score" },
  { value: "recent", label: "Recently Added" },
];

const formatOptions = ["TV", "Movie", "OVA"];
const statusOptions = [
  { value: "Airing", label: "Airing" },
  { value: "Finished", label: "Finished" },
];

function getAnimeFormat(anime) {
  return anime?.type || "TV";
}

function getAnimeStatusBucket(anime) {
  return anime?.status === "Ongoing" ? "Airing" : "Finished";
}

function getAnimeSeasonLabel(anime) {
  return anime?.season || "Unknown";
}

function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem("watchlist") || "[]");
  } catch {
    return [];
  }
}

function addToWatchlist(anime) {
  const current = loadWatchlist();
  if (current.includes(anime.id)) return current;
  const next = [...current, anime.id];
  localStorage.setItem("watchlist", JSON.stringify(next));
  return next;
}

function FilterDropdown({ label, icon: Icon, items, active, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="br-drop" ref={ref}>
      <button className={`br-drop-btn ${active.length > 0 ? "has-active" : ""}`} onClick={() => setOpen(!open)}>
        <Icon size={14} />
        {label}
        {active.length > 0 && <span className="br-drop-count">{active.length}</span>}
        <ChevronDown size={12} className={`br-drop-chevron ${open ? "open" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="br-drop-panel"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            <div className="br-drop-items">
              {items.map((item) => typeof children === "function" ? children(item) : item)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnimeCard({ anime, onOpen, onAdd, wishlist, onWishlist }) {
  const inWishlist = wishlist.includes(anime.id);
  return (
    <motion.article
      layout
      className="br-card"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.28 }}
    >
      <div className="br-card-thumb" onClick={() => onOpen(anime)}>
        <img className="br-card-img" src={anime.img} alt={anime.name} loading="lazy" />
        <div className="br-card-overlay">
          <div className="br-card-play-icon"><Play size={20} fill="currentColor" /></div>
          <div className="br-card-tech">
            <span>{anime.episodes} eps</span>
            <span>{anime.type || "TV"}</span>
          </div>
        </div>
        <div className="br-card-badge"><Star size={10} fill="currentColor" /> {anime.rating?.toFixed(1)}</div>
        <button
          type="button"
          className={`br-card-wish ${inWishlist ? "active" : ""}`}
          onClick={(e) => { e.stopPropagation(); onWishlist(anime.id); }}
        >
          <Heart size={13} fill={inWishlist ? "currentColor" : "none"} />
        </button>
        <div className="br-card-progress" style={{ width: `${Math.round((anime.readProgress || 0) * 100)}%` }} />
      </div>
      <div className="br-card-body">
        <div className="br-card-head">
          <h3>{anime.name}</h3>
          <button type="button" className="br-card-add" onClick={(e) => { e.stopPropagation(); onAdd(anime); }}>
            <Plus size={13} />
          </button>
        </div>
        <p>{anime.studio}</p>
        <div className="br-card-foot">
          <span>{anime.episodes} eps</span>
          <span>{anime.year}</span>
        </div>
      </div>
      <div className="br-card-glow" />
    </motion.article>
  );
}

export default function Browse() {
  const navigate = useNavigate();

  const [allAnime, setAllAnime] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [activeGenres, setActiveGenres] = useState([]);
  const [activeFormats, setActiveFormats] = useState([]);
  const [activeStatuses, setActiveStatuses] = useState([]);
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [activeYears, setActiveYears] = useState([]);
  const [activeStudios, setActiveStudios] = useState([]);
  const [sortBy, setSortBy] = useState("popularity");
  const [view, setView] = useState("grid");
  const [watchlist, setWatchlist] = useState(() => loadWatchlist());
  const sentinelRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    fetchAnimeGenres().then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadAnime(1, true);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setAllAnime([]);
    setPage(1);
    setHasMore(true);
    loadAnime(1, true);
  }, [debouncedSearch]);

  async function loadAnime(p, replace = false) {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const isSearch = debouncedSearch.trim().length > 0;
      const result = isSearch
        ? await fetchSearchAnime(debouncedSearch, p)
        : await fetchTopAnime(p);
      setAllAnime(prev => replace ? result.data : [...prev, ...result.data]);
      setHasMore(result.pagination.has_next_page);
      setPage(p);
    } catch (err) {
      console.error("Failed to load anime:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const allStudios = useMemo(() =>
    Array.from(new Set(allAnime.map(a => a.studio).filter(Boolean))).sort(),
    [allAnime]
  );

  const allSeasons = useMemo(() =>
    Array.from(new Set(allAnime.map(a => getAnimeSeasonLabel(a)).filter(s => s !== "Unknown"))).sort(),
    [allAnime]
  );

  const allYears = useMemo(() =>
    Array.from(new Set(allAnime.map(a => a.year).filter(Boolean))).sort((a, b) => b - a),
    [allAnime]
  );

  const filteredAnime = useMemo(() => {
    return allAnime
      .filter(anime => {
        if (activeGenres.length && !activeGenres.some(g => anime.genres.includes(g))) return false;
        if (activeFormats.length && !activeFormats.includes(getAnimeFormat(anime))) return false;
        if (activeStatuses.length && !activeStatuses.includes(getAnimeStatusBucket(anime))) return false;
        if (activeSeasons.length && !activeSeasons.includes(getAnimeSeasonLabel(anime))) return false;
        if (activeYears.length && !activeYears.includes(String(anime.year))) return false;
        if (activeStudios.length && !activeStudios.includes(anime.studio)) return false;
        return true;
      })
      .sort((l, r) => {
        if (sortBy === "score") return (r.rating || 0) - (l.rating || 0);
        if (sortBy === "recent") return (r.id || 0) - (l.id || 0);
        return (r.votes || 0) - (l.votes || 0);
      });
  }, [allAnime, activeFormats, activeGenres, activeSeasons, activeStatuses, activeStudios, activeYears, sortBy]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadAnime(page + 1);
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  const handleQuickAdd = (anime) => setWatchlist(addToWatchlist(anime));
  const toggleWishlist = (id) => setWatchlist(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleValue = (setter, value) => setter(c => c.includes(value) ? c.filter(i => i !== value) : [...c, value]);

  const activeCount = activeGenres.length + activeFormats.length + activeStatuses.length + activeSeasons.length + activeYears.length + activeStudios.length;

  const selectedPills = [
    ...activeGenres.map(v => ({ key: `g:${v}`, label: v, remove: () => setActiveGenres(c => c.filter(i => i !== v)) })),
    ...activeFormats.map(v => ({ key: `f:${v}`, label: v, remove: () => setActiveFormats(c => c.filter(i => i !== v)) })),
    ...activeStatuses.map(v => ({ key: `s:${v}`, label: v, remove: () => setActiveStatuses(c => c.filter(i => i !== v)) })),
    ...activeSeasons.map(v => ({ key: `se:${v}`, label: v, remove: () => setActiveSeasons(c => c.filter(i => i !== v)) })),
    ...activeYears.map(v => ({ key: `y:${v}`, label: v, remove: () => setActiveYears(c => c.filter(i => i !== v)) })),
    ...activeStudios.map(v => ({ key: `st:${v}`, label: v, remove: () => setActiveStudios(c => c.filter(i => i !== v)) })),
  ];

  const topAnime = allAnime.length > 0
    ? allAnime.reduce((best, a) => (a.rating || 0) > (best.rating || 0) ? a : best, allAnime[0])
    : null;

  const totalEpisodes = useMemo(() =>
    allAnime.reduce((s, a) => s + (a.episodes || 0), 0),
    [allAnime]
  );

  const renderChip = (value, active, onClick) => (
    <button key={value} type="button" className={`br-chip ${active ? "active" : ""}`} onClick={onClick}>{value}</button>
  );

  return (
    <AnimatedPage>
      <div className="br">
        <Background />
        <Header />
        <div className="br-bg-ornament" />

        <main className="br-shell">
          <motion.section className="br-hero" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="br-hero-bg">
              {topAnime?.trailerUrl && (
                <iframe
                  className="br-hero-video"
                  src={`${topAnime.trailerUrl}${topAnime.trailerUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&controls=0&loop=1&playlist=${topAnime.trailerUrl.split('/').pop().split('?')[0]}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0`}
                  title={topAnime.name}
                  allow="autoplay; fullscreen"
                  loading="lazy"
                />
              )}
            </div>
            <div className="br-hero-poster" />
            <div className="br-hero-gradient" />
            <div className="br-hero-content">
              <span className="br-eyebrow"><Sparkles size={14} /> ANIME COLLECTION</span>
              <h1>
                <span className="br-hero-main">EXPLORE</span>
                <span className="br-hero-accent">ANIME</span>
              </h1>
              <p className="br-hero-desc">
                Discover thousands of anime across every genre. Track your watchlist, find your next favorite series, and dive into the community.
              </p>
              <div className="br-hero-metrics">
                <div className="br-metric"><strong>{allAnime.length}</strong><span>Loaded</span></div>
                <div className="br-metric"><strong>{totalEpisodes}</strong><span>Episodes</span></div>
                <div className="br-metric"><strong>{genres.length}</strong><span>Genres</span></div>
              </div>
            </div>
            <div className="br-hero-hud">
              <span className="br-hud-label">TOP RATED</span>
              <span className="br-hud-title">{topAnime?.name || "Loading..."}</span>
              <span className="br-hud-rating"><Star size={12} fill="currentColor" /> {topAnime?.rating?.toFixed(1) || "?"}</span>
            </div>
          </motion.section>

          <div className="br-controls">
            <div className="br-search">
              <Search size={15} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search anime..." />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="br-view-toggle">
              <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><Grid3x3 size={14} /></button>
              <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={14} /></button>
            </div>
          </div>

          <div className="br-filters">
            <FilterDropdown label="Genres" icon={SlidersHorizontal} items={genres} active={activeGenres}>
              {(item) => renderChip(item, activeGenres.includes(item), () => toggleValue(setActiveGenres, item))}
            </FilterDropdown>
            <FilterDropdown label="Format" icon={SlidersHorizontal} items={formatOptions} active={activeFormats}>
              {(item) => renderChip(item, activeFormats.includes(item), () => toggleValue(setActiveFormats, item))}
            </FilterDropdown>
            <FilterDropdown label="Status" icon={SlidersHorizontal} items={statusOptions.map(s => s.value)} active={activeStatuses}>
              {(item) => renderChip(item, activeStatuses.includes(item), () => toggleValue(setActiveStatuses, item))}
            </FilterDropdown>
            <FilterDropdown label="Season" icon={SlidersHorizontal} items={allSeasons} active={activeSeasons}>
              {(item) => renderChip(item, activeSeasons.includes(item), () => toggleValue(setActiveSeasons, item))}
            </FilterDropdown>
            <FilterDropdown label="Year" icon={SlidersHorizontal} items={allYears} active={activeYears}>
              {(item) => renderChip(String(item), activeYears.includes(String(item)), () => toggleValue(setActiveYears, String(item)))}
            </FilterDropdown>
            <FilterDropdown label="Studio" icon={SlidersHorizontal} items={allStudios} active={activeStudios}>
              {(item) => renderChip(item, activeStudios.includes(item), () => toggleValue(setActiveStudios, item))}
            </FilterDropdown>
          </div>

          <div className="br-summary">
            <span>{filteredAnime.length} results</span>
            <span><Heart size={12} /> {watchlist.length} in watchlist</span>
            {activeCount > 0 && <span>{activeCount} active</span>}
          </div>

          {selectedPills.length > 0 && (
            <div className="br-active-pills">
              {selectedPills.map(p => (
                <button key={p.key} type="button" className="br-active-pill" onClick={p.remove}>
                  {p.label} <span>×</span>
                </button>
              ))}
              <button type="button" className="br-active-pill br-active-pill-clear" onClick={() => { setActiveGenres([]); setActiveFormats([]); setActiveStatuses([]); setActiveSeasons([]); setActiveYears([]); setActiveStudios([]); }}>
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="br-empty">
              <Loader2 size={36} className="br-spin" />
              <h3>Loading anime...</h3>
            </div>
          ) : (
            <>
              <motion.div
                layout
                key={`${searchTerm}-${sortBy}-${activeCount}-${view}`}
                className={`br-grid ${view === "list" ? "br-list" : ""}`}
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredAnime.map(anime => (
                    <AnimeCard
                      key={anime.id}
                      anime={anime}
                      onOpen={item => navigate(`/anime/${item.id}`)}
                      onAdd={handleQuickAdd}
                      wishlist={watchlist}
                      onWishlist={toggleWishlist}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {hasMore && !loadingMore && <div ref={sentinelRef} className="br-sentinel" />}

              {hasMore && (
                <div className="br-load-more-wrap">
                  <button
                    className="br-load-more"
                    onClick={() => loadAnime(page + 1)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <><Loader2 size={16} className="br-spin" /> Loading...</>
                    ) : (
                      <><ChevronDown size={16} /> Load More</>
                    )}
                  </button>
                </div>
              )}

              {filteredAnime.length === 0 && !loading && (
                <div className="br-empty">
                  <Library size={36} />
                  <h3>No matches</h3>
                  <p>Try clearing a filter or widening your search.</p>
                </div>
              )}
            </>
          )}
        </main>

      </div>
    </AnimatedPage>
  );
}
