import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLoading } from "../components/LoadingProvider";
import {
  Activity,
  Bookmark,
  Building2,
  Calendar,
  ChevronDown,
  Film,
  Hash,
  List,
  Grid3x3,
  Library,
  Play,
  Search,
  Sparkles,
  Star,
  Tag,
  X,
  Zap,
} from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Loader from "../components/Loader";
import Background from "../components/Background";
import { fetchTopAnime, fetchSearchAnime, fetchAnimeGenres } from "../services/anilistApi";
import { loadWatchlist, addToWatchlist, removeFromWatchlist, loadWatchHistory } from "../services/storage";
import { addNotification } from "../services/notificationService";
import { findStreamingSource } from "../services/animeApi";
import AnimeWatch from "./Feeds/AnimeWatch";
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

function FilterDropdown({ label, icon: Icon, items, active, children, searchable }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const filtered = searchable && q
    ? items.filter(i => typeof i === "string" && i.toLowerCase().includes(q.toLowerCase()))
    : items;

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
            {searchable && (
              <div className="br-drop-search">
                <Search size={12} />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`} autoFocus />
                {q && <button className="br-drop-search-clear" onClick={() => setQ("")}><X size={12} /></button>}
              </div>
            )}
            <div className="br-drop-items">
              {filtered.map((item) => typeof children === "function" ? children(item) : item)}
            </div>
            {filtered.length === 0 && <div className="br-drop-empty">No matches</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnimeCard({ anime, wishlist, onWishlist, onWatch, watchLoading }) {
  const inWishlist = wishlist.some(i => i.id === anime.id);
  const [imgErr, setImgErr] = useState(false);
  return (
    <>
      <div className="br-card-thumb">
        {imgErr ? <div className="br-card-img-fallback">{anime.name?.[0] || "?"}</div> : <img src={anime.img} alt={anime.name} loading="lazy" onError={() => setImgErr(true)} />}
        <div className="br-card-overlay">
          <button className="br-card-play" onClick={(e) => { e.stopPropagation(); onWatch(anime); }} disabled={watchLoading}>
            <Play size={20} fill="currentColor" />
          </button>
          <div className="br-card-tech">
            <span>{anime.episodes} eps</span>
            <span>{anime.type || "TV"}</span>
          </div>
        </div>
        <div className="br-card-badge">
          {anime.status === "Ongoing" ? <Zap size={10} /> : null}
          {anime.status || "Unknown"}
        </div>
        <div className="br-card-progress" style={{ width: `${Math.round((anime.readProgress || 0) * 100)}%` }} />
      </div>
      <div className="br-card-body">
        <div className="br-card-head">
          <div>
            <h3>{anime.name}</h3>
            <span className="br-card-studio">{anime.studio}</span>
          </div>
          <button className={`br-wish-btn ${inWishlist ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); onWishlist(anime.id); }}>
            <Bookmark size={14} fill={inWishlist ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="br-card-desc">{anime.synopsis}</p>
        <div className="br-card-foot">
          <span className="br-card-rating"><Star size={11} fill="currentColor" /> {anime.rating?.toFixed(1)}</span>
          <span className="br-card-ch"><Play size={11} /> {anime.episodes} eps</span>
          {anime.genres?.[0] && <span className="br-card-tag">{anime.genres[0]}</span>}
        </div>
      </div>
      <div className="br-card-glow" />
    </>
  );
}

