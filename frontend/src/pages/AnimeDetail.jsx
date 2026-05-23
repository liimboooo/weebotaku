import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader, Play, Star, Tv, Calendar, Clock, Monitor, Search, Film,
  X
} from "lucide-react";
import { getAnimeById } from "../data/animeData";
import { findStreamingSource, getEpisodes, getStreamUrls } from "../services/animeApi";
import { fetchAnimeRecommendations } from "../services/anilistApi";
import Comments from "../components/Comments";
import "./Feeds/AnimeWatch.css";

export default function AnimeDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [apiAnime, setApiAnime] = useState(null);
  const [animeLoading, setAnimeLoading] = useState(true);
  const [animeError, setAnimeError] = useState("");

  const [selectedEp, setSelectedEp] = useState(1);
  const [watchAnime, setWatchAnime] = useState(null);

  const [episodes, setEpisodes] = useState([]);
  const [epIndex, setEpIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(false);
  const [servers, setServers] = useState([]);
  const [serverIndex, setServerIndex] = useState(0);
  const [streamUrl, setStreamUrl] = useState("");
  const [error, setError] = useState("");
  const [iframeError, setIframeError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [streamRetryCount, setStreamRetryCount] = useState(0);
  const [epSearch, setEpSearch] = useState("");
  const [language, setLanguage] = useState("sub");
  const [langKey, setLangKey] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [visibleCount, setVisibleCount] = useState(50);

  const scrollRef = useRef(null);
  const iframeRef = useRef(null);
  const failedServers = useRef(new Set());

  const toStreamUrl = (srv) => {
    if (!srv) return "";
    try {
      const u = new URL(srv.url);
      if (srv.type === "dub") u.searchParams.set("type", "dub");
      return u.toString();
    } catch { return srv.url; }
  };

  const [comments, setComments] = useState([
    { id: 1, user: "AnimeKing", text: "This episode was absolutely insane! The animation quality is top tier 🔥🔥", time: "2 min ago", likes: 42, dislikes: 2, replies: [
      { id: 11, user: "OtakuPro", text: "Totally agree, the fight scene was peak cinema", time: "1 min ago", likes: 12, dislikes: 0 }
    ], pinned: true },
    { id: 2, user: "MangaReader", text: "As a manga reader, I can say they adapted this perfectly. Cant wait for next week!", time: "5 min ago", likes: 28, dislikes: 1, replies: [], pinned: false },
    { id: 3, user: "NightWatcher", text: "Spoiler: ||The main character finally unlocks his true power at the end||", time: "8 min ago", likes: 35, dislikes: 3, replies: [], pinned: false, hasSpoiler: true },
  ]);

  const anime = apiAnime;
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
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!anime) return;
    findStreamingSource(anime.name).then((src) => {
      if (src) setWatchAnime(src);
    }).catch(() => {});
  }, [anime]);

  useEffect(() => {
    if (!watchAnime) return;
    (async () => {
      setLoading(true); setError("");
      try {
        const eps = await getEpisodes(watchAnime.title || watchAnime.slug, watchAnime.tagSlug, watchAnime.source, watchAnime.sourceBase, watchAnime.anilistId);
        if (eps.length > 0) {
          setEpisodes(eps);
          setEpIndex(Math.min(Math.max(0, selectedEp - 1), eps.length - 1));
          setLoading(false);
          return;
        }
      } catch {}
      setError("No streaming links available.");
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchAnime, retryCount]);

  const episode = episodes[epIndex];

  useEffect(() => {
    if (!episode) return;
    (async () => {
      setError(""); setStreamLoading(true); setStreamUrl(""); setServers([]); setServerIndex(0);
      try {
        const urls = await getStreamUrls(episode.url, watchAnime.source, watchAnime.anilistId);
        if (urls.length > 0) { setServers(urls); }
        else setError("No video servers found.");
      } catch { setError("Failed to load stream."); }
      finally { setStreamLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, streamRetryCount]);

  useEffect(() => {
    if (servers.length > 0) {
      const ls = servers.filter(s => s.type === language);
      if (ls.length > 0) {
        setServerIndex(0);
        setStreamUrl(toStreamUrl(ls[0]));
        setLangKey(k => k + 1);
      }
    }
  }, [servers, language]);

  useEffect(() => {
    if (!watchAnime?.anilistId) return;
    fetchAnimeRecommendations(watchAnime.anilistId).then(setRecommendations).catch(() => {});
  }, [watchAnime?.anilistId]);

  useEffect(() => {
    if (scrollRef.current && episodes[epIndex]) {
      const el = scrollRef.current.querySelector(`[data-ep="${epIndex}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [epIndex, episodes]);

  const handleSideScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      setVisibleCount(c => Math.min(c + 50, filteredEpisodes.length));
    }
  };

  const langServers = () => servers.filter(s => s.type === language);

  const switchServer = (idx) => {
    const srv = langServers()[idx];
    if (srv) {
      setServerIndex(idx);
      setIframeError(false);
      failedServers.current = new Set();
      setStreamUrl(toStreamUrl(srv));
    }
  };

  const tryNextServer = () => {
    const nextIdx = serverIndex + 1;
    const ls = langServers();
    if (ls[nextIdx]) {
      failedServers.current.add(serverIndex);
      setServerIndex(nextIdx);
      setIframeError(false);
      setStreamUrl(toStreamUrl(ls[nextIdx]));
    } else {
      setIframeError(true);
    }
  };

  const handleIframeError = () => {
    failedServers.current.add(serverIndex);
    const nextIdx = serverIndex + 1;
    const ls = langServers();
    if (ls[nextIdx]) {
      setIframeError(false);
      setServerIndex(nextIdx);
      setStreamUrl(toStreamUrl(ls[nextIdx]));
    } else {
      setIframeError(true);
    }
  };

  const filteredEpisodes = useMemo(() => {
    if (!epSearch) return episodes;
    const q = epSearch.toLowerCase();
    return episodes.filter(ep =>
      `Episode ${ep.episode}`.toLowerCase().includes(q) ||
      (ep.title && ep.title.toLowerCase().includes(q))
    );
  }, [episodes, epSearch]);

  const metadataItems = useMemo(() => {
    const items = [];
    if (anime) {
      if (anime.year) items.push({ label: "Year", value: anime.year, icon: Calendar });
      if (anime.season) items.push({ label: "Season", value: anime.season, icon: Clock });
      if (anime.status) items.push({ label: "Status", value: anime.status, icon: Tv });
      if (anime.studio) items.push({ label: "Studio", value: anime.studio, icon: Monitor });
      if (anime.director) items.push({ label: "Director", value: anime.director, icon: Monitor });
      if (anime.genres?.length) items.push({ label: "Genres", value: anime.genres.slice(0, 3).join(", "), icon: Film });
    }
    return items;
  }, [anime]);

  if (animeLoading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.08)", borderTopColor: "#a855f7", animation: "watch-spin 0.8s linear infinite" }} />
        <p style={{ color: "#5c5c6b", fontSize: 13 }}>Loading anime...</p>
      </div>
    );
  }

  if (!anime || animeError) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#a0a0ab", fontSize: 14 }}>{animeError || "Anime not found"}</p>
        <button onClick={() => navigate(-1)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.08)", color: "#c084fc", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Go back</button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#000", display: "flex" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.008) 0, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 80% 0%, rgba(139,92,246,0.08), transparent 50%), radial-gradient(circle at 20% 100%, rgba(139,92,246,0.03), transparent 40%)" }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", background: "#050508" }}>
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

          {/* ─── CENTER: PLAYER ─── */}
          <div className="watch-center-col">

            <div className="watch-player-stage">
              {loading && (
                <div className="watch-center">
                  <div className="watch-pulse" />
                  <p className="watch-muted">Loading episodes...</p>
                </div>
              )}
              {!loading && error && (
                <div className="watch-center">
                  <div className="watch-err-badge">!</div>
                  <p className="watch-err-text">{error}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="watch-btn" onClick={() => { if (episodes.length === 0) setRetryCount(c => c + 1); else setStreamRetryCount(c => c + 1); }}>Retry</button>
                  </div>
                </div>
              )}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && (
                <iframe ref={iframeRef} key={`${episode?.episode || 0}-${serverIndex}-${langKey}`} className="watch-frame" src={streamUrl} title={`Episode ${episode?.episode || ""}`} allow="autoplay; fullscreen; encrypted-media" allowFullScreen onError={handleIframeError} />
              )}
              {!loading && !error && iframeError && streamUrl && (
                <div className="watch-center">
                  <div className="watch-err-badge">!</div>
                  <p className="watch-err-text">Episode not available on this source.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {serverIndex < langServers().length - 1 && <button className="watch-btn" onClick={tryNextServer}>Try Next Source</button>}
                    {epIndex < episodes.length - 1 && <button className="watch-btn watch-btn-ghost" onClick={() => { setIframeError(false); failedServers.current = new Set(); setEpIndex(i => i + 1); }}>Skip to Next Episode</button>}
                    <button className="watch-btn watch-btn-ghost" onClick={() => { setIframeError(false); failedServers.current = new Set(); setStreamRetryCount(c => c + 1); }}>Retry</button>
                  </div>
                </div>
              )}
              {!loading && !error && streamLoading && (
                <div className="watch-center"><div className="watch-pulse" /><p className="watch-muted">Loading stream...</p></div>
              )}
              {!loading && !error && !streamLoading && !streamUrl && episode && (
                <div className="watch-center"><p className="watch-muted">Preparing stream...</p></div>
              )}
            </div>

            <div className="watch-scroll-area">

              {/* ═══ COMMENTS ═══ */}
              <Comments comments={comments} setComments={setComments} />

            </div>
          </div>

          {/* ─── RIGHT: EPISODES ─── */}
          <aside className="watch-right-col">
            <div className="watch-side-head">
              <Monitor size={13} />
              <span>Episodes</span>
              <span className="watch-side-count">{episodes.length}</span>
            </div>
            <div className="watch-search-wrap">
              <Search size={13} className="watch-search-icon" />
              <input className="watch-search-input" type="text" placeholder="Search episodes..." value={epSearch} onChange={e => { setEpSearch(e.target.value); if (!e.target.value) setVisibleCount(50); }} />
              {epSearch && <button className="watch-search-clear" onClick={() => { setEpSearch(""); setVisibleCount(50); }}><X size={12} /></button>}
            </div>
            <div className="watch-side-scroll" ref={scrollRef} onScroll={handleSideScroll}>
              {loading ? (
                <div className="watch-center" style={{ padding: 40 }}><Loader size={18} className="watch-spin" /></div>
              ) : filteredEpisodes.length === 0 ? (
                <div className="watch-center" style={{ padding: 40 }}><p className="watch-muted">{epSearch ? "No matching episodes" : "No episodes"}</p></div>
              ) : (
                filteredEpisodes.slice(0, visibleCount).map((ep, i) => {
                  const realIdx = episodes.indexOf(ep);
                  return (
                    <button key={ep.id || realIdx} data-ep={realIdx} className={`watch-ep-item ${realIdx === epIndex ? "active" : ""}`} onClick={() => { setEpIndex(realIdx); }}>
                      <div className="watch-ep-thumb">
                        {anime.img && <img src={anime.img} alt="" />}
                        <div className="watch-ep-thumb-overlay"><Play size={10} /></div>
                      </div>
                      <div className="watch-ep-info">
                        <span className="watch-ep-name">Episode {ep.episode}</span>
                        {ep.title && <span className="watch-ep-title">{ep.title}</span>}
                        <span className="watch-ep-date">{ep.airDate ? new Date(ep.airDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : ep.aired ? "Aired" : "Upcoming"}</span>
                      </div>
                      {realIdx === epIndex && <div className="watch-ep-active-dot" />}
                    </button>
                  );
                })
              )}
            </div>

            {recommendations.length > 0 && (
              <div className="watch-side-rec">
                <div className="watch-side-head" style={{ paddingTop: 8 }}>
                  <Star size={13} />
                  <span>Recommended Anime</span>
                </div>
                {recommendations.slice(0, 5).map((rec, i) => (
                  <button key={rec.id || i} className="watch-rec-item" onClick={() => navigate(`/anime/${rec.id}`)}>
                    <div className="watch-rec-thumb">
                      <img src={rec.image} alt="" />
                    </div>
                    <div className="watch-rec-info">
                      <span className="watch-rec-name">{rec.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}
