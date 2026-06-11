import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Library,
  Play,
  Search,
  Star,
  X,
} from "lucide-react";
import AnimatedPage from "../components/AnimatedPage";
import { fetchBrowseAnime, fetchAnimeGenres, fetchAnimeTags } from "../services/anilistApi";
import usePrefetchAnime from "../hooks/usePrefetchAnime";
import { loadWatchlist, addToWatchlist, removeFromWatchlist, loadWatchHistory } from "../services/storage";
import { addNotification } from "../services/notificationService";
import { findStreamingSource } from "../services/animeApi";
import AnimeWatch from "./Feeds/AnimeWatch";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./Browse.css";

const SORTS = [
  { v: "POPULARITY_DESC", l: "Popularity" },
  { v: "SCORE_DESC", l: "Score" },
  { v: "TRENDING_DESC", l: "Trending" },
  { v: "START_DATE_DESC", l: "Newest" },
  { v: "FAVOURITES_DESC", l: "Favorites" },
  { v: "TITLE_ROMAJI", l: "Title A–Z" },
];
const FORMATS = [
  { v: "TV", l: "TV" }, { v: "TV_SHORT", l: "TV Short" }, { v: "MOVIE", l: "Movie" },
  { v: "SPECIAL", l: "Special" }, { v: "OVA", l: "OVA" }, { v: "ONA", l: "ONA" }, { v: "MUSIC", l: "Music" },
];
const STATUSES = [
  { v: "RELEASING", l: "Airing" }, { v: "FINISHED", l: "Finished" },
  { v: "NOT_YET_RELEASED", l: "Upcoming" }, { v: "CANCELLED", l: "Cancelled" }, { v: "HIATUS", l: "Hiatus" },
];
const SEASONS = [
  { v: "WINTER", l: "Winter" }, { v: "SPRING", l: "Spring" }, { v: "SUMMER", l: "Summer" }, { v: "FALL", l: "Fall" },
];
const COUNTRIES = [
  { v: "JP", l: "Japan" }, { v: "KR", l: "South Korea" }, { v: "CN", l: "China" }, { v: "TW", l: "Taiwan" },
];
const SOURCES = [
  { v: "ORIGINAL", l: "Original" }, { v: "MANGA", l: "Manga" }, { v: "LIGHT_NOVEL", l: "Light Novel" },
  { v: "VISUAL_NOVEL", l: "Visual Novel" }, { v: "VIDEO_GAME", l: "Video Game" }, { v: "NOVEL", l: "Novel" },
  { v: "WEB_NOVEL", l: "Web Novel" }, { v: "OTHER", l: "Other" },
];
const CUR_YEAR = new Date().getFullYear() + 1;
const YEARS = Array.from({ length: CUR_YEAR - 1960 + 1 }, (_, i) => CUR_YEAR - i);

function AnimeCard({ anime, wishlist, onWishlist, onWatch, watchingId, statusMenuOpen, onAddWithStatus }) {
  const inWishlist = wishlist.some(i => String(i.id) === String(anime.id));
  const [imgErr, setImgErr] = useState(false);
  return (
    <>
      <div className="br-poster">
        {imgErr
          ? <div className="br-poster-fallback">{anime.name?.[0] || "?"}</div>
          : <img className="br-poster-img" src={anime.img} alt={anime.name} loading="lazy" decoding="async" onError={() => setImgErr(true)} />}

        <div className="relative">
          <button
            className={`br-poster-wish ${inWishlist ? "active" : ""}`}
            onClick={(e) => { e.stopPropagation(); onWishlist(anime.id); }}
            aria-label={inWishlist ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Bookmark size={14} fill={inWishlist ? "currentColor" : "none"} />
          </button>
          {statusMenuOpen === anime.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onAddWithStatus(anime.id, ''); }} />
              <div className="absolute top-8 left-0 bg-zinc-900 border border-zinc-700 rounded-xl py-1 min-w-[130px] shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {["Planning","Watching","Completed","Paused","Dropped"].map(s => (
                  <button
                    key={s}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onAddWithStatus(anime.id, s); }}
                  >{s}</button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="br-poster-hover">
          {anime.rating > 0 && (
            <span className="br-poster-rating"><Star size={11} fill="currentColor" /> {anime.rating.toFixed(1)}</span>
          )}
          <button
            className="br-poster-play"
            onClick={(e) => { e.stopPropagation(); onWatch(anime); }}
            disabled={watchingId === anime.id}
            aria-label={`Play ${anime.name}`}
          >
            <Play size={18} fill="currentColor" />
          </button>
        </div>

        {anime.readProgress > 0 && (
          <div className="br-poster-progress" style={{ width: `${Math.round((anime.readProgress || 0) * 100)}%` }} />
        )}
      </div>

      <div className="br-cap">
        <div className="br-cap-top">
          <span className="br-cap-type">{anime.type || "TV"}</span>
          {anime.year ? <span className="br-cap-year">{anime.year}</span> : null}
        </div>
        <h3 className="br-cap-title">
          {anime.status === "Ongoing" && <span className="br-cap-dot" aria-hidden="true" />}
          {anime.name}
        </h3>
      </div>
    </>
  );
}

