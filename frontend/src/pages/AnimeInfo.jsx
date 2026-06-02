import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Play, Share2, X, Check, Copy, Globe, MessageCircle, AtSign, Eye,
  Bookmark, Heart, ChevronDown, ChevronUp, Bell, Grid, List, AlignJustify
} from "lucide-react";
import { fetchAnimeRecommendations, fetchAnimeCharacters } from "../services/anilistApi";
import api from "../services/api";
import { loadWatchHistory } from "../services/storage";
import usePrefetchAnime from "../hooks/usePrefetchAnime";
import useDocumentTitle from "../hooks/useDocumentTitle";

// No need for external AnimeInfo.css anymore as we use pure Tailwind
// Remove import "./AnimeInfo.css";

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

function getNextEpText(anime) {
  if (!anime) return null;
  if (anime.nextEpDate && anime.nextEpDate !== "Ended") {
    try {
      const nextDate = new Date(anime.nextEpDate);
      const now = new Date();
      const diff = nextDate - now;
      if (diff > 0) {
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days === 1) return "in 1 day";
        return `in ${days} days`;
      }
    } catch {}
  }
  return null;
}

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
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
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [epLayout, setEpLayout] = useState("grid");

  const shareRef = useRef(null);

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
  const synopsisTruncated = synopsisClean.length > 350;
  const displayedSynopsis = synopsisExpanded || !synopsisTruncated
    ? synopsisClean
    : synopsisClean.slice(0, 350) + "...";

  const totalEpisodes = anime?.episodes || 0;
  const epArray = Array.from({ length: totalEpisodes }, (_, i) => i + 1).reverse();

  const posterImg = anime?.img || "";
  const bannerImg = anime?.bannerImage || anime?.img || "";

  const statusFormatted = formatStatus(anime?.status);
  const statusLower = (anime?.status || "").toLowerCase();
  const isAiring = statusLower.includes("air") || statusLower === "releasing" || statusLower === "ongoing";

  const nextEpText = getNextEpText(anime);

  const epTitles = [
    "Asa and Yuru", "Right and Left", "Dera and Hana", "Jin and Yuru",
    "Hare and Tortoise", "The Kagemori Clan and the Unknown Assailants",
    "Asa and Break", "Suspicion and Conviction", "Embrace and Whisper",
    "Dawn and Dusk", "Light and Shadow", "Fire and Ice"
  ];

  const epDescriptions = [
    "In a world where certain humans command mighty daemons, a young boy discovers his hidden power.",
    "Guided by Dera, Yuru flees from his pursuers and awakens the guardian deities of the village.",
    "Yuru learns the truth about his village and learns the rules of modern society as he rides down the mountain.",
    "After a short rest, Yuru and his Daemons begin their search for Asa by sniffing out her blood.",
    "Yuru and his Daemons track the scent of Asa's blood to a warehouse, where they encounter Jin and his men.",
    "Yuru is reunited with Asa at the Kagemori mansion and asks her about their parents.",
    "The morning after the battle, Yuru asks about the eyepatch covering her right eye.",
    "Dera arrives at the Kagemori mansion to retrieve Yuru, and they're invited to breakfast by the clan head.",
    "In order to cheer Yuru up, Dera drags him and his Daemons around the city to see the sights.",
    "As twilight falls, the ancient guardians stir from their slumber.",
    "The boundary between worlds grows thin as old enemies return.",
    "An unexpected alliance forms in the heat of battle."
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070708] flex flex-col pt-20">
        <div className="w-full h-[50vh] bg-[#0b0c10] animate-pulse"></div>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#070708] to-[#0b0c10] flex flex-col items-center justify-center gap-4 text-white">
        <div className="text-lg text-neutral-500">{error || "Anime not found."}</div>
        <button className="px-6 py-2 bg-neutral-800 rounded-full hover:bg-neutral-700 transition" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#070708] to-[#0b0c10] text-[#e3e3e3] font-sans antialiased overflow-x-hidden selection:bg-neutral-800 selection:text-white">
      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative w-full min-h-[55vh] flex items-end justify-center pt-32 pb-12">
        {/* Banner Image & Gradient Masks */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <img src={bannerImg} alt="Banner" className="w-full h-full object-cover opacity-[0.35]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070708]/40 via-[#070708]/60 to-[#070708]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-transparent to-transparent h-full"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#070708] via-transparent to-[#070708]"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row gap-10 items-start">
          
          {/* Left Column: Poster & Meta */}
          <div className="flex-shrink-0 w-56 md:w-64 flex flex-col gap-4 mx-auto md:mx-0">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/10 aspect-[3/4] relative group">
              <img src={posterImg} alt={anime.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            
            <div className="flex flex-col gap-3 mt-2">
              {isAiring && nextEpText && (
                <div className="w-full bg-[#0c2d1c] text-emerald-400 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-emerald-900/20 ring-1 ring-emerald-500/20">
                  <Bell size={16} />
                  <span>Next ep airing {nextEpText}</span>
                </div>
              )}
              
              {anime.trailerUrl && (
                <button onClick={() => setTrailerOpen(true)} className="w-full bg-neutral-800 hover:bg-neutral-700 transition-colors text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-lg ring-1 ring-white/5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#e53935]"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                  <span>Watch Trailer</span>
                </button>
              )}

              <div className="w-full bg-neutral-900/50 py-3 px-4 rounded-xl flex flex-col gap-1 ring-1 ring-white/5">
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Format</span>
                <span className="text-sm text-neutral-300 font-medium">{anime.type || "TV Show"}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Title, Tags, Actions, Synopsis */}
          <div className="flex-1 flex flex-col md:pt-4">
            {anime.season && (
              <span className="text-sm text-neutral-400 font-semibold uppercase tracking-widest mb-3">
                {anime.season} {anime.year || ""}
              </span>
            )}
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-5 drop-shadow-xl">
              {anime.name}
            </h1>

            <div className="flex flex-wrap gap-2 mb-8">
              {(anime.genres || []).map(g => (
                <Link key={g} to={`/browse/anime?genre=${encodeURIComponent(g)}`} className="bg-[#e2a856] hover:bg-[#cf9649] transition-colors text-black px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide">
                  {g}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              {anime.status === "NOT_YET_RELEASED" || anime.status === "CANCELLED" ? (
                <span className="bg-neutral-800 text-neutral-500 px-8 py-3.5 rounded-full font-bold flex items-center gap-3 cursor-not-allowed">
                  {anime.status === "NOT_YET_RELEASED" ? "Coming Soon" : "Cancelled"}
                </span>
              ) : resumeInfo && !resumeInfo.isFinished ? (
                <Link to={`/anime/${anime.id}?ep=${resumeInfo.episode}`} className="bg-white hover:bg-neutral-200 text-black px-8 py-3.5 rounded-full font-extrabold flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-white/10">
                  <Play size={20} fill="currentColor" />
                  <span>Continue Ep {resumeInfo.episode}</span>
                </Link>
              ) : (
                <Link to={`/anime/${anime.id}?ep=1`} className="bg-white hover:bg-neutral-200 text-black px-8 py-3.5 rounded-full font-extrabold flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-white/10">
                  <Play size={20} fill="currentColor" />
                  <span>Play</span>
                </Link>
              )}

              <button
                onClick={() => setBookmarked(b => !b)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${bookmarked ? "bg-white text-black" : "bg-neutral-800/80 hover:bg-neutral-700 text-white border border-neutral-700"}`}
                aria-label="Bookmark"
              >
                <Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} />
              </button>
              
              <button
                onClick={() => setFavorited(f => !f)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${favorited ? "bg-white text-black" : "bg-neutral-800/80 hover:bg-neutral-700 text-white border border-neutral-700"}`}
                aria-label="Favorite"
              >
                <Heart size={18} fill={favorited ? "currentColor" : "none"} />
              </button>

              <div className="relative" ref={shareRef}>
                <button onClick={() => setShareOpen(o => !o)} className="w-12 h-12 rounded-full flex items-center justify-center bg-neutral-800/80 hover:bg-neutral-700 text-white border border-neutral-700 transition-all">
                  <Share2 size={18} />
                </button>
                {shareOpen && (
                  <div className="absolute top-full mt-2 left-0 w-48 bg-[#121318] border border-neutral-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {SHARE_OPTIONS.map(opt => (
                      <button key={opt.key} onClick={() => handleShare(opt.key)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium text-neutral-300 hover:text-white text-left">
                        {opt.key === "copy" && copied ? <Check size={16} className="text-emerald-400" /> : <opt.icon size={16} />}
                        {opt.key === "copy" && copied ? <span className="text-emerald-400">Copied!</span> : opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {anime.malId && (
                <a href={`https://myanimelist.net/anime/${anime.malId}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center bg-[#2e51a2] hover:bg-[#345bbb] text-white font-bold text-xs transition-all shadow-lg shadow-[#2e51a2]/20">
                  MAL
                </a>
              )}
            </div>

            <div className="max-w-4xl">
              <p className="text-[#9ca3af] text-base leading-relaxed">
                {displayedSynopsis || "No synopsis available."}
              </p>
              {synopsisTruncated && (
                <button onClick={() => setSynopsisExpanded(e => !e)} className="text-white font-semibold flex items-center gap-1.5 mt-3 hover:text-neutral-300 transition-colors text-sm">
                  {synopsisExpanded ? (
                    <>Show Less <ChevronUp size={16} /></>
                  ) : (
                    <>Show More <ChevronDown size={16} /></>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════ MAIN CONTENT TABS & GRID ═══════════ */}
      <section className="w-full max-w-7xl mx-auto px-6 lg:px-12 pb-24">
        
        {/* Navigation Tabs */}
        <div className="relative border-b border-neutral-800/80 mb-6">
          <nav className="flex space-x-8 overflow-x-auto no-scrollbar">
            {TABS.map(t => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`pb-4 text-sm md:text-base font-semibold whitespace-nowrap transition-colors relative ${isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  {t.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full shadow-[0_-2px_10px_rgba(255,255,255,0.5)]"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ─── EPISODES TAB ─── */}
        {activeTab === "episodes" && (
          <div className="animate-in fade-in duration-500">
            {/* Filter Action Row */}
            <div className="flex justify-between items-center mb-6">
              <div className="bg-neutral-800/60 ring-1 ring-white/5 text-neutral-300 px-3.5 py-1.5 rounded-md text-sm font-semibold shadow-inner">
                {totalEpisodes} Episodes
              </div>
              <div className="flex gap-1.5 bg-neutral-900/80 p-1.5 rounded-lg ring-1 ring-white/5">
                <button onClick={() => setEpLayout("grid")} className={`p-1.5 rounded-md transition-colors ${epLayout === "grid" ? "bg-neutral-700 text-white shadow-sm" : "text-neutral-500 hover:text-white"}`}>
                  <Grid size={18} />
                </button>
                <button onClick={() => setEpLayout("list")} className={`p-1.5 rounded-md transition-colors ${epLayout === "list" ? "bg-neutral-700 text-white shadow-sm" : "text-neutral-500 hover:text-white"}`}>
                  <List size={18} />
                </button>
              </div>
            </div>

            {/* Episode Grid */}
            <div className={epLayout === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5" : "flex flex-col gap-4 max-w-4xl"}>
              {epArray.map((ep) => {
                const titleIndex = (ep - 1) % epTitles.length;
                const descIndex = (ep - 1) % epDescriptions.length;
                const base = anime.popularity || 32000;
                const views = Math.floor(base * (0.5 + seededRandom(ep * 137 + (anime.id || 0)) * 0.8));

                return (
                  <Link
                    key={ep}
                    to={`/anime/${anime.id}?ep=${ep}`}
                    className="group flex flex-col sm:flex-row gap-4 bg-[#111216] p-2.5 rounded-2xl border border-neutral-800 hover:bg-[#1a1c23] hover:border-neutral-700 transition-all duration-300 cursor-pointer shadow-lg shadow-black/20"
                  >
                    {/* Thumbnail */}
                    <div className={`relative flex-shrink-0 rounded-xl overflow-hidden bg-neutral-900 ${epLayout === "grid" ? "w-full sm:w-[170px] aspect-video" : "w-full sm:w-[240px] aspect-video"}`}>
                      <img src={bannerImg} alt={`Episode ${ep}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300"></div>
                      
                      {/* Play Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <Play size={16} fill="white" className="text-white ml-0.5" />
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-xs font-bold ring-1 ring-white/10 shadow-sm">
                        Ep {ep}
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1.5 ring-1 ring-white/10 shadow-sm">
                        <Eye size={12} className="text-neutral-400" />
                        {formatCount(views)}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-center py-1 pr-2">
                      <h3 className="text-white font-bold text-[15px] leading-snug mb-1.5 group-hover:text-[#e3e3e3] transition-colors line-clamp-2">
                        {epTitles[titleIndex]}
                      </h3>
                      <p className="text-[13px] text-neutral-400 leading-relaxed line-clamp-2">
                        {epDescriptions[descIndex]}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── CHARACTERS TAB ─── */}
        {activeTab === "characters" && (
          <div className="animate-in fade-in duration-500">
            {characters.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {characters.map((ch, i) => (
                  <div key={ch.id || i} className="bg-[#111216] border border-neutral-800 rounded-2xl p-4 flex flex-col items-center text-center hover:bg-[#1a1c23] hover:border-neutral-700 transition-colors">
                    <img src={ch.image || ch.img || posterImg} alt={ch.name} className="w-20 h-20 rounded-full object-cover mb-3 ring-2 ring-neutral-800" loading="lazy" />
                    <span className="text-white font-bold text-sm mb-1">{ch.name}</span>
                    <span className="text-neutral-500 text-xs font-semibold">{ch.role || ch.title || "Character"}</span>
                    {ch.voiceActor && <span className="text-neutral-600 text-[10px] uppercase tracking-wider mt-2">{ch.voiceActor}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-neutral-500">No characters available.</div>
            )}
          </div>
        )}

        {/* ─── RELATED / MORE LIKE THIS TABS ─── */}
        {(activeTab === "related" || activeTab === "more-like-this") && (
          <div className="animate-in fade-in duration-500">
            {(() => {
              const list = activeTab === "related" ? (anime.related || []) : related;
              return list.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {list.map((r, i) => (
                    <Link key={r.id || i} to={`/anime/${r.id}/info`} className="group flex flex-col bg-[#111216] border border-neutral-800 rounded-2xl overflow-hidden hover:bg-[#1a1c23] hover:border-neutral-700 transition-all duration-300">
                      <div className="w-full aspect-[3/4] relative overflow-hidden">
                        <img src={r.img || r.image || posterImg} alt={r.title || r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Play size={32} fill="white" className="text-white drop-shadow-xl" />
                        </div>
                      </div>
                      <div className="p-3.5 flex flex-col gap-1.5">
                        <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-neutral-200 transition-colors">{r.title || r.name}</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {(r.genres || []).slice(0, 2).map(g => (
                            <span key={g} className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider">{g}</span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-neutral-500">No suggestions available.</div>
              );
            })()}
          </div>
        )}

      </section>

      {/* ─── TRAILER MODAL ─── */}
      {trailerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setTrailerOpen(false)}></div>
          <div className="relative w-[90%] max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 z-10 zoom-in-95 animate-in duration-300">
            <button onClick={() => setTrailerOpen(false)} className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-neutral-800 text-white rounded-full flex items-center justify-center transition-colors z-20 backdrop-blur-md">
              <X size={20} />
            </button>
            <iframe
              src={anime.trailerUrl}
              title="Trailer"
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
