import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Play, Plus, Share2, Heart, Star, ChevronLeft, ChevronRight,
  Check, Copy, Globe, ExternalLink, Download,
  Film, Clock, RefreshCw, Calendar, Tv, Monitor, MessageCircle, AtSign
} from "lucide-react";
import { gql, fetchAnimeRecommendations, fetchAnimeCharacters } from "../services/anilistApi";
import "./AnimeInfo.css";

const DETAIL_FIELDS = `id idMal title { romaji english native } coverImage { extraLarge large } bannerImage averageScore popularity episodes duration genres description status season seasonYear startDate { year month day } studios(isMain:true) { nodes { name } } trailer { site id } format nextAiringEpisode { episode airingAt timeUntilAiring }`;

function statusLabel(s) {
  if (s === "RELEASING") return "Releasing";
  if (s === "FINISHED") return "Finished";
  if (s === "NOT_YET_RELEASED") return "Upcoming";
  return s || "Unknown";
}

function mapDetail(a) {
  return {
    id: a.id,
    name: a.title?.english || a.title?.romaji || "",
    romaji: a.title?.romaji || "",
    native: a.title?.native || "",
    img: a.coverImage?.extraLarge || a.coverImage?.large || "",
    bannerImage: a.bannerImage || "",
    rating: (a.averageScore || 0) / 10,
    popularity: a.popularity || 0,
    year: a.seasonYear || 0,
    episodes: a.episodes || 0,
    duration: a.duration || 0,
    status: statusLabel(a.status),
    genres: a.genres || [],
    synopsis: a.description || "",
    studios: a.studios?.nodes?.map(n => n.name) || [],
    season: a.season ? `${a.season.charAt(0).toUpperCase() + a.season.slice(1).toLowerCase()} ${a.seasonYear || ""}` : "",
    type: a.format || "TV",
    startDate: a.startDate ? { year: a.startDate.year, month: a.startDate.month, day: a.startDate.day } : null,
    trailerUrl: a.trailer?.site === "youtube" ? `https://www.youtube.com/embed/${a.trailer.id}` : null,
  };
}

function formatDate(d) {
  if (!d?.year) return "N/A";
  const m = String(d.month || 1).padStart(2, "0");
  const day = String(d.day || 1).padStart(2, "0");
  return `${d.year}-${m}-${day}`;
}

const LIST_OPTIONS = ["Watch Later", "Watching", "Completed", "On Hold", "Dropped"];

const SHARE_OPTIONS = [
  { key: "copy", icon: Copy, label: "Copy Link" },
  { key: "twitter", icon: Globe, label: "Twitter" },
  { key: "facebook", icon: MessageCircle, label: "Facebook" },
  { key: "discord", icon: MessageCircle, label: "Discord" },
  { key: "reddit", icon: Globe, label: "Reddit" },
  { key: "mail", icon: AtSign, label: "Email" },
];

