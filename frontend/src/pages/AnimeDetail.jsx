import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Bookmark, Heart, Share2, Bell, Star, Tv, Film, Users, MessageSquare } from "lucide-react";
import { getAnimeById, getCoursForAnime, isEpisodeAvailable } from "../data/animeData";
import { fetchAnimeById as jikanFetchAnime, fetchAnimeCharacters, fetchAnimeRecommendations } from "../services/jikanApi";

import { addToWatchlist, removeFromWatchlist, isInWatchlist, rateAnime as syncRateAnime, toggleLikeAnime, addToWatchHistory } from "../services/storage";
import { addNotification } from "../services/notificationService";
import { findStreamingSource } from "../services/animeApi";
import AnimeWatch from "./Feeds/AnimeWatch";
import Background from "../components/Background";
import Reviews from "../components/Reviews";
import AnimatedPage from "../components/AnimatedPage";
import "./AnimeDetail.css";

const TABS = [
  { key: "episodes", label: "Episodes", icon: Tv },
  { key: "characters", label: "Characters", icon: Users },
  { key: "recommendations", label: "Recommendations", icon: Film },
  { key: "reviews", label: "Reviews", icon: MessageSquare },
];

export default function AnimeDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const staticAnime = getAnimeById(parseInt(id));
  const [jikanAnime, setJikanAnime] = useState(null);
  const [characters, setCharacters] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [jikanError, setJikanError] = useState("");

  const [activeTab, setActiveTab] = useState("episodes");
  const [selectedEp, setSelectedEp] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);

  const [watchAnime, setWatchAnime] = useState(null);
  const [watchLoading, setWatchLoading] = useState(false);
  const [watchError, setWatchError] = useState("");

  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const anime = jikanAnime || staticAnime;
  const malId = staticAnime?.malId || parseInt(id);
  const totalEps = anime?.episodes || 12;
  const cours = useMemo(() => getCoursForAnime(anime), [anime]);

  useEffect(() => {
    const epFromUrl = searchParams.get("ep");
    if (epFromUrl) { setSelectedEp(Number(epFromUrl)); return; }
    const history = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    const found = history.find((h) => h.animeId === parseInt(id));
    if (found) setSelectedEp(found.episode);
  }, [id, searchParams]);

  useEffect(() => {
    setJikanError("");
    if (!staticAnime) {
      const timeout = setTimeout(() => setJikanError("Failed to load anime details. Check your connection."), 15000);
      jikanFetchAnime(malId).then((r) => { clearTimeout(timeout); setJikanAnime(r); }).catch(() => { clearTimeout(timeout); setJikanError("Could not load this anime. It may not be available."); });
    }
    fetchAnimeCharacters(malId).then(setCharacters).catch(() => {});
    fetchAnimeRecommendations(malId).then(setRecommendations).catch(() => {});
  }, [id, staticAnime, malId]);

  useEffect(() => {
    setIsWatchlisted(isInWatchlist(parseInt(id)));
    const sf = JSON.parse(localStorage.getItem("followingAnime") || "[]");
    setIsFollowing(sf.some((f) => f.animeId === parseInt(id)));
    const sl = JSON.parse(localStorage.getItem("likedAnime") || "[]");
    setIsLiked(sl.includes(parseInt(id)));
    const sr = JSON.parse(localStorage.getItem("userRatings") || "{}");
    if (sr[id]) setUserRating(sr[id]);
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (showPlayer) {
      const storedHistory = JSON.parse(localStorage.getItem("watchHistory") || "[]");
      const filteredHistory = storedHistory.filter((item) => item.animeId !== parseInt(id));
      localStorage.setItem("watchHistory", JSON.stringify([{ animeId: parseInt(id), episode: selectedEp, timestamp: Date.now() }, ...filteredHistory].slice(0, 50)));
      addToWatchHistory(parseInt(id), selectedEp, anime?.name, anime?.img);
    }
  }, [showPlayer, selectedEp, id, anime]);

  const episodeNumbers = useMemo(() => {
    const count = totalEps && totalEps < 300 ? totalEps : 12;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [totalEps]);

  const handleWatch = async (ep) => {
    if (ep !== undefined) setSelectedEp(ep);
    setWatchError("");
    if (watchAnime) { setShowPlayer(true); return; }
    setWatchLoading(true);
    try {
      const src = await findStreamingSource(anime.name);
      if (src) {
        setWatchAnime(src);
        setShowPlayer(true);
        addNotification({ title: "Now Playing", body: anime.name, type: "watch" });
      } else {
        setWatchError("No streaming source available. Try again or check back later.");
      }
    } catch {
      setWatchError("Failed to find streaming source.");
    } finally {
      setWatchLoading(false);
    }
  };

  const handleRetry = () => {
    setWatchError("");
    setWatchLoading(true);
    findStreamingSource(anime.name).then((src) => {
      if (src) { setWatchAnime(src); setShowPlayer(true); addNotification({ title: "Now Playing", body: anime.name, type: "watch" }); }
      else setWatchError("No streaming source available.");
    }).catch(() => setWatchError("Failed to find streaming source."))
    .finally(() => setWatchLoading(false));
  };

  const toggleWatchlist = () => {
    const aid = parseInt(id);
    if (isInWatchlist(aid)) { removeFromWatchlist(aid); addNotification({ title: "Removed from Watchlist", body: anime.name, type: "save" }); }
    else { addToWatchlist(anime); addNotification({ title: "Added to Watchlist", body: anime.name, type: "save" }); }
    setIsWatchlisted(!isWatchlisted);
  };

  const toggleLiked = () => {
    const stored = JSON.parse(localStorage.getItem("likedAnime") || "[]");
    const aid = parseInt(id);
    if (stored.includes(aid)) { localStorage.setItem("likedAnime", JSON.stringify(stored.filter((l) => l !== aid))); }
    else { localStorage.setItem("likedAnime", JSON.stringify([...stored, aid])); addNotification({ title: "Liked", body: anime.name, type: "follow" }); }
    setIsLiked(!isLiked);
    toggleLikeAnime(aid);
  };

  const toggleFollowing = () => {
    const stored = JSON.parse(localStorage.getItem("followingAnime") || "[]");
    const aid = parseInt(id);
    if (isFollowing) {
      localStorage.setItem("followingAnime", JSON.stringify(stored.filter((f) => f.animeId !== aid)));
      addNotification({ title: "Unfollowed", body: anime.name, type: "follow" });
    } else {
      localStorage.setItem("followingAnime", JSON.stringify([...stored, { animeId: aid, animeName: anime.name, animeImg: anime.img, followedAt: Date.now(), unreadUpdates: 0, lastUpdate: Date.now() }]));
      addNotification({ title: "Following", body: anime.name, type: "follow" });
    }
    setIsFollowing(!isFollowing);
  };

  const handleRate = (rating) => {
    const sr = JSON.parse(localStorage.getItem("userRatings") || "{}");
    sr[id] = rating;
    localStorage.setItem("userRatings", JSON.stringify(sr));
    setUserRating(rating);
    syncRateAnime(id, rating);
  };

  if (!anime) {
    if (!staticAnime && jikanAnime === null) {
      return (
        <AnimatedPage>
          <div className="anime-detail-page">
            <Background />
            <div className="ad-loading">
              {jikanError ? (
                <>
                  <p style={{ color: "#e63636", fontSize: 18, textAlign: "center" }}>{jikanError}</p>
                  <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#fff", cursor: "pointer" }}>Go back</button>
                </>
              ) : (
                <>
                  <div className="ad-loading-pulse" />
                  <div className="ad-loading-pulse" />
                  <div className="ad-loading-pulse" />
                </>
              )}
            </div>
          </div>
        </AnimatedPage>
      );
    }
    return (
      <AnimatedPage>
        <div className="anime-detail-page">
          <Background />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
            <h2 style={{ color: "#888" }}>Anime not found</h2>
            <button onClick={() => navigate(-1)} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#fff", cursor: "pointer" }}>Go back</button>
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
          {/* ─── COMPACT HERO ─── */}
          <motion.section className="ad-hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className={`ad-hero-bg ${bgLoaded ? "loaded" : "loading"}`} style={{ backgroundImage: `url(${anime.img})` }} />
            <img src={anime.img} alt="" style={{ display: "none" }} onLoad={() => setBgLoaded(true)} />
            <div className="ad-hero-gradient" />
            <div className="ad-hero-content">
              <div className="ad-hero-left">
                <button className="ad-back-btn" onClick={() => navigate(-1)}>
                  <ArrowLeft size={18} /> Back
                </button>
                <h1 className="ad-hero-title">{anime.name}</h1>
                <p className="ad-hero-synopsis">{anime.synopsis}</p>
                <div className="ad-hero-metrics">
                  <div className="ad-metric"><Tv size={14} /> <strong>{anime.episodes || "?"}</strong> Episodes</div>
                  <div className="ad-metric"><Star size={14} /> <strong>{anime.rating?.toFixed(1) || "?"}</strong></div>
                  <div className="ad-metric"><span role="img" aria-label="year">📅</span> <strong>{anime.year || "?"}</strong></div>
                  <div className="ad-metric"><span role="img" aria-label="studio">🎬</span> <strong>{anime.studio || "?"}</strong></div>
                </div>
              </div>
              <div className="ad-hero-right">
                <motion.button
                  className="ad-hero-watch-btn"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleWatch(selectedEp)}
                  disabled={watchLoading}
                >
                  <Play size={20} fill="currentColor" />
                  {watchLoading ? "Searching..." : "Watch Now"}
                </motion.button>
                <div className="ad-hero-actions">
                  <button className={`ad-hero-action-btn ${isWatchlisted ? "active" : ""}`} onClick={toggleWatchlist} title={isWatchlisted ? "Saved" : "Save"}>
                    <Bookmark size={16} fill={isWatchlisted ? "currentColor" : "none"} />
                  </button>
                  <button className={`ad-hero-action-btn ${isFollowing ? "active" : ""}`} onClick={toggleFollowing} title={isFollowing ? "Following" : "Follow"}>
                    <Bell size={16} fill={isFollowing ? "currentColor" : "none"} />
                  </button>
                  <button className={`ad-hero-action-btn ${isLiked ? "liked" : ""}`} onClick={toggleLiked} title="Like">
                    <Heart size={16} fill={isLiked ? "#e63636" : "none"} />
                  </button>
                  <button className="ad-hero-action-btn" onClick={() => navigator.clipboard.writeText(window.location.href)} title="Share">
                    <Share2 size={16} />
                  </button>
                </div>
                {watchError && (
                  <p className="ad-error-msg">
                    {watchError}
                    <button className="ad-retry-btn" onClick={handleRetry}>Retry</button>
                  </p>
                )}
              </div>
            </div>
          </motion.section>

          {/* ─── BODY ─── */}
          <section className="ad-body">
            {/* Status Bar */}
            <div className="ad-status-bar">
              <div className="ad-status-item">
                <span className="label">Status</span>
                <span className="value white">{anime.status || "Unknown"}</span>
              </div>
              <div className="ad-status-item">
                <span className="label">Season</span>
                <span className="value">{anime.season || "—"}</span>
              </div>
              <div className="ad-status-item">
                <span className="label">Episodes</span>
                <span className="value">{anime.episodes || "?"}</span>
              </div>
              <div className="ad-status-item">
                <span className="label">Studio</span>
                <span className="value">{anime.studio || "—"}</span>
              </div>
              <div className="ad-status-item">
                <span className="label">Year</span>
                <span className="value">{anime.year || "—"}</span>
              </div>
              {anime.director && (
                <div className="ad-status-item">
                  <span className="label">Director</span>
                  <span className="value">{anime.director}</span>
                </div>
              )}
            </div>

            {/* 5-Star Rating */}
            <div className="ad-rating-row">
              <div className="ad-rating-stars">
                {[1, 2, 3, 4, 5].map((num) => (
                  <span
                    key={num}
                    className={`ad-rating-star ${num <= userRating ? "filled" : ""} ${num <= hoverRating ? "hovered" : ""}`}
                    onClick={() => handleRate(num === userRating ? num - 1 : num)}
                    onMouseEnter={() => setHoverRating(num)}
                    onMouseLeave={() => setHoverRating(0)}
                  >★</span>
                ))}
              </div>
              <div className="ad-rating-info">
                <span className="ad-rating-global">{anime.rating?.toFixed(1) || "?"}</span>
                <span className="ad-rating-votes">({anime.votes?.toLocaleString() || 0})</span>
                {userRating > 0 && <span className="ad-rating-user">You: {userRating}/5</span>}
              </div>
            </div>

            {/* Genres */}
            {anime.genres?.length > 0 && (
              <div className="ad-genres">
                {anime.genres.map((g) => (
                  <span key={g} className="ad-genre-tag">{g}</span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            <div className="ad-synopsis">
              <h3>Synopsis</h3>
              <p>{anime.synopsis}</p>
            </div>

            {/* ─── TABS ─── */}
            <div className="ad-tabs">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button key={key} className={`ad-tab ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
                  <Icon size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {label}
                </button>
              ))}
            </div>

            {/* ─── TAB: EPISODES ─── */}
            {activeTab === "episodes" && (
              <div>
                {(anime.trailerUrl || anime.trailer?.embed_url) && (
                  <div style={{ marginBottom: 16 }}>
                    <button className="ad-hero-action-btn" onClick={() => setShowTrailer(true)} style={{ width: "auto", padding: "8px 16px", gap: 6, fontSize: "0.82rem", display: "inline-flex" }}>
                      <Play size={14} /> Watch Trailer
                    </button>
                  </div>
                )}
                {cours ? cours.map((cour) => (
                  <div key={cour.name} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                      <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {cour.name}
                      </span>
                      <span style={{ color: "#666", fontSize: "0.72rem" }}>
                        {cour.startDate} → {cour.endDate}
                      </span>
                    </div>
                    <div className="ad-episodes-grid">
                      {episodeNumbers.filter(ep => ep >= cour.episodeStart && ep <= cour.episodeEnd).map((ep) => {
                        const available = isEpisodeAvailable(ep, cours);
                        return (
                          <button
                            key={ep}
                            className={`ad-episode-btn ${ep === selectedEp ? "active" : ""} ${!available ? "disabled" : ""}`}
                            onClick={() => available && handleWatch(ep)}
                            disabled={!available}
                            title={available ? `Episode ${ep}` : `Airs ${cour.startDate}`}
                          >
                            <span className="ad-episode-num">{ep}</span>
                            <span className="ad-episode-label">{available ? "EP" : "Soon"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )) : (
                  <div className="ad-episodes-grid">
                    {episodeNumbers.map((ep) => (
                      <button
                        key={ep}
                        className={`ad-episode-btn ${ep === selectedEp ? "active" : ""}`}
                        onClick={() => handleWatch(ep)}
                      >
                        <span className="ad-episode-num">{ep}</span>
                        <span className="ad-episode-label">EP</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: CHARACTERS ─── */}
            {activeTab === "characters" && (
              characters === null ? (
                <p style={{ color: "#888", textAlign: "center", padding: 32 }}>Loading characters...</p>
              ) : characters.length > 0 ? (
                <div className="ad-characters-grid">
                  {characters.map((c) => (
                    <div key={c.id} className="ad-character-card">
                      <img src={c.image || "/placeholder.svg"} alt={c.name} className="ad-character-img" />
                      <div className="ad-character-info">
                        <span className="ad-character-name">{c.name}</span>
                        <span className="ad-character-role">{c.role}</span>
                        {c.voiceActor && <span className="ad-character-va">VA: {c.voiceActor.name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#888", textAlign: "center", padding: 32 }}>No character data available.</p>
              )
            )}

            {/* ─── TAB: RECOMMENDATIONS ─── */}
            {activeTab === "recommendations" && (
              recommendations && recommendations.length > 0 ? (
                <div className="ad-recommendations-grid">
                  {recommendations.map((r) => (
                    <div key={r.id} className="ad-recommendation-card" onClick={() => { window.scrollTo(0, 0); navigate(`/anime/${r.id}`); }}>
                      <img src={r.image || "/placeholder.svg"} alt={r.name} />
                      <span className="ad-recommendation-name">{r.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#666", textAlign: "center", padding: 32 }}>No recommendations available.</p>
              )
            )}

            {/* ─── TAB: REVIEWS ─── */}
            {activeTab === "reviews" && (
              <Reviews animeId={anime.id} selectedEp={selectedEp} />
            )}
          </section>

          {/* ─── PLAYER MODAL ─── */}
          {showPlayer && watchAnime && (
            <AnimeWatch
              anime={watchAnime}
              animeName={anime?.name}
              onClose={() => setShowPlayer(false)}
              startEp={selectedEp}
              onEpisodeChange={(ep) => setSelectedEp(ep)}
              totalEpisodes={totalEps}
            />
          )}

          {/* ─── TRAILER OVERLAY ─── */}
          {showTrailer && (anime.trailerUrl || anime.trailer?.embed_url) && (
            <div className="ad-trailer-overlay" onClick={() => setShowTrailer(false)}>
              <div className="ad-trailer-modal" onClick={(e) => e.stopPropagation()}>
                <button className="ad-trailer-close" onClick={() => setShowTrailer(false)}>✕</button>
                <div className="ad-trailer-embed">
                  <iframe
                    src={anime.trailerUrl || anime.trailer.embed_url}
                    title="Trailer"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AnimatedPage>
  );
}