export default function Browse() {
  useDocumentTitle("Browse Anime");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefetch = usePrefetchAnime();
  const gridRef = useRef(null);

  const [genres, setGenres] = useState([]);
  const [tags, setTags] = useState([]);

  // filter state (seeded from URL for deep-links)
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
  const [genre, setGenre] = useState(searchParams.get("genre") || "");
  const [format, setFormat] = useState(searchParams.get("format") || "");
  const [year, setYear] = useState(searchParams.get("year") || "");
  const [season, setSeason] = useState(searchParams.get("season") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [tag, setTag] = useState(searchParams.get("tag") || "");
  const [country, setCountry] = useState(searchParams.get("country") || "");
  const [source, setSource] = useState(searchParams.get("source") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "POPULARITY_DESC");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, currentPage: 1, lastPage: 1, hasNextPage: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const [watchlist, setWatchlist] = useState(loadWatchlist());
  const [watchAnime, setWatchAnime] = useState(null);
  const [watchingId, setWatchingId] = useState(null);

  useEffect(() => {
    fetchAnimeGenres().then(setGenres).catch(err => console.error('[Otaku] Failed to load genres:', err));
    fetchAnimeTags().then(setTags).catch(err => console.error('[Otaku] Failed to load tags:', err));
  }, []);

  // debounce search box
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 450);
    return () => clearTimeout(t);
  }, [search]);

  // reset to page 1 whenever a filter / search changes
  useEffect(() => { setPage(1); }, [debouncedSearch, genre, format, year, season, status, tag, country, source, sort]);

  // fetch on any filter or page change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchBrowseAnime({ search: debouncedSearch, genre, tag, format, year, season, status, country, source, sort, page })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setPageInfo(res.pageInfo);
      })
      .catch(() => { if (!cancelled) { setItems([]); setError("Failed to load anime. Please try again."); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, genre, tag, format, year, season, status, country, source, sort, page, retryCount]);

  // scroll up to the grid when the page changes
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const openWatch = (anime) => {
    navigate(`/anime/${anime.id}/info`);
  };

  const [showStatusMenu, setShowStatusMenu] = useState(null);

  const toggleWishlist = (id) => {
    if (watchlist.some(i => String(i.id) === String(id))) {
      addNotification({ title: "Removed from Watchlist", type: "save" });
      setWatchlist(removeFromWatchlist(id));
    } else {
      setShowStatusMenu(id);
    }
  };

  const addWithStatus = (id, status) => {
    const anime = items.find(a => a.id === id);
    if (!anime) return;
    const item = { id: anime.id, name: anime.name, img: anime.img, rating: anime.rating, episodes: anime.episodes, year: anime.year, genres: anime.genres, status: anime.status, listStatus: status };
    addNotification({ title: "Added to Watchlist", body: anime.name, type: "save" });
    setWatchlist(addToWatchlist(item));
    setShowStatusMenu(null);
  };

  const resetAll = useCallback(() => {
    setSearch(""); setGenre(""); setFormat(""); setYear(""); setSeason("");
    setStatus(""); setTag(""); setCountry(""); setSource(""); setSort("POPULARITY_DESC");
  }, []);

  const activeCount = [genre, format, year, season, status, tag, country, source].filter(Boolean).length + (debouncedSearch ? 1 : 0);
  const lastPage = Math.max(1, pageInfo.lastPage || 1);

  // active filters as removable chips
  const sortLabel = SORTS.find(o => o.v === sort)?.l;
  const fmtLabel = FORMATS.find(o => o.v === format)?.l;
  const seasonLabel = SEASONS.find(o => o.v === season)?.l;
  const statusLabel = STATUSES.find(o => o.v === status)?.l;
  const countryLabel = COUNTRIES.find(o => o.v === country)?.l;
  const sourceLabel = SOURCES.find(o => o.v === source)?.l;
  const activePills = [
    debouncedSearch && { key: "q", label: `"${debouncedSearch}"`, clear: () => setSearch("") },
    genre && { key: "genre", label: genre, clear: () => setGenre("") },
    fmtLabel && { key: "format", label: fmtLabel, clear: () => setFormat("") },
    year && { key: "year", label: year, clear: () => setYear("") },
    seasonLabel && { key: "season", label: seasonLabel, clear: () => setSeason("") },
    statusLabel && { key: "status", label: statusLabel, clear: () => setStatus("") },
    tag && { key: "tag", label: tag, clear: () => setTag("") },
    countryLabel && { key: "country", label: countryLabel, clear: () => setCountry("") },
    sourceLabel && { key: "source", label: sourceLabel, clear: () => setSource("") },
  ].filter(Boolean);

  return (
    <AnimatedPage>
      <div className="br">
        <div className="br-bg-ornament" />
        <main className="br-shell">
          {/* ── Page header ── */}
          <header className="br-head">
            <div className="br-head-text">
              <span className="br-head-eyebrow">Discover</span>
              <h1 className="br-head-title">Browse Anime</h1>
              <p className="br-head-sub">Filter by genre, season, studio and more — find your next watch.</p>
            </div>
            {sortLabel && <span className="br-head-sort">Sorted by <strong>{sortLabel}</strong></span>}
          </header>

          {/* ── Filter grid ── */}
          <div className="br-filterbar">
            <div className="br-field br-field--search">
              <label className="br-field-label">Search</label>
              <div className="br-search">
                <Search size={15} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search anime..." />
              </div>
            </div>

            <Field label="Genres">
              <Select value={genre} onChange={setGenre}>
                <option value="">Any</option>
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </Field>
            <Field label="Format">
              <Select value={format} onChange={setFormat}>
                <option value="">Any</option>
                {FORMATS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </Field>
            <Field label="Year">
              <Select value={year} onChange={setYear}>
                <option value="">Any</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </Field>
            <Field label="Sort">
              <Select value={sort} onChange={setSort}>
                {SORTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </Field>

            <Field label="Season">
              <Select value={season} onChange={setSeason}>
                <option value="">Any</option>
                {SEASONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </Field>
            <Field label="Airing Status">
              <Select value={status} onChange={setStatus}>
                <option value="">Any</option>
                {STATUSES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </Field>
            <Field label="Tags">
              <Select value={tag} onChange={setTag}>
                <option value="">Any</option>
                {tags.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Country of Origin">
              <Select value={country} onChange={setCountry}>
                <option value="">Any</option>
                {COUNTRIES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </Field>
            <Field label="Source">
              <Select value={source} onChange={setSource}>
                <option value="">Any</option>
                {SOURCES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Select>
            </Field>
          </div>

          {/* ── Results + pagination ── */}
          <div className="br-resbar" ref={gridRef}>
            <div className="br-resbar-left">
              <span className="br-rescount">{(pageInfo.total || 0).toLocaleString()} Results</span>
              {activeCount > 0 && (
                <button className="br-clear" onClick={resetAll}>Clear filters</button>
              )}
            </div>
            <div className="br-pager">
              <button disabled={page <= 1} onClick={() => setPage(1)} aria-label="First page"><ChevronsLeft size={16} /></button>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
              <span className="br-page-cur">{page}</span>
              <button disabled={!pageInfo.hasNextPage} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
              <button disabled={page >= lastPage} onClick={() => setPage(lastPage)} aria-label="Last page"><ChevronsRight size={16} /></button>
            </div>
          </div>

          {/* ── Active filter chips ── */}
          {activePills.length > 0 && (
            <div className="br-chips">
              {activePills.map(p => (
                <button key={p.key} className="br-chip" onClick={p.clear}>
                  {p.label}
                  <X size={12} />
                </button>
              ))}
              <button className="br-chip br-chip--clear" onClick={resetAll}>Clear all</button>
            </div>
          )}

          {/* ── Grid ── */}
          {loading ? (
            <div className="br-grid">
              {Array.from({ length: 18 }).map((_, i) => (
                <div className="br-skel" key={i}>
                  <div className="br-skel-poster" />
                  <div className="br-skel-line" />
                  <div className="br-skel-line br-skel-line--short" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="br-empty">
              <Library size={36} />
              <h3>{error ? "Load Error" : "No matches"}</h3>
              <p>{error || "Try clearing a filter or widening your search."}</p>
              {error
                ? <button className="br-retry-btn" onClick={() => setRetryCount(c => c + 1)}>Retry</button>
                : activeCount > 0 && <button className="br-retry-btn" onClick={resetAll}>Clear filters</button>}
            </div>
          ) : (
            <motion.div
              className="br-grid"
              variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {items.map((anime) => (
                  <motion.article
                    key={anime.id}
                    className="br-card"
                    layout
                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                    whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/anime/${anime.id}/info`)}
                    onMouseEnter={() => prefetch.onMouseEnter(anime.id)}
                    onMouseLeave={prefetch.onMouseLeave}
                  >
                    <AnimeCard
                      anime={anime}
                      wishlist={watchlist}
                      onWishlist={toggleWishlist}
                      onWatch={openWatch}
                          watchingId={watchingId}
                      statusMenuOpen={showStatusMenu}
                      onAddWithStatus={(id, s) => s ? addWithStatus(id, s) : setShowStatusMenu(null)}
                    />
                  </motion.article>
                ))}
              </AnimatePresence>
            </motion.div>
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

function Field({ label, children }) {
  return (
    <div className="br-field">
      <label className="br-field-label">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, children }) {
  return (
    <div className="br-select-wrap">
      <select className="br-select" value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronRight size={14} className="br-select-arrow" />
    </div>
  );
}
