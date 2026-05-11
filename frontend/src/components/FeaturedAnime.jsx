import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Bookmark, Star, Calendar } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { addToWatchlist, removeFromWatchlist, isInWatchlist, loadWatchlist } from "../services/storage";
import { getAnimeType } from "../data/animeData";
import "./FeaturedAnime.css";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05 // Reduced from 0.08
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "tween", // Changed from spring for better performance
      duration: 0.3
    }
  },
  exit: {
    y: -20,
    opacity: 0,
    scale: 0.95,
    transition: {
      type: "tween",
      duration: 0.25
    }
  }
};

const isAiringToday = (anime) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return anime.airingDay === today;
};

const hasNextEpisode = (anime) => anime.status === "Ongoing" && anime.nextEpDate && anime.nextEpDate !== "Ended";

// Throttle function to limit animation calls
const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

export default function FeaturedAnime({ animeList }) {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    const stored = loadWatchlist().map(i => i.id);
    setWatchlist(stored);
  }, []);

  const isWatchlisted = (id) => watchlist.includes(id);

  const toggleWatchlist = (e, anime) => {
    e.stopPropagation();
    const animeId = anime.id;
    if (isInWatchlist(animeId)) {
      removeFromWatchlist(animeId);
      setWatchlist(prev => prev.filter(id => id !== animeId));
    } else {
      addToWatchlist(anime);
      setWatchlist(prev => [...prev, animeId]);
    }
  };

  const handleMouseMove = useCallback(throttle((e, card) => {
    // Performance check: skip if reduced motion is preferred
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;

    gsap.to(currentTarget, {
      rotateY: x * 12,
      rotateX: -y * 12,
      transformPerspective: 1200,
      ease: "power2.out",
      duration: 0.5,
      overwrite: true
    });
  }, 50), [watchlist]);

  const handleMouseLeave = useCallback((e) => {
    gsap.to(e.currentTarget, {
      rotateY: 0,
      rotateX: 0,
      ease: "power2.out",
      duration: 0.5,
      overwrite: true
    });
  }, []);

  return (
    <section className="featured-section">
      <motion.div
        className="anime-grid"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        <AnimatePresence mode="popLayout">
          {animeList.map((anime) => (
            <motion.div
              className="anime-card"
              key={anime.id}
              variants={itemVariants}
              exit="exit"
              onMouseMove={(e) => handleMouseMove(e, anime)}
              onMouseLeave={handleMouseLeave}
              whileHover={{
                y: -12,
                transition: { duration: 0.3, ease: "easeOut" }
              }}
              whileTap={{ scale: 0.97 }}
              onClick={(e) => {
                const x = e.clientX;
                const y = e.clientY;

                if (document.startViewTransition) {
                  const img = e.currentTarget.querySelector('img');
                  const title = e.currentTarget.querySelector('h3');

                  document.querySelectorAll('.anime-card img, .anime-card h3').forEach(el => {
                    el.style.viewTransitionName = '';
                  });

                  if (img) img.style.viewTransitionName = `anime-card-${anime.id}`;
                  if (title) title.style.viewTransitionName = `anime-title-${anime.id}`;

                  const transition = document.startViewTransition(() => {
                    navigate(`/anime/${anime.id}`);
                  });

                  transition.ready.then(() => {
                    const endRadius = Math.hypot(
                      Math.max(x, window.innerWidth - x),
                      Math.max(y, window.innerHeight - y)
                    );

                    // GSAP Circle Reveal with smoother easing
                    gsap.fromTo(
                      document.documentElement,
                      {
                        '--reveal-radius': '0%',
                        '--reveal-x': `${x}px`,
                        '--reveal-y': `${y}px`,
                      },
                      {
                        '--reveal-radius': '110%',
                        duration: 0.8,
                        ease: "power3.inOut",
                      }
                    );
                  });
                } else {
                  navigate(`/anime/${anime.id}`);
                }
              }}
            >
              <div className="card-img-wrapper">
                <img src={anime.img} alt={anime.name} />
                <div className="card-overlay">
                  <div className="play-btn-circle">
                    <Play fill="white" size={24} />
                  </div>
                </div>
                <button
                  className={`quick-watchlist-btn ${isWatchlisted(anime.id) ? 'active' : ''}`}
                  onClick={(e) => toggleWatchlist(e, anime)}
                >
                  <Bookmark
                    size={18}
                    fill={isWatchlisted(anime.id) ? "white" : "transparent"}
                    color={isWatchlisted(anime.id) ? "white" : "white"}
                  />
                </button>
                <div className="card-badges">
                  <div className="badges-left">
                    <span className="badge type">
                      {getAnimeType(anime)}
                    </span>
                    {anime.rating && (
                      <span className="badge rating">
                        <Star size={10} fill="#ffd700" color="#ffd700" /> {anime.rating}
                      </span>
                    )}
                  </div>
                  <div className="badges-right">
                    {isAiringToday(anime) && (
                      <span className="badge airing-today">New Ep</span>
                    )}
                    {!isAiringToday(anime) && hasNextEpisode(anime) && (
                      <span className="badge next-ep">
                        <Calendar size={10} /> Next Ep
                      </span>
                    )}
                    {anime.episodes && <span className="badge eps">{anime.episodes} EP</span>}
                  </div>
                </div>
              </div>
              <div className="card-info">
                <h3>{anime.name}</h3>
                <div className="card-meta">
                  <span className="meta-year">{anime.year}</span>
                  <span className={`meta-status ${anime.status?.toLowerCase()}`}>{anime.status}</span>
                </div>
                <div className="card-genres">
                  {anime.genres ? anime.genres.slice(0, 2).map((genre, i) => (
                    <motion.span
                      key={i}
                      className="genre-tag-mini"
                      initial={{ opacity: 0, y: 5 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + (i * 0.1) }}
                    >
                      {genre}
                    </motion.span>
                  )) : (
                    <span className="genre-tag-mini">Anime</span>
                  )}
                </div>
                <div className="card-extra-info">
                  {anime.episodes && <span className="extra-info-item">📺 {anime.episodes} EP</span>}
                  {anime.studio && <span className="extra-info-item">🎬 {anime.studio}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
