import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Bookmark, Heart, Share2, Bell, Star, Tv, Film, Users, MessageSquare } from "lucide-react";
import { getAnimeById } from "../data/animeData";
import { fetchAnimeCharacters, fetchAnimeRecommendations, fetchAiringSchedule } from "../services/jikanApi";

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

  const [apiAnime, setApiAnime] = useState(null);
  const [animeLoading, setAnimeLoading] = useState(true);
  const [animeError, setAnimeError] = useState("");
  const [characters, setCharacters] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [schedule, setSchedule] = useState(null);

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

  const anime = apiAnime;
  const malId = anime?.malId || parseInt(id);
  const totalEps = anime?.episodes ?? 12;

  useEffect(() => {
    const epFromUrl = searchParams.get("ep");
    if (epFromUrl) { setSelectedEp(Number(epFromUrl)); return; }
    const history = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    const found = history.find((h) => h.animeId === parseInt(id));
    if (found) setSelectedEp(found.episode);
  }, [id, searchParams]);

  useEffect(() => {
    let cancelled = false;
    setAnimeLoading(true);
    setAnimeError("");
    getAnimeById(id).then((a) => { if (!cancelled) { setApiAnime(a); setAnimeLoading(false); if (!a) setAnimeError("Could not load this anime."); } }).catch(() => { if (!cancelled) { setAnimeLoading(false); setAnimeError("Failed to load anime details."); } });
    fetchAnimeCharacters(parseInt(id)).then(setCharacters).catch(() => {});
    fetchAnimeRecommendations(parseInt(id)).then(setRecommendations).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!anime) return;
    const aId = anime?.id && anime.id !== malId ? anime.id : null;
    fetchAiringSchedule({ anilistId: aId, malId }).then(setSchedule).catch(() => {});
  }, [anime?.id, malId]);

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
    if (totalEps > 0 && totalEps < 300) return Array.from({ length: totalEps }, (_, i) => i + 1);
    return Array.from({ length: 12 }, (_, i) => i + 1);
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
    const aid = parseInt(id);
    const result = toggleLikeAnime(aid);
    const nowLiked = result.includes(aid);
    setIsLiked(nowLiked);
    if (nowLiked) addNotification({ title: "Liked", body: anime.name, type: "follow" });
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

  if (animeLoading) {
    return (
      <AnimatedPage>
        <div className="anime-detail-page">
          <Background />
          <div className="ad-loading">
            <div className="ad-loading-pulse" />
            <div className="ad-loading-pulse" />
            <div className="ad-loading-pulse" />
          </div>
        </div>
      </AnimatedPage>
    );
  }

  if (!anime || animeError) {
    return (
      <AnimatedPage>
        <div className="anime-detail-page">
          <Background />
          <div className="ad-error-state">
            <p className="ad-error-state-text">{animeError || "Anime not found"}</p>
            <button className="ad-error-state-btn" onClick={() => navigate(-1)}>Go back</button>
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
                <span className="value white">{anime.status || "—"}</span>
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
                {anime.votes > 0 && <span className="ad-rating-votes">({anime.votes.toLocaleString()})</span>}
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
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* ─── TAB: EPISODES ─── */}
            {activeTab === "episodes" && (
              <div>
                {(anime.trailerUrl || anime.trailer?.embed_url) && (
                  <div className="ad-trailer-trigger-wrap">
                    <button className="ad-trailer-trigger" onClick={() => setShowTrailer(true)}>
                      <Play size={14} /> Watch Trailer
                    </button>
                  </div>
                )}
                {schedule?.cours ? schedule.cours.map((cour) => (
                  <div key={cour.episodeStart} className="ad-cour-section">
                    <div className="ad-cour-header">
                      <span className="ad-cour-name">{cour.name}</span>
                      <span className="ad-cour-dates">{cour.startDate} → {cour.endDate}</span>
                    </div>
                    <div className="ad-episodes-grid">
                      {episodeNumbers.filter(ep => ep >= cour.episodeStart && ep <= cour.episodeEnd).map((ep) => {
                        const sch = schedule.episodes?.find(e => e.episode === ep);
                        const aired = sch ? sch.aired : false;
                        return (
                          <button
                            key={ep}
                            className={`ad-episode-btn ${ep === selectedEp ? "active" : ""} ${!aired ? "disabled" : ""}`}
                            onClick={() => aired && handleWatch(ep)}
                            disabled={!aired}
                            title={aired ? `Episode ${ep}` : sch ? `Airs ${new Date(sch.airingAt * 1000).toLocaleDateString()}` : `Not yet aired`}
                          >
                            <span className="ad-episode-num">{ep}</span>
                            <span className="ad-episode-label">{aired ? "EP" : "Soon"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )) : (
                  <div className="ad-episodes-grid">
                    {episodeNumbers.map((ep) => {
                      const sch = schedule?.episodes?.find(e => e.episode === ep);
                      const aired = sch ? sch.aired : true;
                      return (
                        <button
                          key={ep}
                          className={`ad-episode-btn ${ep === selectedEp ? "active" : ""} ${!aired ? "disabled" : ""}`}
                          onClick={() => aired && handleWatch(ep)}
                          disabled={!aired}
                          title={aired ? `Episode ${ep}` : sch ? `Airs ${new Date(sch.airingAt * 1000).toLocaleDateString()}` : `Not yet aired`}
                        >
                          <span className="ad-episode-num">{ep}</span>
                          <span className="ad-episode-label">{aired ? "EP" : "Soon"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: CHARACTERS ─── */}
            {activeTab === "characters" && (
              characters === null ? (
                <p className="ad-tab-empty">Loading characters...</p>
              ) : characters.length > 0 ? (
                <div className="ad-characters-grid">
                  {characters.map((c) => (
                    <div key={c.id} className="ad-character-card">
                      {c.image ? (
                        <img src={c.image} alt={c.name} className="ad-character-img" />
                      ) : (
                        <div className="ad-character-img ad-character-fallback">
                          <Users size={20} />
                        </div>
                      )}
                      <div className="ad-character-info">
                        <span className="ad-character-name">{c.name}</span>
                        <span className="ad-character-role">{c.role}</span>
                        {c.voiceActor && <span className="ad-character-va">VA: {c.voiceActor.name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ad-tab-empty">No character data available.</p>
              )
            )}

            {/* ─── TAB: RECOMMENDATIONS ─── */}
            {activeTab === "recommendations" && (
              recommendations && recommendations.length > 0 ? (
                <div className="ad-recommendations-grid">
                  {recommendations.map((r) => (
                    <div key={r.id} className="ad-recommendation-card" onClick={() => { window.scrollTo(0, 0); navigate(`/anime/${r.id}`); }}>
                      {r.image ? (
                        <img src={r.image} alt={r.name} />
                      ) : (
                        <div className="ad-rec-fallback"><Film size={20} /></div>
                      )}
                      <span className="ad-recommendation-name">{r.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ad-tab-empty">No recommendations available.</p>
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
