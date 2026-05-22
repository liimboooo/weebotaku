import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Loader, Play,
  Star, Tv, Calendar, Clock, Monitor, Search, Film,
  Bookmark, Heart,
  MessageCircle, ThumbsUp, ThumbsDown,
  Reply, Pin, EyeOff, Users,
  AlertCircle, X, ArrowLeft
} from "lucide-react";
import { motion } from "framer-motion";
import { getEpisodes, getStreamUrls } from "../../services/animeApi";
import "./AnimeWatch.css";

const SORT_TABS = [
  { key: "top", label: "Top" },
  { key: "newest", label: "Newest" },
  { key: "liked", label: "Most Liked" },
];

const MOCK_COMMENTS = [
  { id: 1, user: "AnimeKing", avatar: "", text: "This episode was absolutely insane! The animation quality is top tier \uD83D\uDD25\uD83D\uDD25", time: "2 min ago", likes: 42, dislikes: 2, replies: [
    { id: 11, user: "OtakuPro", avatar: "", text: "Totally agree, the fight scene was peak cinema", time: "1 min ago", likes: 12, dislikes: 0 }
  ], pinned: true },
  { id: 2, user: "MangaReader", avatar: "", text: "As a manga reader, I can say they adapted this perfectly. Cant wait for next week!", time: "5 min ago", likes: 28, dislikes: 1, replies: [], pinned: false },
  { id: 3, user: "NightWatcher", avatar: "", text: "Spoiler: ||The main character finally unlocks his true power at the end||", time: "8 min ago", likes: 35, dislikes: 3, replies: [], pinned: false, hasSpoiler: true },
];

