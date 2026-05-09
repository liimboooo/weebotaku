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
  X,
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
        <div className="br-card-badge"><Star size={10} fill="currentColor" /> {anime.rating.toFixed(1)}</div>
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
  const [watchlist, setWatchlist] = useState(() => loadWatchlist());
  const sentinelRef = useRef(null);

  const filteredAnime = useMemo(() => {
    const query = normalize(searchTerm);
    const filtered = allAnime.filter((anime) => {
      const matchesQuery = !query || normalize(anime.name).includes(query) || normalize(anime.studio).includes(query) || anime.genres.some((g) => normalize(g).includes(query));
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

  const handleQuickAdd = (anime) => setWatchlist(addToWatchlist(anime));
  const toggleWishlist = (id) => setWatchlist((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);

  const toggleValue = (setter, value) => setter((c) => c.includes(value) ? c.filter((i) => i !== value) : [...c, value]);

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

          <div className="br-controls">
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

          <div className="br-filters">
            <FilterDropdown label="Genres" icon={SlidersHorizontal} items={allGenres} active={activeGenres}>
              {(item) => renderChip(item, activeGenres.includes(item), () => toggleValue(setActiveGenres, item))}
            </FilterDropdown>
            <FilterDropdown label="Format" icon={SlidersHorizontal} items={formatOptions} active={activeFormats}>
              {(item) => renderChip(item, activeFormats.includes(item), () => toggleValue(setActiveFormats, item))}
            </FilterDropdown>
            <FilterDropdown label="Status" icon={SlidersHorizontal} items={statusOptions.map((s) => s.value)} active={activeStatuses}>
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
        </main>

        <Footer />
      </div>
    </AnimatedPage>
  );
}
