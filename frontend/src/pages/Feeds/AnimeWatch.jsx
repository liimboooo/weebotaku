import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Loader, Play, Monitor, Globe, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import { getAnimeEpisodes, getAnitakuEpisodes, getAnitakuStreamUrls, getWitanimeEpisodes, getWitanimeStreamUrl, getWitanimeServers, getAnime3rbEpisodes, getAnime3rbStreamUrl, getConsumetGogoanimeEpisodes, getConsumetGogoanimeStreamUrl, getRistoAnimeEpisodes, getRistoAnimeStreamUrls } from "../../services/animeApi";
import "./AnimeWatch.css";

function ConsumetPlayer({ streamUrl }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !streamUrl) return;
    if (!streamUrl.includes(".m3u8")) { videoRef.current.src = streamUrl; return; }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js";
    script.onload = () => {
      if (window.Hls && window.Hls.isSupported()) {
        hlsRef.current = new window.Hls();
        hlsRef.current.loadSource(streamUrl);
        hlsRef.current.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = streamUrl;
      }
    };
    document.body.appendChild(script);
    return () => {
      hlsRef.current?.destroy();
      document.body.removeChild(script);
    };
  }, [streamUrl]);

  return (
    <video ref={videoRef} className="watch-frame" controls autoPlay playsInline>
      <source src={streamUrl} type="application/x-mpegURL" />
    </video>
  );
}

function replaceEpInUrl(url, animeId, newEp) {
  let result = url.replace(new RegExp(`/${animeId}/(\\d+)`), `/${animeId}/${newEp}`);
  result = result.replace(/([?&]ep=)\d+/g, `$1${newEp}`);
  if (animeId && !Number.isNaN(Number(animeId))) {
    result = result.replace(new RegExp(`anilist-${animeId}/(\\d+)`), `anilist-${animeId}/${newEp}`);
  }
  return result;
}



