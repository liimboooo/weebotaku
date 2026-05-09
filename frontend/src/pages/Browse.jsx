import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Filter,
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
} from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import { getAllAnime, getAllGenres } from "../data/animeData";
import "./Browse.css";

const PAGE_SIZE = 15;

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

function normalize(value) {
  return String(value || "").toLowerCase();
}

function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem("watchlist") || "[]");
  } catch (error) {
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

function FilterGroup({ title, icon: Icon, open, onToggle, children, count }) {
  return (
    <section className="br-filter-group">
      <button className="br-filter-trigger" type="button" onClick={onToggle} aria-expanded={open}>
        <span className="br-filter-title">
          <Icon size={15} />
          {title}
        </span>
        <span className="br-filter-meta">
          {count > 0 && <span className="br-filter-count">{count}</span>}
          <ChevronDown size={15} className={`br-filter-chevron ${open ? "open" : ""}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="br-filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="br-filter-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
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
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="br-card-thumb" onClick={() => onOpen(anime)}>
        <img className="br-card-img" src={anime.img} alt={anime.name} loading="lazy" />
        <div className="br-card-overlay">
          <div className="br-card-play-icon">
            <Play size={20} fill="currentColor" />
          </div>
          <div className="br-card-tech">
            <span>{anime.episodes} eps</span>
            <span>{anime.type || "TV"}</span>
          </div>
        </div>
        <div className="br-card-badge">
          <Star size={10} fill="currentColor" /> {anime.rating.toFixed(1)}
        </div>
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
          <button
            type="button"
            className="br-card-add"
            onClick={(e) => { e.stopPropagation(); onAdd(anime); }}
          >
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
  const allAnime = useMemo(() => getAllAnime(), []);
  const allGenres = useMemo(() => getAllGenres(), []);
  const allStudios = useMemo(() => Array.from(new Set(allAnime.map((a) => a.studio))).sort(), [allAnime]);
  const allSeasons = useMemo(() => Array.from(new Set(allAnime.map((a) => getAnimeSeasonLabel(a)))).sort(), [allAnime]);
  const allYears = useMemo(() => Array.from(new Set(allAnime.map((a) => a.year))).sort((a, b) => b - a), [allAnime]);

  const [activeGenres, setActiveGenres] = useState([]);
  const [activeFormats, setActiveFormats] = useState([]);
  const [activeStatuses, setActiveStatuses] = useState([]);
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [activeYears, setActiveYears] = useState([]);
  const [activeStudios, setActiveStudios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("popularity");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [view, setView] = useState("grid");
  const [openGroups, setOpenGroups] = useState({
    genres: true, format: true, status: true, season: true, year: true, studio: true,
  });
  const [watchlist, setWatchlist] = useState(() => loadWatchlist());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sentinelRef = useRef(null);

  const filteredAnime = useMemo(() => {
    const query = normalize(searchTerm);
    const filtered = allAnime.filter((anime) => {
      const matchesQuery =
        !query ||
        normalize(anime.name).includes(query) ||
        normalize(anime.studio).includes(query) ||
        anime.genres.some((genre) => normalize(genre).includes(query));
      const matchesGenres = activeGenres.length === 0 || activeGenres.some((g) => anime.genres.includes(g));
      const matchesFormats = activeFormats.length === 0 || activeFormats.includes(getAnimeFormat(anime));
      const matchesStatuses = activeStatuses.length === 0 || activeStatuses.includes(getAnimeStatusBucket(anime));
      const matchesSeasons = activeSeasons.length === 0 || activeSeasons.includes(getAnimeSeasonLabel(anime));
      const matchesYears = activeYears.length === 0 || activeYears.includes(String(anime.year));
      const matchesStudios = activeStudios.length === 0 || activeStudios.includes(anime.studio);
      return matchesQuery && matchesGenres && matchesFormats && matchesStatuses && matchesSeasons && matchesYears && matchesStudios;
    });
    const sorted = [...filtered].sort((l, r) => {
      if (sortBy === "score") return r.rating - l.rating;
      if (sortBy === "recent") return r.id - l.id;
      return r.votes - l.votes;
    });
    return sorted;
  }, [allAnime, activeFormats, activeGenres, activeSeasons, activeStatuses, activeStudios, activeYears, searchTerm, sortBy]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchTerm, activeGenres, activeFormats, activeStatuses, activeSeasons, activeYears, activeStudios, sortBy]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredAnime.length)); },
      { rootMargin: "240px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredAnime.length]);

  useEffect(() => { setVisibleCount((c) => Math.min(c, filteredAnime.length)); }, [filteredAnime.length]);

  const visibleAnime = filteredAnime.slice(0, visibleCount);

  const toggleGroup = (key) => setOpenGroups((c) => ({ ...c, [key]: !c[key] }));
  const toggleValue = (setter, value) => setter((c) => c.includes(value) ? c.filter((i) => i !== value) : [...c, value]);

  const handleQuickAdd = (anime) => setWatchlist(addToWatchlist(anime));

  const toggleWishlist = (id) => {
    setWatchlist((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const activeCount = activeGenres.length + activeFormats.length + activeStatuses.length + activeSeasons.length + activeYears.length + activeStudios.length;

  const selectedPills = [
    ...activeGenres.map((v) => ({ key: `g:${v}`, label: v, remove: () => setActiveGenres((c) => c.filter((i) => i !== v)) })),
    ...activeFormats.map((v) => ({ key: `f:${v}`, label: v, remove: () => setActiveFormats((c) => c.filter((i) => i !== v)) })),
    ...activeStatuses.map((v) => ({ key: `s:${v}`, label: v, remove: () => setActiveStatuses((c) => c.filter((i) => i !== v)) })),
    ...activeSeasons.map((v) => ({ key: `se:${v}`, label: v, remove: () => setActiveSeasons((c) => c.filter((i) => i !== v)) })),
    ...activeYears.map((v) => ({ key: `y:${v}`, label: v, remove: () => setActiveYears((c) => c.filter((i) => i !== v)) })),
    ...activeStudios.map((v) => ({ key: `st:${v}`, label: v, remove: () => setActiveStudios((c) => c.filter((i) => i !== v)) })),
  ];

  const topAnime = useMemo(() => allAnime.reduce((best, a) => a.rating > best.rating ? a : best, allAnime[0]), [allAnime]);

  return (
    <AnimatedPage>
      <div className={`br ${filtersOpen ? "br-filters-open" : ""}`}>
        <Background />
        <Header />
        <div className="br-bg-ornament" />

        <main className="br-shell">
          <motion.section className="br-hero" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="br-hero-content">
              <span className="br-eyebrow"><Sparkles size={14} /> Anime Collection</span>
              <h1>
                <span className="br-hero-small">Explore</span>
                <span className="br-hero-big">Anime</span>
              </h1>
              <p className="br-hero-desc">
                Discover thousands of anime across every genre. Track your watchlist, find your next favorite series, and dive into the community.
              </p>
              <div className="br-hero-metrics">
                <div className="br-metric"><strong>{allAnime.length}</strong><span>Series</span></div>
                <div className="br-metric"><strong>{allAnime.reduce((s, a) => s + (a.episodes || 0), 0)}</strong><span>Episodes</span></div>
                <div className="br-metric"><strong>{allGenres.length}</strong><span>Genres</span></div>
              </div>
            </div>
            <div className="br-hero-visual">
              <div className="br-hero-orb" />
              <div className="br-hero-grid" />
              <div className="br-hero-spotlight">
                <span className="br-spotlight-label">TOP RATED</span>
                <span className="br-spotlight-title">{topAnime.name}</span>
                <span className="br-spotlight-rating"><Star size={12} fill="currentColor" /> {topAnime.rating}</span>
              </div>
            </div>
          </motion.section>

          <div className="br-layout">
            <aside className="br-sidebar">
              <div className="br-sidebar-head">
                <div>
                  <span className="br-sidebar-kicker">Filters</span>
                  <h2>The Lab</h2>
                </div>
                <Filter size={16} />
              </div>

              <FilterGroup title="Genres" icon={SlidersHorizontal} open={openGroups.genres} onToggle={() => toggleGroup("genres")} count={activeGenres.length}>
                <div className="br-chip-grid">
                  {allGenres.map((g) => (
                    <button key={g} type="button" className={`br-chip ${activeGenres.includes(g) ? "active" : ""}`} onClick={() => toggleValue(setActiveGenres, g)}>{g}</button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup title="Format" icon={SlidersHorizontal} open={openGroups.format} onToggle={() => toggleGroup("format")} count={activeFormats.length}>
                <div className="br-chip-grid">
                  {formatOptions.map((f) => (
                    <button key={f} type="button" className={`br-chip ${activeFormats.includes(f) ? "active" : ""}`} onClick={() => toggleValue(setActiveFormats, f)}>{f}</button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup title="Status" icon={SlidersHorizontal} open={openGroups.status} onToggle={() => toggleGroup("status")} count={activeStatuses.length}>
                <div className="br-chip-grid">
                  {statusOptions.map((s) => (
                    <button key={s.value} type="button" className={`br-chip ${activeStatuses.includes(s.value) ? "active" : ""}`} onClick={() => toggleValue(setActiveStatuses, s.value)}>{s.label}</button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup title="Season" icon={SlidersHorizontal} open={openGroups.season} onToggle={() => toggleGroup("season")} count={activeSeasons.length}>
                <div className="br-chip-grid br-chip-grid-scroll">
                  {allSeasons.map((s) => (
                    <button key={s} type="button" className={`br-chip ${activeSeasons.includes(s) ? "active" : ""}`} onClick={() => toggleValue(setActiveSeasons, s)}>{s}</button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup title="Year" icon={SlidersHorizontal} open={openGroups.year} onToggle={() => toggleGroup("year")} count={activeYears.length}>
                <div className="br-chip-grid br-chip-grid-scroll">
                  {allYears.map((y) => (
                    <button key={y} type="button" className={`br-chip ${activeYears.includes(String(y)) ? "active" : ""}`} onClick={() => toggleValue(setActiveYears, String(y))}>{y}</button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup title="Studio" icon={SlidersHorizontal} open={openGroups.studio} onToggle={() => toggleGroup("studio")} count={activeStudios.length}>
                <div className="br-chip-grid">
                  {allStudios.map((s) => (
                    <button key={s} type="button" className={`br-chip ${activeStudios.includes(s) ? "active" : ""}`} onClick={() => toggleValue(setActiveStudios, s)}>{s}</button>
                  ))}
                </div>
              </FilterGroup>
            </aside>

            <section className="br-results">
              <div className="br-controls">
                <button className="br-filter-toggle" type="button" onClick={() => setFiltersOpen(true)}>
                  <Filter size={16} />
                </button>
                <div className="br-search">
                  <Search size={15} />
                  <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search anime, studio, or genre..." />
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="br-view-toggle">
                  <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><Grid3x3 size={14} /></button>
                  <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={14} /></button>
                </div>
              </div>

              <div className="br-summary">
                <span>{filteredAnime.length} results</span>
                <span><Heart size={12} /> {watchlist.length} in watchlist</span>
                {activeCount > 0 && <span>{activeCount} filters active</span>}
              </div>

              {selectedPills.length > 0 && (
                <div className="br-active-pills">
                  {selectedPills.map((p) => (
                    <button key={p.key} type="button" className="br-active-pill" onClick={p.remove}>
                      {p.label} <span>×</span>
                    </button>
                  ))}
                  <button type="button" className="br-active-pill br-active-pill-clear" onClick={() => { setActiveGenres([]); setActiveFormats([]); setActiveStatuses([]); setActiveSeasons([]); setActiveYears([]); setActiveStudios([]); }}>
                    Clear all
                  </button>
                </div>
              )}

              <motion.div
                layout
                key={`${searchTerm}-${sortBy}-${activeCount}-${view}`}
                className={`br-grid ${view === "list" ? "br-list" : ""}`}
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              >
                <AnimatePresence mode="popLayout">
                  {visibleAnime.map((anime) => (
                    <AnimeCard
                      key={anime.id}
                      anime={anime}
                      onOpen={(item) => navigate(`/anime/${item.id}`)}
                      onAdd={handleQuickAdd}
                      wishlist={watchlist}
                      onWishlist={toggleWishlist}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {visibleCount < filteredAnime.length && <div ref={sentinelRef} className="br-sentinel" />}

              {filteredAnime.length === 0 && (
                <div className="br-empty">
                  <Library size={36} />
                  <h3>No matches</h3>
                  <p>Try clearing a filter or widening your search.</p>
                </div>
              )}
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </AnimatedPage>
  );
}
