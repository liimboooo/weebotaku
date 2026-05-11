import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Star, Tv, Calendar, Sparkles, RotateCcw } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import AnimatedPage from "../components/AnimatedPage";
import Loader from "../components/Loader";
import Background from "../components/Background";
import { fetchSearchAnime, fetchAnimeGenres } from "../services/jikanApi";
import "./SearchPage.css";

gsap.registerPlugin(ScrollTrigger);

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [results, setResults] = useState([]);
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [activeType, setActiveType] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const types = ["All", "TV", "Movie", "Special", "OVA", "ONA"];
  const statuses = ["All", "Ongoing", "Completed"];

  useEffect(() => {
    fetchAnimeGenres().then(setGenres).catch(() => {});
  }, []);

  // If there's a query in URL, fetch on mount
  useEffect(() => {
    if (initialQuery.trim()) {
      doSearch(initialQuery, activeGenre, activeType, activeStatus);
    }
  }, []);

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

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalf = rating % 2 >= 1;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    return (
      <>
        {[...Array(fullStars)].map((_, i) => (<span key={`f-${i}`} className="star full">★</span>))}
        {hasHalf && <span className="star half">★</span>}
        {[...Array(emptyStars)].map((_, i) => (<span key={`e-${i}`} className="star empty">★</span>))}
      </>
    );
  };

  return (
    <AnimatedPage>
      <div className="search-page">
        <Background />

        <div className="discovery-header">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="discovery-sub"
          >
            {searchParams.get("q")
              ? <>Results for "<strong>{searchParams.get("q")}</strong>"</>
              : "Jump in — pick a genre or search from the header"}
          </motion.p>
        </div>

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
            <motion.div className="search-results-grid"
              initial="hidden" animate="visible"
              key={activeGenre + activeType + activeStatus}
            >
              {results.map((anime) => (
                <motion.div className="search-result-card" key={anime.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 12 }}
                  whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(230, 54, 54, 0.4)", borderColor: "#e63636" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/anime/${anime.id}`)}
                >
                  <div className="result-img-wrap">
                    <img src={anime.img} alt={anime.name} loading="lazy" />
                    <div className="result-overlay">
                      <div className="result-badges">
                        <span className="result-badge type">{anime.type || "TV"}</span>
                        <span className={`result-badge status ${(anime.status || "").toLowerCase()}`}>{anime.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="result-content">
                    <h3>{anime.name}</h3>
                    <div className="result-meta">
                      <Calendar size={12} /><span>{anime.year}</span><span>•</span>
                      <Tv size={12} /><span>{anime.episodes} eps</span>
                    </div>
                    <div className="result-rating">
                      <div className="stars">{renderStars(anime.rating)}</div>
                      <span className="rating-val">{anime.rating}</span>
                    </div>
                    <div className="result-genres">
                      {anime.genres?.slice(0, 2).map((g) => (
                        <span key={g} className="mini-genre">{g}</span>
                      ))}
                    </div>
                    <p className="result-desc">{anime.synopsis?.slice(0, 120) || ""}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
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