export default function AnimeWatch({ anime, animeName, onClose, startEp = 1, onEpisodeChange, totalEpisodes = 12 }) {
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
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const autoNextTimer = useRef(null);
  const scrollRef = useRef(null);
  const iframeRef = useRef(null);
  const failedServers = useRef(new Set());

  const isEmbedSource = ["embed"].includes(anime.source) || useEmbedFallback;

  useEffect(() => {
    if (isEmbedSource) {
      setLoading(false);
      if (!anime.embedProviders?.length) { setError("No streaming source found."); return; }
      const epCount = totalEpisodes > 0 ? Math.min(totalEpisodes, 50) : Math.max(12, startEp);
      const virtualEps = Array.from({ length: epCount }, (_, i) => ({ episode: i + 1, id: i + 1 }));
      setEpisodes(virtualEps);
      const providers = anime.embedProviders.map(p => ({ label: p.name, url: p.url }));
      setServers(providers);
      setServerIndex(0);
      const initialEp = Math.min(Math.max(1, startEp), epCount);
      setEpIndex(initialEp - 1);
      setStreamUrl(replaceEpInUrl(providers[0].url, anime.anilistId || anime.id, initialEp));
      return;
    }
    (async () => {
      setLoading(true); setError("");
      try {
        let eps = [];
        if (anime.source === "ristoanime") eps = await getRistoAnimeEpisodes(anime.title || anime.slug);
        else if (anime.source === "anitaku") eps = await getAnitakuEpisodes(anime.slug);
        else if (anime.source === "witanime") eps = await getWitanimeEpisodes(anime.slug);
        else if (anime.source === "anime3rb") eps = await getAnime3rbEpisodes(anime.slug);
        else if (anime.source === "consumet") eps = await getConsumetGogoanimeEpisodes(anime.id);
        else eps = await getAnimeEpisodes(anime.id);
        if (eps.length === 0) { setError("No streaming links available."); return; }
        setEpisodes(eps);
        setEpIndex(Math.min(Math.max(0, startEp - 1), eps.length - 1));
      } catch { setError("Failed to load episodes."); }
      finally { setLoading(false); }
    })();
  }, [anime.id, anime.slug, anime.source, startEp, isEmbedSource, anime.embedProviders, totalEpisodes, retryCount]);

  const episode = episodes[epIndex];

  // Rebuild embed URL when episode or server changes
  useEffect(() => {
    if (!isEmbedSource || !servers[serverIndex]) return;
    const ep = epIndex + 1;
    setIframeError(false);
    failedServers.current = new Set();
    setStreamUrl(replaceEpInUrl(servers[serverIndex].url, anime.anilistId || anime.id, ep));
  }, [epIndex, serverIndex, isEmbedSource, servers, anime.id]);

  useEffect(() => {
    if (!episode || isEmbedSource) return;
    if (anime.source === "ristoanime") {
      (async () => {
        setError(""); setStreamLoading(true); setStreamUrl(""); setServers([]); setServerIndex(0);
        try {
          const urls = await getRistoAnimeStreamUrls(episode.url);
          if (urls.length > 0) { setServers(urls); setStreamUrl(urls[0].url); }
          else setError("No video servers found.");
        } catch { setError("Failed to load stream."); }
        finally { setStreamLoading(false); }
      })();
    } else if (anime.source === "anitaku") {
      (async () => {
        setError(""); setStreamLoading(true); setStreamUrl(""); setServers([]); setServerIndex(0);
        try {
          const urls = await getAnitakuStreamUrls(episode.url);
      if (urls.length > 0) { setServers(urls); setStreamUrl(urls[0].url); }
        else setError("No video servers found.");
      } catch { setError("Failed to load stream."); }
      finally { setStreamLoading(false); }
      })();
    } else if (anime.source === "witanime") {
      (async () => {
        setError(""); setStreamLoading(true); setStreamUrl(""); setServers([]); setServerIndex(0);
        try {
          const srvs = await getWitanimeServers(episode.url);
          if (srvs.length > 0) {
            setServers(srvs);
            setStreamUrl(srvs[0].url);
          } else {
            const url = await getWitanimeStreamUrl(episode.url);
            if (url) setStreamUrl(url);
            else setError("No stream URL found.");
          }
        } catch { setError("Failed to load stream."); }
        finally { setStreamLoading(false); }
      })();
    } else if (anime.source === "anime3rb") {
      (async () => {
        setError(""); setStreamLoading(true); setStreamUrl("");
        try {
          const url = await getAnime3rbStreamUrl(episode.url);
          if (url) setStreamUrl(url);
          else setError("No stream URL found.");
        } catch { setError("Failed to load stream."); }
        finally { setStreamLoading(false); }
      })();
    } else if (anime.source === "consumet") {
      (async () => {
        setError(""); setStreamLoading(true); setStreamUrl(""); setServers([]);
        try {
          const url = await getConsumetGogoanimeStreamUrl(episode.id);
          if (url) {
            setStreamUrl(url);
            setServers([{ label: "HD", url }]);
          } else setError("No stream URL found.");
        } catch { setError("Failed to load stream."); }
        finally { setStreamLoading(false); }
      })();
    } else {
      setStreamUrl(episode.url);
    }
  }, [episode, anime.source, isEmbedSource, streamRetryCount]);

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
      if (!isEmbedSource) setStreamUrl(servers[idx].url);
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

  const hasMultipleServers = servers.length > 1 || (anime.embedProviders?.length > 0 && useEmbedFallback);

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
            <span className="watch-source-badge">{anime.source}</span>
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
                    {anime.embedProviders?.length > 0 && !useEmbedFallback && (
                      <button className="watch-btn" onClick={() => setUseEmbedFallback(true)}>
                        <Globe size={14} /> Embed Player
                      </button>
                    )}
                  </div>
                </div>
              )}
              {!loading && !error && streamUrl && !streamLoading && !iframeError && (
                anime.source === "consumet" && streamUrl.includes(".m3u8") ? (
                  <ConsumetPlayer key={`${episode?.episode || 0}-${serverIndex}`} streamUrl={streamUrl} />
                ) : (
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
                )
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
              {!loading && !error && !streamLoading && !streamUrl && !isEmbedSource && episode && (
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
              {!isEmbedSource && anime.embedProviders?.length > 0 && (
                <button className="watch-btn" onClick={() => setUseEmbedFallback(true)} style={{ fontSize: 11, flexShrink: 0 }}>
                  <Globe size={12} /> Embed
                </button>
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
