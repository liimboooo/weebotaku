import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Bookmark, Heart, Bell, Star, Film, Users, MessageSquare, X, Tv } from "lucide-react";
import { getAnimeById } from "../data/animeData";
import { fetchAnimeCharacters, fetchAnimeRecommendations, fetchAiringSchedule } from "../services/anilistApi";

import { addToWatchlist, removeFromWatchlist, isInWatchlist, rateAnime as syncRateAnime, toggleLikeAnime, addToWatchHistory } from "../services/storage";
import { addNotification } from "../services/notificationService";
import { findStreamingSource } from "../services/animeApi";
import AnimeWatch from "./Feeds/AnimeWatch";
import Background from "../components/Background";
import Reviews from "../components/Reviews";
import AnimatedPage from "../components/AnimatedPage";
import "./AnimeDetail.css";
import "../components/AnimePreviewPanel.css";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {/* ─── PREVIEW PANEL HEADER ─── */}
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            style={{ overflow: "hidden", marginBottom: 16 }}
          >
            <div className="preview-panel-inner">
              <div className="preview-panel-left">
                <button className="preview-panel-close" onClick={() => navigate(-1)} aria-label="Close">
                  <X size={16} />
                </button>

                <h1 className="preview-panel-title">{anime.name}</h1>

                <div className="preview-panel-stats">
                  {anime.year && <span className="preview-panel-stat">{anime.year}</span>}
                  {anime.rating && <span className="preview-panel-stat accent">{anime.rating.toFixed(1)}</span>}
                  {anime.episodes && <span className="preview-panel-stat">{anime.episodes} EP</span>}
                  <span className="preview-panel-stat">HD</span>
                  {anime.status && <span className="preview-panel-stat">{anime.status}</span>}
                </div>

                <p className="preview-panel-synopsis">{anime.synopsis || "No synopsis available."}</p>

                <div className="preview-panel-actions">
                  <motion.button
                    className="preview-panel-btn primary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleWatch(selectedEp)}
                    disabled={watchLoading}
                  >
                    <Play size={16} fill="currentColor" />
                    {watchLoading ? "Searching..." : "Watch Now"}
                  </motion.button>
                  <button className={`preview-panel-btn secondary ${isWatchlisted ? "active" : ""}`} onClick={toggleWatchlist}>
                    <Bookmark size={14} fill={isWatchlisted ? "currentColor" : "none"} />
                    {isWatchlisted ? "Saved" : "Watchlist"}
                  </button>
                  <button className={`preview-panel-btn icon ${isLiked ? "liked" : ""}`} onClick={toggleLiked} aria-label="Like">
                    <Heart size={14} fill={isLiked ? "#8b5cf6" : "none"} />
                  </button>
                  <button className="preview-panel-btn icon" onClick={toggleFollowing} aria-label="Follow">
                    <Bell size={14} fill={isFollowing ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="preview-panel-details">
                  <div className="preview-panel-detail-item">
                    <span className="preview-panel-detail-label">Cast</span>
                    <span className="preview-panel-detail-value">
                      {anime.studios?.join(", ") || anime.studio || "Various"}
                    </span>
                  </div>
                  <div className="preview-panel-detail-item">
                    <span className="preview-panel-detail-label">Genres</span>
                    <span className="preview-panel-detail-value">
                      {anime.genres?.join(", ") || "N/A"}
                    </span>
                  </div>
                  {anime.director && (
                    <div className="preview-panel-detail-item">
                      <span className="preview-panel-detail-label">Director</span>
                      <span className="preview-panel-detail-value">{anime.director}</span>
                    </div>
                  )}
                  {anime.season && (
                    <div className="preview-panel-detail-item">
                      <span className="preview-panel-detail-label">Season</span>
                      <span className="preview-panel-detail-value">{anime.season}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="preview-panel-right">
                {(anime.trailerUrl || anime.trailer?.embed_url) ? (
                  <div className="preview-panel-media">
                    <iframe
                      src={anime.trailerUrl || anime.trailer.embed_url}
                      title={anime.name}
                      allow="autoplay; encrypted-media"
                      style={{ border: 0 }}
                    />
                  </div>
                ) : anime.img ? (
                  <div className="preview-panel-media">
                    <img src={anime.img} alt="" style={{ objectFit: "cover" }} />
                  </div>
                ) : (
                  <div className="preview-panel-fallback">
                    <Film size={40} />
                  </div>
                )}
                <div className="preview-panel-fade" />
              </div>
            </div>
          </motion.div>

          {/* ─── BODY ─── */}
          <section className="ad-body">
            {watchError && (
              <p className="ad-error-msg" style={{ marginBottom: 16 }}>
                {watchError}
                <button className="ad-retry-btn" onClick={handleRetry}>Retry</button>
              </p>
            )}

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
                  ><Star size={16} fill={num <= userRating ? "currentColor" : "none"} /></span>
                ))}
              </div>
              <div className="ad-rating-info">
                <span className="ad-rating-global">{anime.rating?.toFixed(1) || "?"}</span>
                {anime.votes > 0 && <span className="ad-rating-votes">({anime.votes.toLocaleString()})</span>}
                {userRating > 0 && <span className="ad-rating-user">You: {userRating}/5</span>}
              </div>
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
                      <span className="ad-cour-dates">{cour.startDate} &ndash; {cour.endDate}</span>
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
                <button className="ad-trailer-close" onClick={() => setShowTrailer(false)}><X size={16} /></button>
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
