import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Loader, Play,
  Star, Monitor, Search, Calendar, Clock, Tv, Film,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { getEpisodes, getStreamUrls, getEpisodePage } from "../../services/animeApi";
import { fetchAnimeRecommendations } from "../../services/anilistApi";
import Comments from "../../components/Comments";
import commentService from "../../services/commentService";
import "./AnimeWatch.css";

export default function AnimeWatch({ anime, animeName, onClose, startEp = 1, onEpisodeChange, detail, totalEpisodes }) {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState([]);
  const [epIndex, setEpIndex] = useState(Math.max(0, startEp - 1));
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
  const [recommendations, setRecommendations] = useState([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const [epPage, setEpPage] = useState(0);
  const [hasMoreEps, setHasMoreEps] = useState(false);
  const [allEpsLoaded, setAllEpsLoaded] = useState(false);
  const [language, setLanguage] = useState("sub");
  const [seekTo, setSeekTo] = useState(null);

  const handleSeek = useCallback((seconds) => {
    setSeekTo(seconds);
  }, []);

  const filteredServers = useMemo(() => {
    return servers.filter(s => s.type === language);
  }, [servers, language]);

  useEffect(() => {
    const langServers = servers.filter(s => s.type === language);
    if (langServers.length > 0) {
      setServerIndex(0);
      setStreamUrl(makeStreamUrl(langServers[0]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, servers]);

  const makeStreamUrl = useCallback((srv) => {
    if (!srv) return "";
    try {
      const u = new URL(srv.url);
      if (srv.type === "dub") u.searchParams.set("type", "dub");
      return u.toString();
    } catch { return srv.url; }
  }, []);

  const scrollRef = useRef(null);
  const iframeRef = useRef(null);
  const failedServers = useRef(new Set());

  /* ─── COMMENTS ─── */
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!anime.anilistId) return;
    commentService.getComments(anime.anilistId, { episode: (epIndex + 1), limit: 50 })
      .then(res => {
        if (res.success) {
          const mapped = res.data.map(c => ({
            id: c._id || c.id,
            user: c.user?.username || "Unknown",
            avatar: c.user?.avatar || null,
            text: c.content,
            time: new Date(c.createdAt).getTime().toString(),
            likes: c.likes?.length || 0,
            dislikes: c.dislikes?.length || 0,
            replies: (c.replies || []).map(r => ({
              id: r._id || r.id,
              user: r.user?.username || "Unknown",
              avatar: r.user?.avatar || null,
              text: r.content,
              time: new Date(r.createdAt).getTime().toString(),
              likes: r.likes?.length || 0,
              dislikes: 0,
              replies: [],
            })),
            pinned: c.pinned || false,
            hasSpoiler: c.isSpoiler || false,
          }));
          setComments(mapped);
        }
      }).catch(() => {});
  }, [anime.anilistId, epIndex]);

  const handleAddComment = async (text) => {
    if (!anime.anilistId) return;
    await commentService.createComment(anime.anilistId, text, { episode: epIndex + 1 });
    const res = await commentService.getComments(anime.anilistId, { episode: epIndex + 1, limit: 50 });
    if (res.success) {
      const mapped = res.data.map(c => ({
        id: c._id || c.id,
        user: c.user?.username || "Unknown",
        avatar: c.user?.avatar || null,
        text: c.content,
        time: new Date(c.createdAt).getTime().toString(),
        likes: c.likes?.length || 0,
        dislikes: c.dislikes?.length || 0,
        replies: (c.replies || []).map(r => ({
          id: r._id || r.id,
          user: r.user?.username || "Unknown",
          avatar: r.user?.avatar || null,
          text: r.content,
          time: new Date(r.createdAt).getTime().toString(),
          likes: r.likes?.length || 0,
          dislikes: 0,
          replies: [],
        })),
        pinned: c.pinned || false,
        hasSpoiler: c.isSpoiler || false,
      }));
      setComments(mapped);
    }
  };

  const handleLikeComment = async (id) => {
    await commentService.likeComment(id).catch(() => {});
  };

  const handleDislikeComment = async (id) => {
    await commentService.dislikeComment(id).catch(() => {});
  };

  const handleReplyComment = async (parentId, content) => {
    await commentService.replyToComment(parentId, content).catch(() => {});
  };

  const handleEditComment = async (id, content) => {
    await commentService.editComment(id, content).catch(() => {});
  };

  const handleDeleteComment = async (id) => {
    await commentService.deleteComment(id).catch(() => {});
  };

  useEffect(() => {
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; setError("Request timed out. Try again."); setLoading(false); }, 25000);
    (async () => {
      setLoading(true); setError(""); setEpPage(0); setAllEpsLoaded(false);
      try {
        const result = await getEpisodePage(
          anime.title || anime.slug, anime.tagSlug,
          anime.source, anime.sourceBase, anime.anilistId, 0
        );
        if (timedOut) return;
        clearTimeout(timer);
        if (result.episodes.length > 0) {
          setEpisodes(result.episodes);
          setHasMoreEps(result.hasMore);
          setEpIndex(Math.min(Math.max(0, startEp - 1), result.episodes.length - 1));
          setLoading(false);
          return;
        }
      } catch {}
      if (!timedOut) { clearTimeout(timer); setError("No streaming links available."); setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime.title, anime.slug, retryCount]);

  const loadMoreEpisodes = async () => {
    const nextPage = epPage + 1;
    const result = await getEpisodePage(
      anime.title || anime.slug, anime.tagSlug,
      anime.source, anime.sourceBase, anime.anilistId, nextPage
    );
    if (result.episodes.length > 0) {
      setEpisodes(prev => [...prev, ...result.episodes]);
      setEpPage(nextPage);
      setHasMoreEps(result.hasMore);
    }
    if (!result.hasMore) setAllEpsLoaded(true);
  };

  const episode = episodes[epIndex];

  const [streamCache, setStreamCache] = useState({});

  useEffect(() => {
    if (!episode) return;
    const cached = streamCache[episode.url];
    if (cached) {
      setError(""); setStreamLoading(false); setStreamUrl(""); setServers(cached); setServerIndex(0);
      return;
    }
    (async () => {
      setError(""); setStreamLoading(true); setStreamUrl(""); setServers([]); setServerIndex(0);
      try {
        const urls = await getStreamUrls(episode.url, anime.source, anime.anilistId, anime.anilistId, anime.slug);
        if (urls.length > 0) {
          setServers(urls);
          setStreamCache(c => ({ ...c, [episode.url]: urls }));
        }
        else setError("No video servers found.");
      } catch { setError("Failed to load stream."); }
      finally { setStreamLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, streamRetryCount]);

  useEffect(() => {
    const nextEp = episodes[epIndex + 1];
    if (!nextEp || streamCache[nextEp.url]) return;
    getStreamUrls(nextEp.url, anime.source, anime.anilistId).then(urls => {
      if (urls.length > 0) setStreamCache(c => ({ ...c, [nextEp.url]: urls }));
    }).catch(() => {});
  }, [epIndex, episodes, anime.anilistId, streamCache]);

  useEffect(() => {
    if (!anime.anilistId) return;
    fetchAnimeRecommendations(anime.anilistId).then(setRecommendations).catch(() => {});
  }, [anime.anilistId]);

  useEffect(() => {
    if (scrollRef.current && episodes[epIndex]) {
      const el = scrollRef.current.querySelector(`[data-ep="${epIndex}"]`);
      el?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [epIndex, episodes]);

  const handleSideScroll = useCallback((e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      setVisibleCount(c => Math.min(c + 50, filteredEpisodes.length));
    }
  }, [filteredEpisodes.length]);

  const switchServer = (idx) => {
    const srv = filteredServers[idx];
    if (srv) {
      setServerIndex(idx);
      setIframeError(false);
      failedServers.current = new Set();
      setStreamUrl(makeStreamUrl(srv));
    }
  };

  const tryNextServer = useCallback(() => {
    const nextIdx = serverIndex + 1;
    if (filteredServers[nextIdx]) {
      failedServers.current.add(serverIndex);
      setServerIndex(nextIdx);
      setIframeError(false);
      setStreamUrl(makeStreamUrl(filteredServers[nextIdx]));
    } else {
      setIframeError(true);
    }
  }, [serverIndex, filteredServers, makeStreamUrl]);

  const handleIframeError = useCallback(() => {
    failedServers.current.add(serverIndex);
    const nextIdx = serverIndex + 1;
    if (filteredServers[nextIdx]) {
      setIframeError(false);
      setServerIndex(nextIdx);
      setStreamUrl(makeStreamUrl(filteredServers[nextIdx]));
    } else {
      setIframeError(true);
    }
  }, [serverIndex, filteredServers, makeStreamUrl]);

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
    if (detail) {
      if (detail.year) items.push({ label: "Year", value: detail.year, icon: Calendar });
      if (detail.season) items.push({ label: "Season", value: detail.season, icon: Clock });
      if (detail.status) items.push({ label: "Status", value: detail.status, icon: Tv });
      if (detail.studio) items.push({ label: "Studio", value: detail.studio, icon: Monitor });
      if (detail.director) items.push({ label: "Director", value: detail.director, icon: Monitor });
      if (detail.genres?.length) items.push({ label: "Genres", value: detail.genres.slice(0, 3).join(", "), icon: Film });
    }
    return items;
  }, [detail]);

  return createPortal(
    <motion.div className="watch-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
    >
      <div className="watch-bg-ornament" />
      <motion.div className="watch-shell" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
      >
        <div className="watch-main">
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="watch-btn" onClick={() => { if (episodes.length === 0) setRetryCount(c => c + 1); else setStreamRetryCount(c => c + 1); }}>Retry</button>
                  </div>
                </div>
              )}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && (
                <iframe
                  ref={iframeRef}
                  key={`${episode?.episode || 0}-${serverIndex}-${seekTo ?? 0}`}
                  className="watch-frame"
                  src={seekTo != null ? `${streamUrl}${streamUrl.includes("#") ? "&" : "#"}t=${seekTo}` : streamUrl}
                  title={`Episode ${episode?.episode || ""}`}
                  allow="autoplay; fullscreen; encrypted-media"
                  allowFullScreen
                  onError={handleIframeError}
                />
              )}
              {!loading && !error && iframeError && streamUrl && (
                <div className="watch-center">
                  <div className="watch-err-badge">!</div>
                  <p className="watch-err-text">Episode not available on this source.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {serverIndex < filteredServers.length - 1 && <button className="watch-btn" onClick={tryNextServer}>Try Next Source</button>}
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
              <div className="watch-notif-banner">
                <span>Report broken episodes to help us improve</span>
              </div>

              {/* ═══ COMMENTS ═══ */}
              <Comments comments={comments} setComments={setComments} onSeek={handleSeek} onAdd={handleAddComment} onLikeComment={handleLikeComment} onDislikeComment={handleDislikeComment} onReplyComment={handleReplyComment} onEditComment={handleEditComment} onDeleteComment={handleDeleteComment} />

            </div>
          </div>

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
                <>
                  {filteredEpisodes.slice(0, visibleCount).map((ep, i) => {
                    const realIdx = episodes.indexOf(ep);
                    return (
                      <motion.button key={ep.id || realIdx} data-ep={realIdx} className={`watch-ep-item ${realIdx === epIndex ? "active" : ""}`} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300 }} onClick={() => { setEpIndex(realIdx); if (onEpisodeChange) onEpisodeChange(ep.episode); }}>
                        <div className="watch-ep-thumb">
                          {detail?.img && <img src={detail.img} alt="" />}
                          <div className="watch-ep-thumb-overlay"><Play size={10} /></div>
                        </div>
                        <div className="watch-ep-info">
                          <span className="watch-ep-name">Episode {ep.episode}</span>
                          {ep.title && <span className="watch-ep-title">{ep.title}</span>}
                          <span className="watch-ep-date">{ep.airDate ? new Date(ep.airDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : ep.aired ? "Aired" : "Upcoming"}</span>
                        </div>
                        {realIdx === epIndex && <div className="watch-ep-active-dot" />}
                      </motion.button>
                    );
                  })}
                  {(hasMoreEps || filteredEpisodes.length > visibleCount) && (
                    <button className="watch-ep-load-more" onClick={() => {
                      if (hasMoreEps && !allEpsLoaded) loadMoreEpisodes();
                      setVisibleCount(c => c + 50);
                    }}>
                      Load More ({filteredEpisodes.length - visibleCount} remaining)
                    </button>
                  )}
                </>
              )}
            </div>

            {recommendations.length > 0 && (
              <div className="watch-side-rec">
                <div className="watch-side-head" style={{ paddingTop: 8 }}>
                  <Star size={13} />
                  <span>Recommended Anime</span>
                </div>
                <div className="watch-rec-scroll">
                  {recommendations.map((rec, i) => (
                    <button key={rec.id || i} className="watch-rec-item" onClick={() => navigate(`/anime/${rec.id}/info`)}>
                      <div className="watch-rec-thumb">
                        <img src={rec.image} alt="" />
                      </div>
                      <div className="watch-rec-info">
                        <span className="watch-rec-name">{rec.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
