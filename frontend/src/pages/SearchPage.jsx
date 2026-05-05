import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { searchAnime, getAllGenres, getAnimeType } from "../data/animeData";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, XCircle, Star, Tv, Calendar, Info } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import "./SearchPage.css";

gsap.registerPlugin(ScrollTrigger);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 20
    }
  }
};

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedSearches, setSavedSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("savedSearches") || "[]");
    } catch (e) {
      return [];
    }
  });
  const genres = ["All", ...getAllGenres()];
  const types = ["All", "TV", "Movie", "Special"];
  const statuses = ["All", "Ongoing", "Completed"];

  useGSAP(() => {
    // Grid items reveal on scroll - faster
    ScrollTrigger.batch(".search-result-card", {
      onEnter: (elements) => {
        gsap.from(elements, {
          y: 30,
          opacity: 0,
          stagger: 0.05,
          duration: 0.3,
          ease: "power2.out"
        });
      },
      once: true
    });
  }, { dependencies: [results] });

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      navigate(`/search?q=${encodeURIComponent(transcript)}`);
    };
    recognition.start();
  };

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      let filtered = searchAnime(query);
      if (activeGenre !== "All") {
        filtered = filtered.filter((a) =>
          a.genres.some((g) => g.toLowerCase() === activeGenre.toLowerCase())
        );
      }
      if (activeType !== "All") {
        filtered = filtered.filter((a) => getAnimeType(a) === activeType);
      }
      if (activeStatus !== "All") {
        filtered = filtered.filter((a) => a.status === activeStatus);
      }
      setResults(filtered);
      setIsLoading(false);
    }, 300); // Small debounce for performance

    return () => clearTimeout(timer);
  }, [query, activeGenre, activeType, activeStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalf = rating % 2 >= 1;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    return (
      <>
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="star full">★</span>
        ))}
        {hasHalf && <span className="star half">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="star empty">★</span>
        ))}
      </>
    );
  };

  const hasNextEpisode = (anime) => anime.status === "Ongoing" && anime.nextEpDate && anime.nextEpDate !== "Ended";

  return (
    <AnimatedPage>
      <div className="search-page">
        <Background />
        <Header />

        <motion.div 
          className="search-hero"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Search Anime
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Find your next obsession from our collection
          </motion.p>
          <motion.form 
            className="search-hero-form" 
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by title, genre, studio..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <div className="search-actions">
                {query && (
                  <button type="button" className="clear-btn" onClick={() => setQuery("")}>
                    <XCircle size={18} />
                  </button>
                )}
                <button 
                  type="button" 
                  className={`voice-search-btn ${isListening ? 'listening' : ''}`} 
                  onClick={startVoiceSearch}
                  title="Voice Search"
                >
                  <Mic size={18} />
                </button>
              </div>
            </div>
            <button type="submit" className="search-submit-btn">Search</button>
          </motion.form>
        </motion.div>

        <div className="genre-filter">
          {genres.map((genre) => (
            <button
              key={genre}
              className={`genre-pill ${activeGenre === genre ? "active" : ""}`}
              onClick={() => setActiveGenre(genre)}
              style={{ position: 'relative' }}
            >
              {activeGenre === genre && (
                <motion.div 
                  layoutId="active-pill"
                  className="active-pill-bg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{genre}</span>
            </button>
          ))}
        </div>

        <div className="filter-group">
          <div className="filter-row">
            <span className="filter-label">Type</span>
            <div className="filter-pills">
              {types.map((type) => (
                <button
                  key={type}
                  className={`filter-pill ${activeType === type ? "active" : ""}`}
                  onClick={() => setActiveType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-row">
            <span className="filter-label">Status</span>
            <div className="filter-pills">
              {statuses.map((status) => (
                <button
                  key={status}
                  className={`filter-pill ${activeStatus === status ? "active" : ""}`}
                  onClick={() => setActiveStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="saved-searches-row">
          <button
            className="save-search-btn"
            onClick={() => {
              const name = window.prompt("Name this saved search:");
              if (!name) return;
              const obj = { name, query, genre: activeGenre, type: activeType, status: activeStatus };
              const next = [obj, ...savedSearches];
              setSavedSearches(next);
              localStorage.setItem("savedSearches", JSON.stringify(next));
            }}
          >
            Save Search
          </button>

          {savedSearches.length > 0 && (
            <div className="saved-list">
              {savedSearches.map((s, i) => (
                <button
                  key={i}
                  className="saved-item"
                  onClick={() => {
                    setQuery(s.query || "");
                    setActiveGenre(s.genre || "All");
                    setActiveType(s.type || "All");
                    setActiveStatus(s.status || "All");
                    navigate(`/search?q=${encodeURIComponent(s.query || "")}`);
                  }}
                >
                  <span className="saved-name">{s.name}</span>
                  <span
                    className="saved-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = savedSearches.filter((_, idx) => idx !== i);
                      setSavedSearches(next);
                      localStorage.setItem("savedSearches", JSON.stringify(next));
                    }}
                  >
                    ✕
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="results-info">
        {isLoading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="search-loading"
          >
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
            Searching for anime...
          </motion.div>
        ) : (
          <>
            <span>{results.length} anime found</span>
            {query && <span className="results-query">for "{query}"</span>}
          </>
        )}
      </div>

        {results.length > 0 ? (
          <motion.div 
            className="search-results-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={activeGenre + query} // Re-animate on filter change
          >
            <AnimatePresence mode="popLayout">
              {results.map((anime) => (
                <motion.div
                  className="search-result-card"
                  key={anime.id}
                  variants={itemVariants}
                  exit="exit"
                  whileHover={{ 
                    y: -10, 
                    boxShadow: "0 20px 40px rgba(230, 54, 54, 0.4)",
                    borderColor: "#e63636"
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    const x = e.clientX;
                    const y = e.clientY;

                    if (document.startViewTransition) {
                      const img = e.currentTarget.querySelector('img');
                      const title = e.currentTarget.querySelector('h3');
                      
                      document.querySelectorAll('.search-result-card img, .search-result-card h3').forEach(el => {
                        el.style.viewTransitionName = '';
                      });

                      if (img) img.style.viewTransitionName = `anime-card-${anime.id}`;
                      if (title) title.style.viewTransitionName = `anime-title-${anime.id}`;
                      
                      const transition = document.startViewTransition(() => {
                        navigate(`/anime/${anime.id}`);
                      });

                      transition.ready.then(() => {
                        // GSAP Circle Reveal from click coordinates
                        gsap.fromTo(
                          document.documentElement,
                          {
                            '--reveal-radius': '0%',
                            '--reveal-x': `${x}px`,
                            '--reveal-y': `${y}px`,
                          },
                          {
                            '--reveal-radius': '100%',
                            duration: 1.2,
                            ease: "expo.inOut",
                          }
                        );
                      });
                    } else {
                      navigate(`/anime/${anime.id}`);
                    }
                  }}
                >
                  <div className="result-img-wrap">
                    <img src={anime.img} alt={anime.name} />
                    <div className="result-overlay">
                      <div className="result-badges">
                        <span className="result-badge type">{getAnimeType(anime)}</span>
                        <span className={`result-badge status ${anime.status.toLowerCase()}`}>
                          {anime.status}
                        </span>
                        {hasNextEpisode(anime) && (
                          <span className="result-badge next-ep">New Ep</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="result-content">
                    <h3>{anime.name}</h3>
                    <div className="result-meta">
                      <Calendar size={12} />
                      <span>{anime.year}</span>
                      <span>•</span>
                      <Tv size={12} />
                      <span>{anime.episodes} eps</span>
                    </div>
                    <div className="result-rating">
                      <div className="stars">{renderStars(anime.rating)}</div>
                      <span className="rating-val">{anime.rating}</span>
                    </div>
                    <div className="result-genres">
                      {anime.genres.slice(0, 2).map((g, i) => (
                        <motion.span 
                          key={g} 
                          className="mini-genre"
                          initial={{ opacity: 0, y: 5 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 * i }}
                        >
                          {g}
                        </motion.span>
                      ))}
                    </div>
                    <p className="result-desc">{anime.description}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : !isLoading ? (
          <motion.div 
            className="no-results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Search size={64} className="no-results-icon" />
            <h3>No results for "{query}"</h3>
            <p>Try checking your spelling or using different keywords</p>
            <div className="suggestion-box">
              <p>Try searching for:</p>
              <div className="suggestion-pills">
                {["Action", "Romance", "One Piece", "MAPPA"].map(s => (
                  <button key={s} onClick={() => setQuery(s)} className="suggest-pill">{s}</button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}

        <Footer />
      </div>
    </AnimatedPage>
  );
}
