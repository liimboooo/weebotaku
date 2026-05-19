import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Loader, Play, Monitor, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import { getEpisodes, getStreamUrls } from "../../services/animeApi";
import "./AnimeWatch.css";

export default function AnimeWatch({ anime, animeName, onClose, startEp = 1, onEpisodeChange }) {
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
  const [effectiveSource, setEffectiveSource] = useState(anime.source);
  const [autoNext, setAutoNext] = useState(false);
  const scrollRef = useRef(null);
  const iframeRef = useRef(null);
  const failedServers = useRef(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      const priority = ["ristoanime", "anime4up", "witanime"];
      const sourceMap = {};
      for (const s of [anime, ...(anime.allSources || [])]) sourceMap[`${s.source}:${s.slug || s.id}`] = s;
      const ordered = [];
      for (const name of priority) {
        const match = Object.values(sourceMap).find(s => s.source === name);
        if (match) { ordered.push(match); delete sourceMap[`${match.source}:${match.slug || match.id}`]; }
      }
      ordered.push(...Object.values(sourceMap));
      const tried = new Set();
      for (const src of ordered) {
        const key = `${src.source}:${src.slug || src.id}`;
        if (tried.has(key)) continue;
        tried.add(key);
        try {
          const eps = await getEpisodes(src.title || src.slug, src.tagSlug, src.source, src.sourceBase, src.anilistId, src.episodeCount, src.link);
          if (eps.length > 0) {
            setEpisodes(eps);
            setEpIndex(Math.min(Math.max(0, startEp - 1), eps.length - 1));
            setEffectiveSource(src.source);
            setLoading(false);
            return;
          }
        } catch {}
      }
      if (anime.anilistId) {
        try {
          const eps = await getEpisodes(anime.title, null, "embed", "", anime.anilistId, anime.episodeCount);
          if (eps.length > 0) { setEpisodes(eps); setEpIndex(Math.min(Math.max(0, startEp - 1), eps.length - 1)); setEffectiveSource("embed"); setLoading(false); return; }
        } catch {}
      }
      setError("No streaming links available.");
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime.title, anime.slug, startEp, retryCount]);

  const episode = episodes[epIndex];

  useEffect(() => {
    if (!episode) return;
    (async () => {
      setError(""); setStreamLoading(true); setStreamUrl(""); setServers([]); setServerIndex(0);
      try {
        const urls = await getStreamUrls(episode.url, effectiveSource);
        if (urls.length > 0) { setServers(urls); setStreamUrl(urls[0].url); }
        else setError("No video servers found.");
      } catch { setError("Failed to load stream."); }
      finally { setStreamLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, streamRetryCount]);

  useEffect(() => {
    if (scrollRef.current && episodes[epIndex]) {
      const el = scrollRef.current.querySelector(`[data-ep="${epIndex}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [epIndex, episodes]);

  const switchServer = (idx) => {
    if (servers[idx]) {
      setServerIndex(idx);
      setIframeError(false);
      failedServers.current = new Set();
      setStreamUrl(servers[idx].url);
    }
  };

  const tryNextServer = useCallback(() => {
    const nextIdx = serverIndex + 1;
    if (servers[nextIdx]) {
      failedServers.current.add(serverIndex);
      setServerIndex(nextIdx);
      setIframeError(false);
    } else {
      setIframeError(true);
    }
  }, [serverIndex, servers]);

  const handleIframeError = useCallback(() => {
    failedServers.current.add(serverIndex);
    const nextIdx = serverIndex + 1;
    if (servers[nextIdx]) {
      setIframeError(false);
      setServerIndex(nextIdx);
    } else {
      setIframeError(true);
    }
  }, [serverIndex, servers]);
  const goPrev = () => setEpIndex(i => { const n = Math.max(0, i - 1); if (onEpisodeChange && episodes[n]) onEpisodeChange(episodes[n].episode); return n; });
  const goNext = () => setEpIndex(i => { const n = Math.min(episodes.length - 1, i + 1); if (onEpisodeChange && episodes[n]) onEpisodeChange(episodes[n].episode); return n; });

  return createPortal(
    <motion.div className="watch-overlay" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
    >
      <div className="watch-bg-ornament" />
      <motion.div className="watch-shell" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <header className="watch-topbar">
          <button className="watch-back" onClick={onClose}>
            <ChevronLeft size={18} />
            <span className="watch-back-label">{animeName || anime.title}</span>
          </button>
          <div className="watch-topbar-mid">
            {episode && (
              <span className="watch-topbar-ep">Episode {episode.episode}</span>
            )}
            <span className="watch-source-badge">{effectiveSource === "embed" ? "ENG SUB" : effectiveSource}</span>
          </div>
          <div className="watch-topbar-right">
            <button className="watch-topbar-btn" onClick={() => setAutoNext(!autoNext)} title="Auto-next episode">
              <SkipForward size={14} />
              <span className={`watch-topbar-indicator ${autoNext ? "on" : ""}`} />
            </button>
            <button className="watch-close" onClick={onClose}><X size={18} /></button>
          </div>
        </header>

        <div className="watch-main">
          <div className="watch-player-col">
            <div className="watch-player-stage">
              {loading && (
                <div className="watch-center">
                  <div className="watch-pulse" />
                  <Loader size={24} className="watch-spin" />
                  <p className="watch-muted">Loading episodes...</p>
                </div>
              )}
              {!loading && error && (
                <div className="watch-center">
                  <div className="watch-err-badge">!</div>
                  <p className="watch-err-text">{error}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="watch-btn watch-btn-ghost" onClick={() => {
                      if (episodes.length === 0) setRetryCount(c => c + 1);
                      else setStreamRetryCount(c => c + 1);
                    }}>Retry</button>

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
                    {serverIndex < servers.length - 1 && (
                      <button className="watch-btn" onClick={tryNextServer}>
                        Try Next Source
                      </button>
                    )}
                    {epIndex < episodes.length - 1 && (
                      <button className="watch-btn watch-btn-ghost" onClick={() => {
                        setIframeError(false);
                        failedServers.current = new Set();
                        setEpIndex(i => i + 1);
                      }}>
                        Skip to Next Episode
                      </button>
                    )}
                    <button className="watch-btn watch-btn-ghost" onClick={() => {
                      setIframeError(false);
                      failedServers.current = new Set();
                      setStreamRetryCount(c => c + 1);
                    }}>
                      Retry
                    </button>
                  </div>
                </div>
              )}
              {!loading && !error && streamLoading && (
                <div className="watch-center">
                  <div className="watch-pulse" />
                  <Loader size={24} className="watch-spin" />
                  <p className="watch-muted">Loading stream...</p>
                </div>
              )}
              {!loading && !error && !streamLoading && !streamUrl && episode && (
                <div className="watch-center"><p className="watch-muted">Preparing stream...</p></div>
              )}
            </div>

            <div className="watch-bottom-row">
              <div className="watch-nav">
                <button className="watch-btn watch-btn-nav" disabled={epIndex === 0} onClick={goPrev}>
                  <ChevronLeft size={16} /> Prev
                </button>
                <div className="watch-ep-dropdown">
                  <select value={epIndex} onChange={e => { const idx = Number(e.target.value); setEpIndex(idx); if (onEpisodeChange && episodes[idx]) onEpisodeChange(episodes[idx].episode); }}>
                    {episodes.map((ep, i) => (<option key={i} value={i}>Episode {ep.episode}</option>))}
                  </select>
                </div>
                <button className="watch-btn watch-btn-nav" disabled={epIndex >= episodes.length - 1} onClick={goNext}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
              {servers.length > 1 && (
                <div className="watch-servers">
                  <span className="watch-servers-label">Source</span>
                  <div className="watch-servers-list">
                    {servers.map((s, i) => (
                      <button key={i} className={`watch-server-chip ${i === serverIndex ? "active" : ""}`} onClick={() => switchServer(i)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="watch-side-col">
            <div className="watch-side-head">
              <Monitor size={14} />
              <span>Episodes</span>
              <span className="watch-side-count">{episodes.length}</span>
            </div>
            <div className="watch-side-scroll" ref={scrollRef}>
              {loading ? (
                <div className="watch-center" style={{ padding: 40 }}><Loader size={18} className="watch-spin" /></div>
              ) : episodes.length === 0 ? (
                <div className="watch-center" style={{ padding: 40 }}><p className="watch-muted">No episodes</p></div>
              ) : (
                episodes.map((ep, i) => (
                  <motion.button key={ep.id || i} data-ep={i}
                    className={`watch-ep-item ${i === epIndex ? "active" : ""} ${ep.watched ? "watched" : ""}`}
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    onClick={() => { setEpIndex(i); if (onEpisodeChange) onEpisodeChange(ep.episode); }}
                  >
                    <span className="watch-ep-num">{ep.episode}</span>
                    <span className="watch-ep-name">Episode {ep.episode}</span>
                    {i === epIndex && <Play size={10} className="watch-ep-indicator" />}
                  </motion.button>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