export default function AnimeWatch({ anime, animeName, onClose, startEp = 1, onEpisodeChange, detail, totalEpisodes }) {
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
  const [language, setLanguage] = useState("sub");

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
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [commentSort, setCommentSort] = useState("top");
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [spoilerMode, setSpoilerMode] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        const eps = await getEpisodes(anime.title || anime.slug, anime.tagSlug, anime.source, anime.sourceBase, anime.anilistId);
        if (eps.length > 0) {
          setEpisodes(eps);
          setEpIndex(Math.min(Math.max(0, startEp - 1), eps.length - 1));
          setLoading(false);
          return;
        }
      } catch {}
      setError("No streaming links available.");
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime.title, anime.slug, retryCount]);

  const episode = episodes[epIndex];

  useEffect(() => {
    if (!episode) return;
    (async () => {
      setError(""); setStreamLoading(true); setStreamUrl(""); setServers([]); setServerIndex(0);
      try {
        const urls = await getStreamUrls(episode.url, anime.source, anime.anilistId);
        if (urls.length > 0) { setServers(urls); }
        else setError("No video servers found.");
      } catch { setError("Failed to load stream."); }
      finally { setStreamLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, streamRetryCount]);

  const [prefetchCache, setPrefetchCache] = useState({});
  useEffect(() => {
    const nextEp = episodes[epIndex + 1];
    if (!nextEp || !anime.anilistId || prefetchCache[nextEp.url]) return;
    const nextUrl = `https://anime-proxy.mohamedlimam80000.workers.dev/?url=${encodeURIComponent(`https://reanime.to/api/flix/${anime.anilistId}/${nextEp.url}`)}`;
    if (!nextUrl) return;
    setPrefetchCache(p => ({ ...p, [nextEp.url]: true }));
    fetch(nextUrl, { signal: AbortSignal.timeout(10000) }).catch(() => {});
  }, [epIndex, episodes, anime.anilistId, prefetchCache]);

  useEffect(() => {
    if (scrollRef.current && episodes[epIndex]) {
      const el = scrollRef.current.querySelector(`[data-ep="${epIndex}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [epIndex, episodes]);

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

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now(),
      user: "You",
      avatar: "",
      text: commentText,
      time: "Just now",
      likes: 0,
      dislikes: 0,
      replies: [],
      pinned: false,
    };
    if (replyTo) {
      setComments(c => c.map(cm => cm.id === replyTo ? { ...cm, replies: [...cm.replies, { ...newComment, id: Date.now() + 1, user: "You" }] } : cm));
      setReplyTo(null);
    } else {
      setComments(c => [newComment, ...c]);
    }
    setCommentText("");
  };

  const handleLikeComment = (id, isReply, parentId) => {
    if (isReply && parentId) {
      setComments(c => c.map(cm => cm.id === parentId ? { ...cm, replies: cm.replies.map(r => r.id === id ? { ...r, likes: r.likes + 1 } : r) } : cm));
    } else {
      setComments(c => c.map(cm => cm.id === id ? { ...cm, likes: cm.likes + 1 } : cm));
    }
  };

  const sortedComments = useMemo(() => {
    const pinned = comments.filter(c => c.pinned);
    const rest = comments.filter(c => !c.pinned);
    if (commentSort === "top") return [...pinned, ...rest.sort((a, b) => b.likes - a.likes)];
    if (commentSort === "liked") return [...pinned, ...rest.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes))];
    return [...pinned, ...rest];
  }, [comments, commentSort]);

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
          <aside className="watch-left-col">
            <div className="watch-info-card">
              <button className="watch-info-close" onClick={onClose} aria-label="Close">
                <ArrowLeft size={16} />
              </button>
              <div className="watch-poster-wrap">
                {detail?.img ? (
                  <img src={detail.img} alt="" className="watch-poster" />
                ) : (
                  <div className="watch-poster-fallback"><Film size={32} /></div>
                )}
                <div className="watch-poster-glow" />
              </div>
              <h1 className="watch-info-title">{detail?.name || animeName || anime.title}</h1>
              {detail?.jpTitle && <p className="watch-info-jp">{detail.jpTitle}</p>}
              <div className="watch-info-badges">
                {detail?.rating && (
                  <span className="watch-badge"><Star size={10} /> {detail.rating.toFixed(1)}</span>
                )}
                <span className="watch-badge"><Tv size={10} /> {detail?.episodes || totalEpisodes || episodes.length || "?"} EP</span>
                {detail?.status && <span className="watch-badge">{detail.status}</span>}
              </div>
              {detail?.synopsis && <p className="watch-info-synopsis">{detail.synopsis}</p>}
              {metadataItems.length > 0 && (
                <div className="watch-info-meta">
                  {metadataItems.map((item, i) => (
                    <div key={i} className="watch-meta-row">
                      <span className="watch-meta-label">{item.label}</span>
                      <span className="watch-meta-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="watch-info-actions">
                <button className="watch-info-action" title="Watchlist"><Bookmark size={14} /></button>
                <button className="watch-info-action" title="Like"><Heart size={14} /></button>
              </div>
            </div>
          </aside>

          <div className="watch-center-col">
            <header className="watch-topbar">
              <span className="watch-topbar-ep">{episode && `Episode ${episode.episode}`}</span>
            </header>

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
                  key={`${episode?.episode || 0}-${serverIndex}`}
                  className="watch-frame"
                  src={streamUrl}
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

              <div className="watch-info-bar">
                <div className="watch-info-bar-left">
                  <span className="watch-info-bar-ep">Episode {episode?.episode || startEp}{totalEpisodes && <span className="watch-info-bar-total"> / {totalEpisodes}</span>}</span>
                </div>
                <div className="watch-servers">
                  <div className="watch-lang-toggle">
                    <button className={`watch-lang-btn ${language === "sub" ? "active" : ""}`} onClick={() => setLanguage("sub")}>SUB</button>
                    <button className={`watch-lang-btn ${language === "dub" ? "active" : ""}`} onClick={() => setLanguage("dub")}>DUB</button>
                  </div>
                  <div className="watch-servers-list">
                    {filteredServers.map((s, i) => (
                      <button key={i} className={`watch-server-chip ${i === serverIndex ? "active" : ""}`} onClick={() => switchServer(i)}>{s.label || `Server ${i + 1}`}</button>
                    ))}
                    {servers.length === 0 && !streamLoading && <span className="watch-muted" style={{ fontSize: 12, padding: "5px 0" }}>No servers loaded</span>}
                  </div>
                </div>
              </div>

              {/* ═══ COMMENTS ═══ */}
              <section className="watch-section">
                <div className="watch-section-head">
                  <div className="watch-section-head-left">
                    <MessageCircle size={13} />
                    <span>Comments</span>
                    <span className="watch-section-badge">{comments.length}</span>
                  </div>
                  <div className="watch-comment-sorts">
                    {SORT_TABS.map(st => (
                      <button key={st.key} className={`watch-comment-sort ${commentSort === st.key ? "active" : ""}`} onClick={() => setCommentSort(st.key)}>{st.label}</button>
                    ))}
                  </div>
                </div>

                <div className="watch-comment-input">
                  <div className="watch-comment-avatar">
                    <Users size={14} />
                  </div>
                  <div className="watch-comment-input-wrap">
                    <input
                      className="watch-comment-field"
                      type="text"
                      placeholder={replyTo ? "Write a reply..." : "Join the discussion..."}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddComment()}
                    />
                    <div className="watch-comment-input-actions">
                      <button className="watch-comment-input-btn" title="Spoiler"><EyeOff size={12} /></button>
                      <button className="watch-comment-input-btn" title="Send" onClick={handleAddComment}><ArrowLeft size={12} style={{ transform: "rotate(90deg)" }} /></button>
                    </div>
                  </div>
                </div>
                {replyTo && (
                  <div className="watch-reply-indicator">
                    Replying to a comment <button onClick={() => setReplyTo(null)}><X size={12} /></button>
                  </div>
                )}

                <div className="watch-comments-list">
                  {sortedComments.map(cm => (
                    <div key={cm.id} className={`watch-comment-item ${cm.pinned ? "pinned" : ""}`}>
                      {cm.pinned && <div className="watch-comment-pin"><Pin size={10} /> Pinned</div>}
                      <div className="watch-comment-avatar"><Users size={14} /></div>
                      <div className="watch-comment-body">
                        <div className="watch-comment-top">
                          <span className="watch-comment-user">{cm.user}</span>
                          <span className="watch-comment-time">{cm.time}</span>
                        </div>
                        {cm.hasSpoiler ? (
                          <div className={`watch-spoiler-wrap ${spoilerMode[cm.id] ? "revealed" : ""}`} onClick={() => setSpoilerMode(s => ({ ...s, [cm.id]: true }))}>
                            <div className="watch-spoiler-blur">
                              <AlertCircle size={12} />
                              <span>Spoiler — Click to reveal</span>
                            </div>
                            <p className="watch-comment-text">{cm.text.replace(/\|\|(.*?)\|\|/g, "$1")}</p>
                          </div>
                        ) : (
                          <p className="watch-comment-text">{cm.text}</p>
                        )}
                        <div className="watch-comment-actions">
                          <button className="watch-comment-action" onClick={() => handleLikeComment(cm.id, false, null)}><ThumbsUp size={11} /> {cm.likes}</button>
                          <button className="watch-comment-action"><ThumbsDown size={11} /> {cm.dislikes}</button>
                          <button className="watch-comment-action" onClick={() => setReplyTo(cm.id)}><Reply size={11} /> Reply</button>
                        </div>
                        {cm.replies.length > 0 && (
                          <div className="watch-comment-replies">
                            {cm.replies.map(r => (
                              <div key={r.id} className="watch-comment-item">
                                <div className="watch-comment-avatar" style={{ width: 24, height: 24 }}><Users size={10} /></div>
                                <div className="watch-comment-body">
                                  <div className="watch-comment-top">
                                    <span className="watch-comment-user">{r.user}</span>
                                    <span className="watch-comment-time">{r.time}</span>
                                  </div>
                                  <p className="watch-comment-text">{r.text}</p>
                                  <div className="watch-comment-actions">
                                    <button className="watch-comment-action" onClick={() => handleLikeComment(r.id, true, cm.id)}><ThumbsUp size={11} /> {r.likes}</button>
                                    <button className="watch-comment-action"><ThumbsDown size={11} /> {r.dislikes}</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

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
              <input className="watch-search-input" type="text" placeholder="Search episodes..." value={epSearch} onChange={e => setEpSearch(e.target.value)} />
              {epSearch && <button className="watch-search-clear" onClick={() => setEpSearch("")}><X size={12} /></button>}
            </div>
            <div className="watch-side-scroll" ref={scrollRef}>
              {loading ? (
                <div className="watch-center" style={{ padding: 40 }}><Loader size={18} className="watch-spin" /></div>
              ) : filteredEpisodes.length === 0 ? (
                <div className="watch-center" style={{ padding: 40 }}><p className="watch-muted">{epSearch ? "No matching episodes" : "No episodes"}</p></div>
              ) : (
                filteredEpisodes.map((ep, i) => {
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
                        <span className="watch-ep-date">{ep.aired ? "Aired" : "Upcoming"}</span>
                      </div>
                      {realIdx === epIndex && <div className="watch-ep-active-dot" />}
                    </motion.button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
