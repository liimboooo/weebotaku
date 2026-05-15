import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Heart, Play, RotateCcw, Search, Sparkles, Star, TrendingUp, Clock, Tv, Zap, X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import AnimatedPage from "../components/AnimatedPage";
import Loader from "../components/Loader";
import Background from "../components/Background";
import { fetchSearchAnime, fetchTopAnime, fetchAnimeGenres } from "../services/jikanApi";
import { addToWatchlist, removeFromWatchlist, loadWatchlist } from "../services/storage";
import "./SearchPage.css";

gsap.registerPlugin(ScrollTrigger);

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState([]);
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [activeType, setActiveType] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [trendingData, setTrendingData] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("recentSearches") || "[]"); }
    catch { return []; }
  });
  const searchRef = useRef(null);

  const types = ["All", "TV", "Movie", "Special", "OVA", "ONA"];
  const statuses = ["All", "Ongoing", "Completed"];

  useEffect(() => {
    fetchAnimeGenres().then(setGenres).catch(() => {});
    setTrendingLoading(true);
    fetchTopAnime(1, "airing").then(r => {
      setTrendingData(r.data.slice(0, 8));
    }).catch(() => {}).finally(() => setTrendingLoading(false));
  }, []);

  // Re-run search when URL query changes
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
    if (q.trim()) {
      doSearch(q, activeGenre, activeType, activeStatus);
    } else {
      setHasSearched(false);
      setResults([]);
    }
  }, [searchParams.get("q")]);

  const doSearch = async (query, genre, type, status) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetchSearchAnime(query, 1);
      let filtered = res.data;
      if (genre) filtered = filtered.filter(a => a.genres.some(g => g.toLowerCase() === genre.toLowerCase()));
      if (type !== "All") filtered = filtered.filter(a => a.type === type);
      if (status !== "All") filtered = filtered.filter(a => a.status === status);
      setResults(filtered);
    } catch { setResults([]); }
    setIsLoading(false);
  };

  const handleGenreClick = (genre) => {
    const next = activeGenre === genre ? null : genre;
    setActiveGenre(next);
    const query = searchParams.get("q") || "";
    if (query) doSearch(query, next, activeType, activeStatus);
  };

  const handleTypeChange = (type) => {
    setActiveType(type);
    const query = searchParams.get("q") || "";
    if (query) doSearch(query, activeGenre, type, activeStatus);
  };

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    const query = searchParams.get("q") || "";
    if (query) doSearch(query, activeGenre, activeType, status);
  };

  const resetFilters = () => {
    setActiveGenre(null);
    setActiveType("All");
    setActiveStatus("All");
    const query = searchParams.get("q") || "";
    if (query) doSearch(query, null, "All", "All");
  };

  const hasActiveFilters = activeGenre || activeType !== "All" || activeStatus !== "All";

  const removeRecent = (term) => {
    const next = recentSearches.filter(s => s !== term);
    setRecentSearches(next);
    localStorage.setItem("recentSearches", JSON.stringify(next));
  };

  const searchFromPill = (term) => {
    const next = [term, ...recentSearches.filter(s => s !== term)].slice(0, 8);
    setRecentSearches(next);
    localStorage.setItem("recentSearches", JSON.stringify(next));
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  function getTrend(item) {
    const score = item.rating || 0;
    if (score > 8.0) {
      const num = 50 + (item.id % 200);
      return { arrow: '↑', value: `+${num}`, cls: 'up' };
    } else if (score >= 7.5) {
      return { arrow: '→', value: `${10 + (item.id % 40)}`, cls: 'neutral' };
    } else {
      const num = 10 + (item.id % 50);
      return { arrow: '↓', value: `-${num}`, cls: 'down' };
    }
  }

  useGSAP(() => {
    ScrollTrigger.batch(".search-result-card", {
      onEnter: (elements) => {
        gsap.from(elements, {
          y: 30, opacity: 0, stagger: 0.05, duration: 0.3, ease: "power2.out"
        });
      },
      once: true
    });
  }, { dependencies: [results] });

  return (
    <AnimatedPage>
      <div className="search-page">
        <Background />

        <div className="discovery-header">
          <div className="search-page-input-wrap">
            <Search size={16} className="search-page-input-icon" />
            <input
              ref={searchRef}
              className="search-page-input"
              placeholder="Search anime..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  searchFromPill(query.trim());
                }
              }}
              autoFocus
            />
            {query && (
              <button className="search-page-input-clear" onClick={() => { setQuery(''); searchRef.current?.focus(); }}>
                <X size={14} />
              </button>
            )}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="discovery-sub"
          >
            {searchParams.get("q")
              ? <>Results for "<strong>{searchParams.get("q")}</strong>"</>
              : "Jump in — pick a genre or search above"}
          </motion.p>
        </div>

        {!searchParams.get("q") && (
          <div className="search-discovery">
            {recentSearches.length > 0 && (
              <div className="sd-section">
                <div className="sd-header">
                  <Clock size={16} /> Recent Searches
                </div>
                <div className="sd-pills">
                  {recentSearches.map((s) => (
                    <button key={s} className="sd-pill" onClick={() => searchFromPill(s)}>
                      <span>{s}</span>
                      <span className="sd-pill-remove" onClick={(e) => { e.stopPropagation(); removeRecent(s); }}>✕</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="sd-section">
              <div className="sd-header">
                <TrendingUp size={16} /> Trending Now
              </div>
              <div className="sd-pills">
                {trendingLoading ? (
                  [1,2,3,4,5,6,7,8].map(i => <div key={i} className="sd-skeleton" />)
                ) : (
                  trendingData.map((anime) => {
                    const t = getTrend(anime);
                    const label = anime.name && anime.name.length > 28 ? anime.name.slice(0, 26) + '...' : (anime.name || 'Unknown');
                    return (
                      <button key={anime.id} className="sd-pill" onClick={() => searchFromPill(anime.name)}>
                        <span>{label}</span>
                        <span className={`trending-indicator ${t.cls}`}>{t.arrow} {t.value}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <div className="genre-filter">
          {genres.map((genre) => (
            <button
              key={genre}
              className={`genre-pill ${activeGenre === genre ? "active" : ""}`}
              onClick={() => handleGenreClick(genre)}
            >
              {genre}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <div className="filter-row">
            <span className="filter-label">Type</span>
            <div className="filter-pills">
              {types.map((type) => (
                <button key={type} className={`filter-pill ${activeType === type ? "active" : ""}`}
                  onClick={() => handleTypeChange(type)}>{type}</button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-label">Status</span>
            <div className="filter-pills">
              {statuses.map((status) => (
                <button key={status} className={`filter-pill ${activeStatus === status ? "active" : ""}`}
                  onClick={() => handleStatusChange(status)}>{status}</button>
              ))}
            </div>
          </div>
          {hasActiveFilters && (
            <button className="reset-filters-btn" onClick={resetFilters}>
              <RotateCcw size={14} /> Reset Filters
            </button>
          )}
        </div>

        <div className="results-info">
          {isLoading ? (<Loader text="Searching..." />) : hasSearched ? (
            <><span>{results.length} anime found</span></>
          ) : null}
        </div>

        {results.length > 0 ? (
          <>
            <div className="sr-grid"
              key={activeGenre + activeType + activeStatus}
            >
              {results.map((anime) => {
                const wishlist = loadWatchlist();
                const inList = wishlist.some(i => i.id === anime.id);
                return (
                  <motion.div className="sr-card" key={anime.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 12 }}
                    whileHover={{ y: -8 }}
                    onClick={() => navigate(`/anime/${anime.id}`)}
                  >
                    <div className="sr-card-thumb">
                      <img src={anime.img} alt={anime.name} loading="lazy" />
                      <div className="sr-card-overlay">
                        <button className="sr-card-play" onClick={(e) => { e.stopPropagation(); navigate(`/anime/${anime.id}`); }}>
                          <Play size={20} fill="currentColor" />
                        </button>
                        <div className="sr-card-tech">
                          <span>{anime.episodes} eps</span>
                          <span>{anime.type || "TV"}</span>
                        </div>
                      </div>
                      <div className="sr-card-badge">
                        {anime.status === "Ongoing" && <Zap size={10} />}
                        {anime.status || "Unknown"}
                      </div>
                      <div className="sr-card-progress" style={{ width: `${Math.round((anime.readProgress || 0) * 100)}%` }} />
                    </div>
                    <div className="sr-card-body">
                      <div className="sr-card-head">
                        <h3>{anime.name}</h3>
                        <button className={`sr-wish-btn ${inList ? "active" : ""}`} onClick={(e) => {
                          e.stopPropagation();
                          if (inList) { removeFromWatchlist(anime.id); } else { addToWatchlist(anime); }
                        }}>
                          <Heart size={12} fill={inList ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <p className="sr-card-desc">{anime.synopsis || ""}</p>
                      <div className="sr-card-foot">
                        <span className="sr-card-rating"><Star size={10} fill="currentColor" /> {anime.rating?.toFixed(1)}</span>
                        <span className="sr-card-ch"><Play size={10} /> {anime.episodes} eps</span>
                        {anime.genres?.[0] && <span className="sr-card-tag">{anime.genres[0]}</span>}
                      </div>
                    </div>
                    <div className="sr-card-glow" />
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : !isLoading && hasSearched ? (
          <motion.div className="no-results" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Search size={64} className="no-results-icon" />
            <h3>No results</h3>
            <p>Try a different genre or type</p>
          </motion.div>
        ) : !hasSearched ? (
          <motion.div className="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Sparkles size={48} className="no-results-icon" />
            <h3>Discover Anime</h3>
            <p>Select a genre above or search from the header to get started</p>
          </motion.div>
        ) : null}
      </div>
    </AnimatedPage>
  );
}
