import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Play, Share2, ChevronLeft, ChevronRight, X,
  Check, Copy, Globe, MessageCircle, AtSign, Eye,
  Bookmark, Heart, ChevronDown, ChevronUp, Clock,
  Star, Film, Calendar, Monitor, Layers
} from "lucide-react";
import { fetchAnimeRecommendations, fetchAnimeCharacters } from "../services/anilistApi";
import api from "../services/api";
import { loadWatchHistory } from "../services/storage";
import usePrefetchAnime from "../hooks/usePrefetchAnime";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./AnimeInfo.css";

const SHARE_OPTIONS = [
  { key: "copy", icon: Copy, label: "Copy Link" },
  { key: "twitter", icon: Globe, label: "Twitter" },
  { key: "facebook", icon: MessageCircle, label: "Facebook" },
  { key: "discord", icon: MessageCircle, label: "Discord" },
  { key: "reddit", icon: Globe, label: "Reddit" },
  { key: "mail", icon: AtSign, label: "Email" },
];

const TABS = [
  { key: "episodes", label: "Episodes" },
  { key: "characters", label: "Characters" },
  { key: "related", label: "Related" },
  { key: "more-like-this", label: "More like this" },
];

function formatCount(n) {
  if (!n) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

function formatStatus(status) {
  if (!status) return "Unknown";
  const map = {
    "FINISHED": "Finished",
    "RELEASING": "Airing",
    "NOT_YET_RELEASED": "Upcoming",
    "CANCELLED": "Cancelled",
    "HIATUS": "Hiatus",
    "Ongoing": "Airing",
    "Upcoming": "Upcoming",
    "Completed": "Finished",
  };
  return map[status] || status;
}

export default function AnimeInfo() {
  const { id } = useParams();
  const prefetch = usePrefetchAnime();
  const [anime, setAnime] = useState(null);
  useDocumentTitle(anime?.name || "Anime Details");
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("episodes");
  const [bookmarked, setBookmarked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [resumeInfo, setResumeInfo] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [epScrollLeft, setEpScrollLeft] = useState(false);
  const [epScrollRight, setEpScrollRight] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  const shareRef = useRef(null);
  const epScrollRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/catalog/anime/${id}/details`);
      if (res?.data) setAnime(res.data);
      else setError("Anime not found.");
    } catch {
      try {
        const res = await api.get(`/catalog/anime/${id}`);
        if (res?.data) setAnime(res.data);
        else setError("Anime not found.");
      } catch { setError("Failed to load anime."); }
    }
    try {
      const recs = await fetchAnimeRecommendations(id);
      setRelated(recs);
    } catch {}
    try {
      const chars = await fetchAnimeCharacters(id);
      setCharacters(chars.slice(0, 8));
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!anime) return;
    const hist = loadWatchHistory();
    const latest = hist.find(h => h.animeId === anime.id);
    if (latest) {
      setResumeInfo({
        episode: latest.episode,
        position: latest.position || 0,
        timestamp: latest.timestamp,
        isFinished: anime.episodes > 0 && latest.episode >= anime.episodes,
      });
    } else {
      setResumeInfo(null);
    }
  }, [anime]);

  useEffect(() => {
    const handler = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    if (shareOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shareOpen]);

  useEffect(() => {
    if (!trailerOpen) return;
    const handler = (e) => { if (e.key === "Escape") setTrailerOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [trailerOpen]);

  const checkEpScroll = useCallback(() => {
    const el = epScrollRef.current;
    if (!el) return;
    setEpScrollLeft(el.scrollLeft > 4);
    setEpScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = epScrollRef.current;
    if (!el) return;
    const handler = () => checkEpScroll();
    el.addEventListener("scroll", handler);
    checkEpScroll();
    return () => el.removeEventListener("scroll", handler);
  }, [anime, checkEpScroll]);

  const scrollEp = (dir) => {
    if (epScrollRef.current) {
      epScrollRef.current.scrollBy({ left: dir * 220, behavior: "smooth" });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = (key) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(anime?.name || "Check this out!");
    if (key === "copy") { handleCopyLink(); return; }
    if (key === "twitter") window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    if (key === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
    if (key === "discord") window.open(`https://discord.com/share?url=${url}`, "_blank");
    if (key === "reddit") window.open(`https://reddit.com/submit?url=${url}&title=${text}`, "_blank");
    if (key === "mail") window.location.href = `mailto:?subject=${text}&body=${url}`;
    setShareOpen(false);
  };

  const synopsisClean = anime?.synopsis ? anime.synopsis.replace(/<[^>]*>/g, "") : "";
  const synopsisTruncated = synopsisClean.length > 250;
  const displayedSynopsis = synopsisExpanded || !synopsisTruncated
    ? synopsisClean
    : synopsisClean.slice(0, 250) + "...";

  const totalEpisodes = anime?.episodes || 0;
  const epArray = Array.from({ length: totalEpisodes }, (_, i) => i + 1).reverse();
  const mostViewedEp = Math.min(totalEpisodes, Math.max(1, totalEpisodes - 2));

  const posterImg = anime?.img || "";
  const bannerImg = anime?.bannerImage || anime?.img || "";

  const statusFormatted = formatStatus(anime?.status);
  const statusLower = (anime?.status || "").toLowerCase();

  const infoFields = [
    { label: "Format", value: anime?.type || "TV" },
    { label: "Status", value: statusFormatted },
    { label: "Episodes", value: anime?.episodes || "—" },
    { label: "Season", value: anime?.season || "—" },
    { label: "Aired", value: anime?.aired || anime?.year || "—" },
    { label: "Studio", value: anime?.studio || "—" },
  ];

  if (loading) {
    return (
      <div className="ai-page">
        <div className="ai-skeleton-hero" />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="ai-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, minHeight: "100vh", color: "#fff" }}>
        <div style={{ fontSize: 16, color: "var(--text-muted)" }}>{error || "Anime not found."}</div>
        <button className="ai-retry-btn" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="ai-page">
      {/* ═══════════ HERO ═══════════ */}
      <section className="ai-hero">
        <div className="ai-hero-bg">
          <img src={bannerImg} alt="" className="ai-hero-bg-img" />
          <div className="ai-hero-overlay" />
          <div className="ai-hero-vignette" />
        </div>
        <div className="ai-hero-pulse" />

        <div className="ai-hero-content">
          {/* Poster */}
          <div className="ai-hero-poster-col">
            <div className="ai-poster-glow">
              <img src={posterImg} alt={anime.name} />
            </div>
          </div>

          {/* Info */}
          <div className="ai-hero-info-col">
            {anime.season && (
              <div className="ai-hero-season-label">
                <Calendar size={10} />
                <span>{anime.season}</span>
              </div>
            )}

            <h1 className="ai-hero-title">{anime.name}</h1>

            <div className="ai-genre-row">
              {(anime.genres || []).map(g => (
                <Link key={g} to={`/browse/anime?genre=${encodeURIComponent(g)}`} className="ai-genre-pill">
                  {g}
                </Link>
              ))}
            </div>

            <div className="ai-hero-badges">
              {anime.status && (
                <span className={`ai-status-badge ${statusLower.includes("air") || statusLower === "releasing" ? "airing" : statusLower.includes("finish") || statusLower === "completed" ? "finished" : statusLower.includes("upcoming") || statusLower === "not_yet_released" ? "upcoming" : "cancelled"}`}>
                  {statusFormatted}
                </span>
              )}
              {anime.rating && (
                <span className="ai-hero-badge">
                  <Star size={12} />
                  {anime.rating}
                </span>
              )}
              {anime.duration && (
                <span className="ai-hero-badge">
                  <Clock size={12} />
                  {anime.duration}m
                </span>
              )}
              {totalEpisodes > 0 && (
                <span className="ai-hero-badge">
                  <Film size={12} />
                  {totalEpisodes} eps
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="ai-action-row">
              {anime.status === "NOT_YET_RELEASED" || anime.status === "CANCELLED" ? (
                <span className="ai-btn-play disabled">
                  {anime.status === "NOT_YET_RELEASED" ? "Coming Soon" : "Cancelled"}
                </span>
              ) : resumeInfo && !resumeInfo.isFinished ? (
                <Link to={`/anime/${anime.id}?ep=${resumeInfo.episode}`} className="ai-btn-play">
                  <Play size={18} fill="currentColor" />
                  <span>Continue Ep {resumeInfo.episode}</span>
                </Link>
              ) : (
                <Link to={`/anime/${anime.id}?ep=1`} className="ai-btn-play">
                  <Play size={18} fill="currentColor" />
                  <span>Play</span>
                </Link>
              )}

              <button
                className={`ai-btn-icon ${bookmarked ? "active" : ""}`}
                onClick={() => setBookmarked(b => !b)}
                aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              >
                <Bookmark size={16} fill={bookmarked ? "#fff" : "none"} />
              </button>

              <button
                className={`ai-btn-icon ${favorited ? "active" : ""}`}
                onClick={() => setFavorited(f => !f)}
                aria-label={favorited ? "Remove favorite" : "Favorite"}
              >
                <Heart size={16} fill={favorited ? "#fff" : "none"} />
              </button>

              <div className="ai-dropdown-wrap" ref={shareRef}>
                <button className="ai-btn-icon" onClick={() => setShareOpen(o => !o)} aria-label="Share">
                  <Share2 size={16} />
                </button>
                {shareOpen && (
                  <div className="ai-share-popup">
                    {SHARE_OPTIONS.map(opt => (
                      <button key={opt.key} className={`ai-share-option ${opt.key === "copy" && copied ? "copied" : ""}`} onClick={() => handleShare(opt.key)}>
                        {opt.key === "copy" && copied ? <Check size={16} /> : <opt.icon size={16} />}
                        {opt.key === "copy" && copied ? "Copied!" : opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {anime.malId && (
                <a href={`https://myanimelist.net/anime/${anime.malId}`} target="_blank" rel="noopener noreferrer" className="ai-btn-icon">
                  MAL
                </a>
              )}
            </div>

            {/* Synopsis */}
            <div className="ai-synopsis-wrap">
              <p className={`ai-synopsis-text ${!synopsisExpanded && synopsisTruncated ? "collapsed" : ""}`}>
                {displayedSynopsis || "No synopsis available."}
              </p>
              {synopsisTruncated && (
                <button
                  className="ai-synopsis-toggle"
                  onClick={() => setSynopsisExpanded(e => !e)}
                >
                  {synopsisExpanded ? (
                    <>Show Less <ChevronUp size={14} /></>
                  ) : (
                    <>Show More <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CONTENT ═══════════ */}
      <div className="ai-content">
        {/* Sidebar Info Panel */}
        <aside className="ai-sidebar">
          <div className="ai-info-panel">
            <div className="ai-info-panel-title">Details</div>
            {infoFields.map(field => (
              <div key={field.label} className="ai-info-row">
                <span className="ai-info-label">{field.label}</span>
                <span className="ai-info-value">{field.value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="ai-main">
          {/* Tabs */}
          <nav className="ai-tabs">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`ai-tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                {activeTab === t.key && <span className="ai-tab-indicator" />}
              </button>
            ))}
          </nav>

          {/* ─── EPISODES ─── */}
          {activeTab === "episodes" && (
            <section className="ai-episodes-section">
              <div className="ai-episodes-header">
                <span className="ai-episodes-count">{totalEpisodes} Episodes</span>
              </div>
              <div className="ai-episodes-scroll-wrap">
                {epScrollLeft && (
                  <button className="ai-ep-arrow ai-ep-arrow-left" onClick={() => scrollEp(-1)} aria-label="Scroll left">
                    <ChevronLeft size={20} />
                  </button>
                )}
                {epScrollRight && (
                  <button className="ai-ep-arrow ai-ep-arrow-right" onClick={() => scrollEp(1)} aria-label="Scroll right">
                    <ChevronRight size={20} />
                  </button>
                )}
                <div className="ai-episodes-scroll" ref={epScrollRef}>
                  {epArray.map((ep) => {
                    const isTop = ep === mostViewedEp;
                    return (
                      <Link
                        key={ep}
                        to={`/anime/${anime.id}?ep=${ep}`}
                        className={`ai-ep-card ${isTop ? "top" : ""}`}
                      >
                        <div className="ai-ep-card-img">
                          <img src={posterImg} alt={`Episode ${ep}`} loading="lazy" />
                          <div className="ai-ep-card-overlay">
                            <div className="ai-ep-card-overlay-icon">
                              <Play size={18} fill="#fff" />
                            </div>
                          </div>
                          <span className="ai-ep-card-badge">EP {ep}</span>
                        </div>
                        <div className="ai-ep-card-footer">
                          <span className="ai-ep-card-num">Episode {ep}</span>
                          <span className="ai-ep-card-views">
                            <Eye size={11} />
                            {(() => {
                              const base = anime.popularity || 32000;
                              const variance = Math.floor(Math.random() * 5000) + 2000;
                              const views = isTop ? base + variance + 3000 : base + variance;
                              return formatCount(views);
                            })()}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ─── CHARACTERS ─── */}
          {activeTab === "characters" && (
            <section>
              {characters.length > 0 ? (
                <div className="ai-characters-grid">
                  {characters.map((ch, i) => (
                    <div key={ch.id || i} className="ai-character-card">
                      <div className="ai-character-img-wrap">
                        <img src={ch.image || ch.img || posterImg} alt={ch.name} className="ai-character-img" loading="lazy" />
                      </div>
                      <span className="ai-character-name">{ch.name}</span>
                      <span className="ai-character-role">{ch.role || ch.title || "Character"}</span>
                      {ch.voiceActor && (
                        <span className="ai-character-va">{ch.voiceActor}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ai-tab-empty">
                  <span>No character data available.</span>
                </div>
              )}
            </section>
          )}

          {/* ─── RELATED ─── */}
          {activeTab === "related" && (
            <section>
              {anime.related && anime.related.length > 0 ? (
                <div className="ai-mlt-grid">
                  {anime.related.map((r, i) => (
                    <Link key={r.id || i} to={`/anime/${r.id}/info`} className="ai-mlt-card">
                      <div className="ai-mlt-card-img">
                        <img src={r.img || r.image || posterImg} alt={r.title} loading="lazy" />
                        <div className="ai-mlt-card-overlay">
                          <Play size={18} fill="#fff" />
                        </div>
                      </div>
                      <div className="ai-mlt-card-body">
                        <h3 className="ai-mlt-card-title">{r.title}</h3>
                        <div className="ai-mlt-card-tags">
                          {(r.genres || []).slice(0, 2).map(g => (
                            <span key={g} className="ai-mlt-tag">{g}</span>
                          ))}
                        </div>
                        <p className="ai-mlt-card-reason">{r.reason || r.relationType || "Related"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="ai-tab-empty">
                  <span>No related anime.</span>
                </div>
              )}
            </section>
          )}

          {/* ─── MORE LIKE THIS ─── */}
          {activeTab === "more-like-this" && (
            <section>
              {related.length > 0 ? (
                <div className="ai-mlt-grid">
                  {related.map((r) => (
                    <Link key={r.id} to={`/anime/${r.id}/info`} className="ai-mlt-card"
                      onMouseEnter={() => prefetch.onMouseEnter(r.id)}
                      onMouseLeave={prefetch.onMouseLeave}
                    >
                      <div className="ai-mlt-card-img">
                        <img src={r.image} alt={r.name} loading="lazy" />
                        <div className="ai-mlt-card-overlay">
                          <Play size={18} fill="#fff" />
                        </div>
                      </div>
                      <div className="ai-mlt-card-body">
                        <h3 className="ai-mlt-card-title">{r.name}</h3>
                        <div className="ai-mlt-card-tags">
                          {(r.genres || []).slice(0, 2).map(g => (
                            <span key={g} className="ai-mlt-tag">{g}</span>
                          ))}
                        </div>
                        <p className="ai-mlt-card-reason">Recommended based on genre and rating</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="ai-tab-empty">
                  <span>{anime.name ? "No recommendations available." : "Loading..."}</span>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* ─── TRAILER MODAL ─── */}
      {trailerOpen && (
        <div className="ai-trailer-modal" onClick={() => setTrailerOpen(false)}>
          <div className="ai-trailer-modal-bg" />
          <div className="ai-trailer-modal-content" onClick={e => e.stopPropagation()}>
            <button className="ai-trailer-modal-close" onClick={() => setTrailerOpen(false)}>
              <X size={20} />
            </button>
            <div className="ai-trailer-modal-video">
              <iframe
                src={anime.trailerUrl}
                title="Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