export default function AnimeInfo() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [listStatus, setListStatus] = useState("");
  const [favorited, setFavorited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [charImgs, setCharImgs] = useState([]);
  const [galleryImgs, setGalleryImgs] = useState([]);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const listRef = useRef(null);
  const shareRef = useRef(null);
  const downloadRef = useRef(null);
  const relatedRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = `query($id:Int){Media(id:$id,type:ANIME){${DETAIL_FIELDS}}}`;
      const data = await gql(q, { id: Number(id) });
      if (data?.Media) setAnime(mapDetail(data.Media));
      else setError("Anime not found.");
    } catch {
      try {
        const q2 = `query($id:Int){Media(idMal:$id,type:ANIME){${DETAIL_FIELDS}}}`;
        const data2 = await gql(q2, { id: Number(id) });
        if (data2?.Media) setAnime(mapDetail(data2.Media));
        else setError("Anime not found.");
      } catch { setError("Failed to load anime."); }
    }
    try {
      const recs = await fetchAnimeRecommendations(id);
      setRelated(recs);
    } catch {}
    try {
      const chars = await fetchAnimeCharacters(id);
      const charsWithImg = chars.filter(c => c.image).slice(0, 3);
      setCharImgs(charsWithImg.map(c => c.image));
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (anime) {
      const imgs = [];
      if (anime.img) imgs.push(anime.img);
      if (anime.bannerImage) imgs.push(anime.bannerImage);
      imgs.push(...charImgs.filter(url => url !== anime.img && url !== anime.bannerImage));
      setGalleryImgs(imgs.slice(0, 5));
    }
  }, [anime, charImgs]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = (e) => {
      if (listRef.current && !listRef.current.contains(e.target)) setListOpen(false);
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
      if (downloadRef.current && !downloadRef.current.contains(e.target)) setDownloadOpen(false);
    };
    if (listOpen || shareOpen || downloadOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [listOpen, shareOpen, downloadOpen]);

  const scrollRelated = (dir) => {
    if (relatedRef.current) {
      relatedRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
    }
  };

  const checkScroll = useCallback(() => {
    const el = relatedRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = relatedRef.current;
    if (!el) return;
    const onScroll = () => checkScroll();
    el.addEventListener("scroll", onScroll);
    checkScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [related, checkScroll]);

  const prevImg = useCallback(() => setGalleryIdx(i => (i > 0 ? i - 1 : galleryImgs.length - 1)), [galleryImgs.length]);
  const nextImg = useCallback(() => setGalleryIdx(i => (i < galleryImgs.length - 1 ? i + 1 : 0)), [galleryImgs.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") { setGalleryIdx(i => (i > 0 ? i - 1 : galleryImgs.length - 1)); e.preventDefault(); }
      if (e.key === "ArrowRight") { setGalleryIdx(i => (i < galleryImgs.length - 1 ? i + 1 : 0)); e.preventDefault(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [galleryImgs.length]);

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

  if (loading) {
    return (
      <div className="ai-loading">
        <div className="ai-skeleton-row">
          <div className="ai-skeleton-cover" />
          <div className="ai-skeleton-info">
            <div className="ai-skeleton-line" />
            <div className="ai-skeleton-line" />
            <div className="ai-skeleton-line" />
            <div className="ai-skeleton-line" />
            <div className="ai-skeleton-line" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="ai-error">
        <div className="ai-error-text">{error || "Anime not found."}</div>
        <div className="ai-error-sub">Could not load anime details. Try again or check the ID.</div>
        <button className="ai-retry-btn" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  const synopsisClean = anime.synopsis ? anime.synopsis.replace(/<[^>]*>/g, "") : "";
  const needsExpand = synopsisClean.length > 280;
  const displaySynopsis = expanded ? synopsisClean : synopsisClean;
  const isCollapsed = !expanded && needsExpand;

  return (
    <div className="ai-page">
      {/* Breadcrumb */}
      <div className="ai-breadcrumb">
        <Link to="/home">Home</Link>
        <span>/</span>
        <Link to="/browse/anime">Anime</Link>
        <span>/</span>
        <span style={{ color: "#888" }}>{anime.name}</span>
      </div>

      {/* ─── HERO ─── */}
      <div className="ai-hero">
        <div className="ai-carousel">
          <div className="glow-card">
            <div className="ai-carousel-main">
              {galleryImgs.length > 0 ? (
                <>
                  {galleryImgs.map((src, i) => (
                    <img key={i} src={src} alt={`${anime.name} ${i + 1}`} className={`ai-carousel-img${i === galleryIdx ? " active" : ""}`} onError={(e) => { e.target.style.display = "none"; }} />
                  ))}
                  {galleryImgs.length > 1 && (
                    <>
                      <button className="ai-carousel-arrow ai-carousel-arrow-left" onClick={prevImg} aria-label="Previous image"><ChevronLeft size={24} /></button>
                      <button className="ai-carousel-arrow ai-carousel-arrow-right" onClick={nextImg} aria-label="Next image"><ChevronRight size={24} /></button>
                    </>
                  )}
                </>
              ) : (
                <div className="ai-placeholder-img"><Film size={32} /></div>
              )}
            </div>
          </div>
          {galleryImgs.length > 1 && (
            <div className="ai-carousel-thumbs">
              {galleryImgs.map((src, i) => (
                <button key={i} className={`ai-carousel-thumb${i === galleryIdx ? " active" : ""}`} onClick={() => setGalleryIdx(i)} aria-label={`Image ${i + 1}`}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ai-hero-info">
          <h1 className="ai-hero-title">{anime.name}</h1>

          {/* Info Pills */}
          <div className="ai-info-pills">
            {anime.type && <span className="ai-pill"><Tv size={12} /> {anime.type}</span>}
            {anime.duration > 0 && <span className="ai-pill"><Clock size={12} /> {anime.duration} min</span>}
            {anime.status && <span className={`ai-pill ai-pill-${anime.status.toLowerCase()}`}><RefreshCw size={12} /> {anime.status}</span>}
            {anime.season && <span className="ai-pill"><Calendar size={12} /> {anime.season}</span>}
          </div>

          {/* Rating + Favorite Heart */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {anime.rating > 0 && (
              <div className="ai-star-display" style={{ margin: 0 }}>
                <Star size={16} className="ai-star-icon filled" fill="#eab308" />
                <span className="ai-star-num">{anime.rating.toFixed(1)}</span>
                <span className="ai-star-max">/ 10</span>
                <span className="ai-star-votes">({anime.popularity} votes)</span>
              </div>
            )}
            <button
              className={`ai-fav-btn ${favorited ? "active" : ""}`}
              onClick={() => setFavorited(f => !f)}
              aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart size={16} fill={favorited ? "#7c3aed" : "none"} />
            </button>
          </div>

          {/* Synopsis */}
          <div className="ai-hero-synopsis-wrap">
            <p className={`ai-hero-synopsis ${isCollapsed ? "collapsed" : "expanded"}`}>
              {displaySynopsis || "No synopsis available."}
            </p>
            {isCollapsed && <div className="ai-hero-synopsis-fade" />}
          </div>
          {needsExpand && (
            <button className="ai-hero-readmore" onClick={() => setExpanded(e => !e)}>
              {expanded ? "Show Less" : "Show More"}
            </button>
          )}

          {/* Genres */}
          <div className="ai-hero-genres">
            {anime.genres.map(g => (
              <Link key={g} to={`/browse/anime?genre=${g}`} className="ai-hero-genre">
                {g}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="ai-hero-actions">
            <Link to={`/anime/${anime.id}`} className="ai-btn-primary">
              <Play size={16} fill="currentColor" /> Watch Now
            </Link>

            <div className="ai-dropdown-wrap" ref={listRef}>
              <button className="ai-btn-secondary" onClick={() => { setListOpen(o => !o); setShareOpen(false); }}>
                <Plus size={14} /> {listStatus || "Add to List"}
              </button>
              {listOpen && (
                <div className="ai-dropdown-menu" role="menu">
                  {LIST_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      className="ai-dropdown-item"
                      role="menuitem"
                      onClick={() => { setListStatus(opt === listStatus ? "" : opt); setListOpen(false); }}
                    >
                      {opt}
                      {listStatus === opt && <Check size={14} className="ai-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="ai-dropdown-wrap" ref={shareRef}>
              <button className="ai-btn-icon" onClick={() => { setShareOpen(o => !o); setListOpen(false); setDownloadOpen(false); }} aria-label="Share">
                <Share2 size={16} />
              </button>
              {shareOpen && (
                <div className="ai-share-popup">
                  {SHARE_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      className={`ai-share-option ${opt.key === "copy" && copied ? "copied" : ""}`}
                      onClick={() => handleShare(opt.key)}
                    >
                      {opt.key === "copy" && copied ? <Check size={16} /> : <opt.icon size={16} />}
                      {opt.key === "copy" && copied ? "Copied!" : opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="ai-dropdown-wrap" ref={downloadRef}>
              <button className="ai-btn-secondary" onClick={() => { setDownloadOpen(o => !o); setListOpen(false); setShareOpen(false); }}>
                <Download size={14} /> Download
              </button>
              {downloadOpen && (
                <div className="ai-dropdown-menu" role="menu">
                  <a className="ai-dropdown-item" href={`https://nyaa.si/?f=0&c=1_0&q=${encodeURIComponent(anime.name)}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} /> Nyaa.si
                  </a>
                  <a className="ai-dropdown-item" href={`https://anidl.org/?s=${encodeURIComponent(anime.name)}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} /> AniDL
                  </a>
                  <button className="ai-dropdown-item" onClick={() => { setDownloadOpen(false); }}>
                    <Download size={14} /> Batch (coming soon)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="ai-body">
        {/* ─── SIDEBAR ─── */}
        <div className="ai-sidebar">
          <div className="ai-info-box">
            <div className="ai-info-row">
              <Tv size={16} className="ai-info-icon" />
              <span className="ai-info-label">Type</span>
              <span className="ai-info-value">{anime.type}</span>
            </div>
            <div className="ai-info-row">
              <Film size={16} className="ai-info-icon" />
              <span className="ai-info-label">Episodes</span>
              <span className="ai-info-value">{anime.episodes || "N/A"}</span>
            </div>
            <div className="ai-info-row">
              <Clock size={16} className="ai-info-icon" />
              <span className="ai-info-label">Duration</span>
              <span className="ai-info-value">{anime.duration ? `${anime.duration} min` : "N/A"}</span>
            </div>
            <div className="ai-info-row">
              <RefreshCw size={16} className="ai-info-icon" />
              <span className="ai-info-label">Status</span>
              <span className="ai-info-value">{anime.status}</span>
            </div>
            <div className="ai-info-row">
              <Calendar size={16} className="ai-info-icon" />
              <span className="ai-info-label">Start Date</span>
              <span className="ai-info-value">{formatDate(anime.startDate)}</span>
            </div>
            <div className="ai-info-row">
              <Monitor size={16} className="ai-info-icon" />
              <span className="ai-info-label">Season</span>
              <span className="ai-info-value">{anime.season || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="ai-main">
          {/* Alternative Titles */}
          <div className="ai-section">
            <h2 className="ai-section-title">Alternative Titles</h2>
            <div className="ai-alt-scroll">
              <div className="ai-alt-chip"><strong>English:</strong> {anime.name}</div>
              {anime.romaji && anime.romaji !== anime.name && (
                <div className="ai-alt-chip"><strong>Romaji:</strong> {anime.romaji}</div>
              )}
              {anime.native && (
                <div className="ai-alt-chip"><strong>Native:</strong> {anime.native}</div>
              )}
            </div>
          </div>

          {/* Studios */}
          {anime.studios.length > 0 && (
            <div className="ai-section">
              <h2 className="ai-section-title">Studios</h2>
              <div className="ai-studio-scroll">
                {anime.studios.map(s => (
                  <button key={s} className="ai-studio-btn" title={`View ${s} page`}>
                    <ExternalLink size={12} /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="ai-section">
            <h2 className="ai-section-title">Stats</h2>
            <div className="ai-stats-grid">
              <div className="ai-stat-card">
                <div className="ai-stat-number">{anime.episodes || "—"}</div>
                <div className="ai-stat-label"><Film size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> Episodes</div>
              </div>
              <div className="ai-stat-card">
                <div className="ai-stat-number">{anime.duration ? `${anime.duration}` : "—"}</div>
                <div className="ai-stat-label"><Clock size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> Duration (min)</div>
              </div>
              <div className="ai-stat-card">
                <div className="ai-stat-number">{anime.rating ? anime.rating.toFixed(1) : "—"}</div>
                <div className="ai-stat-label"><Star size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> Rating</div>
              </div>
              <div className="ai-stat-card">
                <div className="ai-stat-number">{anime.popularity || "—"}</div>
                <div className="ai-stat-label"><Globe size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> Popularity</div>
              </div>
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="ai-section">
              <h2 className="ai-section-title">Related</h2>
              <div className="ai-related-wrap">
                <button className={`ai-related-arrow ai-related-arrow-left${canScrollLeft ? "" : " hidden"}`} onClick={() => scrollRelated(-1)} aria-label="Scroll left">
                  <ChevronLeft size={24} />
                </button>
                <button className={`ai-related-arrow ai-related-arrow-right${canScrollRight ? "" : " hidden"}`} onClick={() => scrollRelated(1)} aria-label="Scroll right">
                  <ChevronRight size={24} />
                </button>
                <div className="ai-related-scroll" ref={relatedRef}>
                  {related.map(r => (
                    <Link key={r.id} to={`/anime/${r.id}/info`} className={`ai-related-card ${Number(r.id) === Number(id) ? "active" : ""}`}>
                      <div className="ai-related-card-img-wrap">
                        <img className="ai-related-card-img" src={r.image} alt={r.name} loading="lazy" />
                        <div className="ai-related-card-overlay">
                          <div className="ai-related-card-overlay-title">{r.name}</div>
                          <div className="ai-related-card-overlay-meta">
                            <span>TV</span>
                          </div>
                        </div>
                      </div>
                      <div className="ai-related-card-body">
                        <div className="ai-related-card-title">{r.name}</div>
                        <div className="ai-related-card-meta">
                          <span>TV</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