export default function Browse() {
  const navigate = useNavigate();

  const [allAnime, setAllAnime] = useState([]);
  const [heroAnime, setHeroAnime] = useState(null);
  const { showLoading: showGlobalLoading, hideLoading: hideGlobalLoading } = useLoading();
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
  const [watchlist, setWatchlist] = useState(loadWatchlist());
  const [watchAnime, setWatchAnime] = useState(null);
  const [watchLoading, setWatchLoading] = useState(false);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    fetchAnimeGenres().then(setGenres).catch(() => {});
    fetchTopAnime(1).then(r => setHeroAnime(r.data[0])).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchRef = useRef("");
  searchRef.current = debouncedSearch;

  const loadAnime = useCallback(async (p, replace = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (replace) setLoading(true);
    else setLoadingMore(true);
    showGlobalLoading();
    try {
      const q = searchRef.current.trim();
      const result = q
        ? await fetchSearchAnime(q, p)
        : await fetchTopAnime(p);
      setAllAnime(prev => replace ? result.data : [...prev, ...result.data]);
      setHasMore(result.pagination.has_next_page);
      setPage(p);
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error("Failed to load anime:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
      hideGlobalLoading();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAllAnime([]);
    setPage(1);
    setHasMore(true);
    loadAnime(1, true);
  }, [debouncedSearch, loadAnime]);

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

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingRef.current) return;
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
  }, [hasMore, loadingMore, loading, loadAnime, page]);

  const openWatch = async (anime) => {
    setWatchLoading(true);
    try {
      const src = await findStreamingSource(anime.name);
      if (!src) { addNotification({ title: "Not Available", body: "No streaming source for this title.", type: "error" }); return; }
      const history = loadWatchHistory();
      const found = history.find(h => h.animeId === anime.id);
      setWatchAnime({ ...src, _name: anime.name, _episodes: anime.episodes || 12, startEp: found?.episode || 1 });
      addNotification({ title: "Now Playing", body: anime.name, type: "watch" });
    } catch (e) {
      addNotification({ title: "Stream Error", body: "Failed to find streaming source.", type: "error" });
    } finally {
      setWatchLoading(false);
    }
  };

  const toggleWishlist = (id) => {
    setWatchlist(p => {
      if (p.some(i => i.id === id)) {
        addNotification({ title: "Removed from Watchlist", type: "save" });
        return removeFromWatchlist(id);
      }
      const anime = allAnime.find(a => a.id === id);
      if (!anime) return p;
      const item = { id: anime.id, name: anime.name, img: anime.img, rating: anime.rating, episodes: anime.episodes, year: anime.year, genres: anime.genres, status: anime.status };
      addNotification({ title: "Added to Watchlist", body: anime.name, type: "save" });
      return addToWatchlist(item);
    });
  };
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

  const topAnime = heroAnime;

  const totalEpisodes = useMemo(() =>
    filteredAnime.reduce((s, a) => s + (a.episodes || 0), 0),
    [filteredAnime]
  );

  const renderChip = (value, active, onClick) => (
    <button key={value} type="button" className={`br-chip ${active ? "active" : ""}`} onClick={onClick}>{value}</button>
  );

  return (
    <AnimatedPage>
      <div className="br">
        <Background />
        <div className="br-bg-ornament" />

        <main className="br-shell">
          <motion.section className="br-hero" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="br-hero-bg" style={topAnime?.img ? { backgroundImage: `url(${topAnime.img})` } : {}}>
              {topAnime?.trailerUrl && (
                <iframe
                  className="br-hero-video"
                  src={`${topAnime.trailerUrl}${topAnime.trailerUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&controls=0&loop=1&playlist=${topAnime.trailerUrl.split('/').pop().split('?')[0]}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0`}
                  title={topAnime.name}
                  allow="autoplay; encrypted-media; fullscreen"
                  loading="lazy"
                />
              )}
            </div>
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
              {topAnime?.img && <div className="br-hud-img"><img src={topAnime.img} alt={topAnime.name} /></div>}
              <div className="br-hud-info">
                <span className="br-hud-label">TOP RATED</span>
                <span className="br-hud-title">{topAnime?.name || "Loading..."}</span>
                <span className="br-hud-rating"><Star size={12} fill="currentColor" /> {topAnime?.rating?.toFixed(1) || "?"}</span>
              </div>
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
            <FilterDropdown label="Genres" icon={Tag} items={genres} active={activeGenres} searchable>
              {(item) => renderChip(item, activeGenres.includes(item), () => toggleValue(setActiveGenres, item))}
            </FilterDropdown>
            <FilterDropdown label="Format" icon={Film} items={formatOptions} active={activeFormats}>
              {(item) => renderChip(item, activeFormats.includes(item), () => toggleValue(setActiveFormats, item))}
            </FilterDropdown>
            <FilterDropdown label="Status" icon={Activity} items={statusOptions.map(s => s.value)} active={activeStatuses}>
              {(item) => renderChip(item, activeStatuses.includes(item), () => toggleValue(setActiveStatuses, item))}
            </FilterDropdown>
            <FilterDropdown label="Season" icon={Calendar} items={allSeasons} active={activeSeasons}>
              {(item) => renderChip(item, activeSeasons.includes(item), () => toggleValue(setActiveSeasons, item))}
            </FilterDropdown>
            <FilterDropdown label="Year" icon={Hash} items={allYears} active={activeYears}>
              {(item) => renderChip(String(item), activeYears.includes(String(item)), () => toggleValue(setActiveYears, String(item)))}
            </FilterDropdown>
            <FilterDropdown label="Studio" icon={Building2} items={allStudios} active={activeStudios}>
              {(item) => renderChip(item, activeStudios.includes(item), () => toggleValue(setActiveStudios, item))}
            </FilterDropdown>
          </div>

          <div className="br-summary">
            <span>{filteredAnime.length} results</span>
            <span><Bookmark size={12} /> {watchlist.length} in watchlist</span>
            {activeCount > 0 && <span>{activeCount} active</span>}
          </div>

          {selectedPills.length > 0 && (
            <div className="br-active-pills">
              {selectedPills.map(p => (
                <button key={p.key} type="button" className="br-active-pill" onClick={p.remove}>
                  {p.label} <span className="br-active-pill-x"><X size={10} /></span>
                </button>
              ))}
              <button type="button" className="br-active-pill br-active-pill-clear" onClick={() => { setActiveGenres([]); setActiveFormats([]); setActiveStatuses([]); setActiveSeasons([]); setActiveYears([]); setActiveStudios([]); }}>
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <Loader text="Loading anime..." />
          ) : (
            <>
              <div className={`br-grid ${view === "list" ? "br-list" : ""}`}>
                <AnimatePresence mode="popLayout">
                  {filteredAnime.map((anime, i) => (
                    <motion.article
                      key={anime.id}
                      className="br-card"
                      layout
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ delay: (i % 12) * 0.025 }}
                      onClick={() => navigate(`/anime/${anime.id}/info`)}
                    >
                      <AnimeCard
                        anime={anime}
                        wishlist={watchlist}
                        onWishlist={toggleWishlist}
                        onWatch={openWatch}
                        watchLoading={watchLoading}
                      />
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>

              {loadingMore && (
                <Loader text="Loading more..." />
              )}

              {hasMore && !loadingMore && <div ref={sentinelRef} className="br-sentinel" />}

              {filteredAnime.length === 0 && !loading && (
                <div className="br-empty">
                  <Library size={36} />
                  <h3>{hasLoadedOnce.current ? "No matches" : "Could not load"}</h3>
                  <p>{hasLoadedOnce.current ? "Try clearing a filter or widening your search." : "Check your connection or try refreshing the page."}</p>
                  {!hasLoadedOnce.current && (
                    <button className="br-retry-btn" onClick={() => loadAnime(1, true)}>
                      Retry
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {watchAnime && (
          <AnimeWatch
            anime={watchAnime}
            animeName={watchAnime._name}
            onClose={() => setWatchAnime(null)}
            startEp={watchAnime.startEp || 1}
            totalEpisodes={watchAnime._episodes || 12}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
