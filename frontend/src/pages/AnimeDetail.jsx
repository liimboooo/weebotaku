import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, Play, Bookmark, Heart, Share2, Tv, ShieldCheck, Bell, Sparkles, Star } from "lucide-react";
import { getAnimeById, getAllAnime } from "../data/animeData";
import { fetchAnimeById as jikanFetchAnime } from "../services/jikanApi";

import { addToWatchlist, removeFromWatchlist, isInWatchlist, rateAnime as syncRateAnime, toggleLikeAnime, addToWatchHistory } from "../services/storage";
import { addNotification } from "../services/notificationService";
import { findStreamingSource } from "../services/animeApi";
import AnimeWatch from "./Feeds/AnimeWatch";
import Background from "../components/Background";
import Reviews from "../components/Reviews";
import AnimatedPage from "../components/AnimatedPage";
import "./AnimeDetail.css";

export default function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedEp, setSelectedEp] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [watchAnime, setWatchAnime] = useState(null);
  const [watchLoading, setWatchLoading] = useState(false);
  const [watcherror, setWatchError] = useState("");
  const [jikanAnime, setJikanAnime] = useState(null);
  const [bgLoaded, setBgLoaded] = useState(false);

  const staticAnime = getAnimeById(parseInt(id));
  const anime = jikanAnime || staticAnime;

  useEffect(() => {
    if (!staticAnime) {
      jikanFetchAnime(parseInt(id)).then(setJikanAnime).catch(() => {});
    }
  }, [id, staticAnime]);

  // Related anime (same genres, ranked by overlap + rating)
  const getRelatedAnime = () => {
    const allAnime = getAllAnime();
    return allAnime
      .filter(a => a.id !== parseInt(id))
      .map(a => ({
        ...a,
        _overlap: anime ? a.genres.filter(g => anime.genres.includes(g)).length : 0,
      }))
      .filter(a => a._overlap > 0)
      .sort((a, b) => b._overlap - a._overlap || b.rating - a.rating)
      .slice(0, 6);
  };

  useEffect(() => {
    setIsWatchlisted(isInWatchlist(parseInt(id)));

    const storedFollowing = JSON.parse(localStorage.getItem("followingAnime") || "[]");
    setIsFollowing(storedFollowing.some(f => f.animeId === parseInt(id)));

    const storedLikes = JSON.parse(localStorage.getItem("likedAnime") || "[]");
    setIsLiked(storedLikes.includes(parseInt(id)));

    const storedRatings = JSON.parse(localStorage.getItem("userRatings") || "{}");
    if (storedRatings[id]) {
      setUserRating(storedRatings[id]);
    }

    window.scrollTo(0, 0);
  }, [id]);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from(".hero-bg", {
      scale: 1.3,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out"
    })
    .from(".detail-poster", {
      x: -50,
      opacity: 0,
      duration: 0.5,
      ease: "power2.out"
    }, "-=0.5")
    .from(".detail-content > *", {
      y: 20,
      opacity: 0,
      stagger: 0.05,
      duration: 0.4,
      ease: "power2.out"
    }, "-=0.3");

    // Simplified parallax - disabled for performance
  }, { dependencies: [id] });

  useEffect(() => {
    if (showPlayer) {
      const storedHistory = JSON.parse(localStorage.getItem("watchHistory") || "[]");
      const newItem = {
        animeId: parseInt(id),
        episode: selectedEp,
        timestamp: Date.now()
      };

      const filteredHistory = storedHistory.filter(item => item.animeId !== parseInt(id));
      localStorage.setItem("watchHistory", JSON.stringify([newItem, ...filteredHistory].slice(0, 50)));
      // Sync to backend
      addToWatchHistory(parseInt(id), selectedEp, anime?.name, anime?.img);
    }
  }, [showPlayer, selectedEp, id]);

  const toggleWatchlist = () => {
    const animeId = parseInt(id);
    if (isInWatchlist(animeId)) {
      removeFromWatchlist(animeId);
      addNotification({ title: "Removed from Watchlist", body: anime.name, type: "save" });
    } else {
      addToWatchlist(anime);
      addNotification({ title: "Added to Watchlist", body: anime.name, type: "save" });
    }
    setIsWatchlisted(!isWatchlisted);
  };

  const toggleLiked = () => {
    const stored = JSON.parse(localStorage.getItem("likedAnime") || "[]");
    const animeId = parseInt(id);
    let updated;
    if (stored.includes(animeId)) {
      updated = stored.filter((lId) => lId !== animeId);
    } else {
      updated = [...stored, animeId];
      addNotification({ title: "Liked", body: anime.name, type: "follow" });
    }
    localStorage.setItem("likedAnime", JSON.stringify(updated));
    setIsLiked(!isLiked);
    // Sync to backend
    toggleLikeAnime(parseInt(id));
  };

  const toggleFollowing = () => {
    const stored = JSON.parse(localStorage.getItem("followingAnime") || "[]");
    const animeId = parseInt(id);
    let updated;
    if (isFollowing) {
      updated = stored.filter((f) => f.animeId !== animeId);
      addNotification({ title: "Unfollowed", body: anime.name, type: "follow" });
    } else {
      updated = [...stored, {
        animeId: animeId,
        animeName: anime.name,
        animeImg: anime.img,
        followedAt: Date.now(),
        unreadUpdates: 0,
        lastUpdate: Date.now()
      }];
      addNotification({ title: "Following", body: anime.name, type: "follow" });
    }
    localStorage.setItem("followingAnime", JSON.stringify(updated));
    setIsFollowing(!isFollowing);
  };

  const handleRate = (rating) => {
    const storedRatings = JSON.parse(localStorage.getItem("userRatings") || "{}");
    storedRatings[id] = rating;
    localStorage.setItem("userRatings", JSON.stringify(storedRatings));
    setUserRating(rating);
    // Sync to backend
    syncRateAnime(id, rating);
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

  if (!anime) {
    if (!staticAnime && jikanAnime === null) {
      return (
        <AnimatedPage>
          <div className="anime-detail-page">
            <Background />
            <div className="detail-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#888' }}>
              <p>Loading anime details...</p>
            </div>
          </div>
        </AnimatedPage>
      );
    }
    return (
      <AnimatedPage>
        <div className="anime-detail-page">
          <Background />
          <div className="detail-error">
            <h2>Anime not found</h2>
            <button onClick={() => navigate(-1)}>Go back</button>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="ad">
        <Background />
        <div className="ad-bg-ornament" />

        <main className="ad-shell">
          <motion.section className="ad-hero" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className={`ad-hero-bg ${bgLoaded ? "loaded" : "loading"}`} style={{ backgroundImage: `url(${anime.img})` }} />
            <img src={anime.img} alt="" style={{ display: "none" }} onLoad={() => setBgLoaded(true)} />
            <div className="ad-hero-gradient" />
            <div className="ad-hero-content">
              <button className="ad-back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} /> Back
              </button>
              <span className="ad-eyebrow"><Sparkles size={14} /> ANIME DETAIL</span>
              <h1>
                <span className="ad-hero-main">{anime.name}</span>
              </h1>
              <p className="ad-hero-desc">{anime.synopsis}</p>
              <div className="ad-hero-metrics">
                <div className="ad-metric"><strong>{anime.episodes || "?"}</strong><span>Episodes</span></div>
                <div className="ad-metric"><strong>{anime.rating?.toFixed(1) || "?"}</strong><span>Rating</span></div>
                <div className="ad-metric"><strong>{anime.year || "?"}</strong><span>Year</span></div>
                <div className="ad-metric"><strong>{anime.studio || "?"}</strong><span>Studio</span></div>
              </div>
            </div>
            <div className="ad-hero-hud">
              <div className="ad-hud-img"><img src={anime.img} alt={anime.name} /></div>
              <div className="ad-hud-info">
                <span className="ad-hud-label">{anime.status || "Unknown"}</span>
                <span className="ad-hud-title">{anime.name}</span>
                <span className="ad-hud-rating"><Star size={12} fill="currentColor" /> {anime.rating?.toFixed(1) || "?"}</span>
              </div>
            </div>
          </motion.section>

          <section className="ad-body">
            <div className="ad-body-grid">
              <div className="ad-body-left">
                <div className="ad-poster">
                  <img src={anime.img} alt={anime.name} />
                </div>
              </div>
              <div className="ad-body-right">
                <div className="ad-rating-section">
                  <div className="ad-global-rating">
                    <div className="ad-stars">{renderStars(anime.rating)}</div>
                    <span className="ad-rating-value">{anime.rating}/10</span>
                    <span className="ad-votes">({anime.votes?.toLocaleString() || 0} votes)</span>
                  </div>
                  <div className="ad-user-rating">
                    <span className="ad-user-rating-label">Your Rating:</span>
                    <div className="ad-user-stars">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <span
                          key={num}
                          className={`ad-user-star ${userRating >= num ? "active" : ""}`}
                          onClick={() => handleRate(num)}
                        >★</span>
                      ))}
                      <span className="ad-user-rating-val">{userRating > 0 ? `${userRating}/10` : ""}</span>
                    </div>
                  </div>
                </div>

                <div className="ad-meta-grid">
                  <div className="ad-meta-item"><span className="ad-meta-label">Season</span><span className="ad-meta-value">{anime.season}</span></div>
                  <div className="ad-meta-item"><span className="ad-meta-label">Episodes</span><span className="ad-meta-value">{anime.episodes}</span></div>
                  <div className="ad-meta-item"><span className="ad-meta-label">Year</span><span className="ad-meta-value">{anime.year}</span></div>
                  <div className="ad-meta-item"><span className="ad-meta-label">Studio</span><span className="ad-meta-value">{anime.studio}</span></div>
                </div>

                <div className="ad-genres">
                  {anime.genres?.map((genre) => (
                    <span key={genre} className="ad-genre-tag">{genre}</span>
                  ))}
                </div>

                <div className="ad-synopsis">
                  <h3>Synopsis</h3>
                  <p>{anime.synopsis}</p>
                </div>

                <div className="ad-actions">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="ad-btn ad-btn-primary" onClick={async () => {
                    setWatchError("");
                    if (watchAnime) { setShowPlayer(true); return; }
                    setWatchLoading(true);
                    try {
                      const src = await findStreamingSource(anime.name);
                      if (src) {
                        setWatchAnime(src);
                        setShowPlayer(true);
                        addNotification({ title: "Now Playing", body: anime.name, type: "watch" });
                      } else { setWatchError("No streaming source found for this title."); }
                    } catch (e) { setWatchError("Failed to find streaming source."); }
                    finally { setWatchLoading(false); }
                  }} disabled={watchLoading}>
                    <Play size={18} fill="currentColor" /> {watchLoading ? "Searching..." : "Watch Now"}
                  </motion.button>
                  {watcherror && <p className="ad-error-msg">{watcherror}</p>}
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`ad-btn ad-btn-secondary ${isWatchlisted ? "active" : ""}`} onClick={toggleWatchlist}>
                    <Bookmark size={18} fill={isWatchlisted ? "currentColor" : "none"} /> {isWatchlisted ? "Saved" : "Save"}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`ad-btn ad-btn-secondary ${isFollowing ? "active" : ""}`} onClick={toggleFollowing}>
                    <Bell size={18} fill={isFollowing ? "currentColor" : "none"} /> {isFollowing ? "Following" : "Follow"}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`ad-btn ad-btn-secondary ${isLiked ? "active" : ""}`} onClick={toggleLiked}>
                    <Heart size={18} fill={isLiked ? "#e63636" : "none"} color={isLiked ? "#e63636" : "currentColor"} />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="ad-btn ad-btn-icon" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                    <Share2 size={16} />
                  </motion.button>
                </div>
              </div>
            </div>

            {showPlayer && watchAnime && (
              <AnimeWatch anime={watchAnime} onClose={() => setShowPlayer(false)} />
            )}

            {anime.director && (
              <div className="ad-extra">
                <div className="ad-extra-item"><span className="ad-extra-label">Director</span><span className="ad-extra-value">{anime.director}</span></div>
                <div className="ad-extra-item"><span className="ad-extra-label">Studio</span><span className="ad-extra-value">{anime.studio}</span></div>
              </div>
            )}

            <Reviews animeId={anime.id} selectedEp={selectedEp} />
          </section>
        </main>
      </div>
    </AnimatedPage>
  );
}
