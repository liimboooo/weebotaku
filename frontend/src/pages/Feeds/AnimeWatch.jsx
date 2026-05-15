import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Loader, Maximize2, Minimize2, List, Monitor, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimeEpisodes, getAnitakuEpisodes, getAnitakuStreamUrls, consumetGetEpisodes, consumetGetStreamUrl } from "../../services/animeApi";
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
  const [retryCount, setRetryCount] = useState(0);
  const [streamRetryCount, setStreamRetryCount] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(0);
  const playerRef = useRef(null);
  const controlsTimer = useRef(null);
  const autoTimer = useRef(null);

  const isEmbedSource = ["embed"].includes(anime.source);

  const resetAutoNext = useCallback(() => {
    setAutoNext(false);
    setAutoCountdown(0);
    if (autoTimer.current) clearInterval(autoTimer.current);
  }, []);

  const startAutoNext = useCallback(() => {
    if (epIndex >= episodes.length - 1) return;
    setAutoNext(true);
    setAutoCountdown(10);
    autoTimer.current = setInterval(() => {
      setAutoCountdown(prev => {
        if (prev <= 1) {
          clearInterval(autoTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [epIndex, episodes.length]);

  useEffect(() => {
    if (autoCountdown === 0 && autoNext) {
      setAutoNext(false);
      goNext();
    }
  }, [autoCountdown]);

  useEffect(() => {
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, []);

  useEffect(() => {
    if (isEmbedSource) {
      setLoading(false);
      if (!anime.embedProviders?.length) {
        setError("No streaming source found for this anime.");
        return;
      }
      setServers(anime.embedProviders.map((p) => ({ label: p.name, url: p.url })));
      setServerIndex(0);
      setStreamUrl(anime.embedProviders[0].url);
      return;
    }
    (async () => {
      setLoading(true);
      setError("");
      try {
        let eps = [];
        if (anime.source === "anitaku") {
          eps = await getAnitakuEpisodes(anime.slug);
        } else if (anime.source === "consumet" || anime.source === "gogoanime") {
          eps = await consumetGetEpisodes(anime.provider || "gogoanime", anime.id);
        } else {
          eps = await getAnimeEpisodes(anime.id);
        }
        if (eps.length === 0) {
          setError("No streaming links available.");
          return;
        }
        setEpisodes(eps);
        setEpIndex(Math.min(Math.max(0, startEp - 1), eps.length - 1));
      } catch {
        setError("Failed to load episodes.");
      } finally {
        setLoading(false);
      }
    })();
  }, [anime.id, anime.slug, anime.source, startEp, isEmbedSource, anime.embedProviders, retryCount]);

  const episode = episodes[epIndex];

  useEffect(() => {
    if (!episode || isEmbedSource) return;
    resetAutoNext();
    if (anime.source === "anitaku") {
      (async () => {
        setError("");
        setStreamLoading(true);
        setStreamUrl("");
        setServers([]);
        setServerIndex(0);
        try {
          const urls = await getAnitakuStreamUrls(episode.url);
          if (urls.length > 0) {
            setServers(urls);
            setStreamUrl(urls[0].url);
          } else {
            setError("No video servers found.");
          }
        } catch {
          setError("Failed to load stream.");
        } finally {
          setStreamLoading(false);
        }
      })();
    } else if (anime.source === "consumet" || anime.source === "gogoanime") {
      (async () => {
        setError("");
        setStreamLoading(true);
        setStreamUrl("");
        try {
          const url = await consumetGetStreamUrl(episode.id, episode.provider || anime.provider || "gogoanime");
          if (url) {
            setStreamUrl(url);
          } else {
            setError("No stream URL found.");
          }
        } catch {
          setError("Failed to load stream.");
        } finally {
          setStreamLoading(false);
        }
      })();
    } else {
      setStreamUrl(episode.url);
    }
  }, [episode, anime.source, isEmbedSource, streamRetryCount]);

  const switchServer = (idx) => {
    if (servers[idx]) {
      setServerIndex(idx);
      setStreamUrl(servers[idx].url);
    }
  };

  const goPrev = useCallback(() => {
    resetAutoNext();
    setEpIndex(i => { const next = Math.max(0, i - 1); if (onEpisodeChange && episodes[next]) onEpisodeChange(episodes[next].episode); return next; });
  }, [episodes, onEpisodeChange, resetAutoNext]);

  const goNext = useCallback(() => {
    resetAutoNext();
    setEpIndex(i => { const next = Math.min(episodes.length - 1, i + 1); if (onEpisodeChange && episodes[next]) onEpisodeChange(episodes[next].episode); return next; });
  }, [episodes, onEpisodeChange, resetAutoNext]);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    showControlsTemporarily();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [epIndex, streamUrl]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await playerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "f" || e.key === "F") toggleFullscreen();
      if (e.key === "Escape") onClose();
      if (e.key === "s" || e.key === "S") setShowSidebar(p => !p);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, onClose]);

  const openAutoNext = () => {
    if (autoNext) {
      resetAutoNext();
      goNext();
    }
  };

  return (
    <div className="watch-overlay" onClick={onClose} onMouseMove={showControlsTemporarily}>
      <div className="watch-shell" onClick={e => e.stopPropagation()} ref={playerRef}>
        <AnimatePresence>
          {showControls && (
            <motion.header
              className="watch-header"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="watch-header-left">
                <button className="watch-back-btn" onClick={onClose}>
                  <ChevronLeft size={20} /> Back
                </button>
              </div>
              <div className="watch-header-center">
                <span className="watch-title">{animeName || anime.title}{episode ? ` — Ep ${episode.episode}` : ""}</span>
              </div>
              <div className="watch-header-right">
                <button className="watch-action-btn" onClick={() => setShowSidebar(p => !p)} title="Episode list (S)">
                  <List size={16} />
                </button>
                <button className="watch-action-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button className="watch-action-btn watch-action-close" onClick={onClose} title="Close (Esc)">
                  <X size={18} />
                </button>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        <div className={`watch-body ${showSidebar ? "has-sidebar" : ""}`}>
          <div className="watch-player-area">
            {loading && (
              <div className="watch-loading">
                <div className="watch-shimmer" />
                <Loader size={28} className="watch-spinner" />
                <p>Loading episodes...</p>
              </div>
            )}
            {!loading && error && (
              <div className="watch-error">
                <div className="watch-error-icon">!</div>
                <p>{error}</p>
                <button className="watch-retry-btn" onClick={() => {
                  if (episodes.length === 0) setRetryCount(c => c + 1);
                  else setStreamRetryCount(c => c + 1);
                }}>Retry</button>
              </div>
            )}
            {!loading && !error && streamUrl && !streamLoading && (
              <>
                <iframe
                  key={`${episode?.episode || 0}-${serverIndex}`}
                  className="watch-player"
                  src={streamUrl}
                  title={`Episode ${episode?.episode || ""}`}
                  allow="autoplay; fullscreen; encrypted-media"
                  allowFullScreen
                  onLoad={() => setStreamLoading(false)}
                />
                {autoNext && epIndex < episodes.length - 1 && (
                  <div className="watch-auto-next" onClick={openAutoNext}>
                    <span>Next episode in <strong>{autoCountdown}s</strong></span>
                    <button className="watch-auto-btn" onClick={(e) => { e.stopPropagation(); resetAutoNext(); goNext(); }}>
                      <SkipForward size={14} /> Skip
                    </button>
                    <button className="watch-auto-btn watch-auto-cancel" onClick={(e) => { e.stopPropagation(); resetAutoNext(); }}>
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
            {!loading && !error && streamLoading && (
              <div className="watch-loading">
                <div className="watch-shimmer" />
                <Loader size={28} className="watch-spinner" />
                <p>Loading stream...</p>
              </div>
            )}
            {!loading && !error && !streamLoading && !streamUrl && !isEmbedSource && episode && (
              <div className="watch-loading">
                <div className="watch-shimmer" />
                <p>Preparing stream...</p>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showSidebar && episodes.length > 0 && (
              <motion.div
                className="watch-sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div className="watch-sidebar-header">
                  <Monitor size={14} />
                  <span>Episodes ({episodes.length})</span>
                </div>
                <div className="watch-sidebar-list">
                  {episodes.map((ep, i) => (
                    <button
                      key={i}
                      className={`watch-sidebar-item ${i === epIndex ? "active" : ""}`}
                      onClick={() => {
                        resetAutoNext();
                        setEpIndex(i);
                        if (onEpisodeChange) onEpisodeChange(ep.episode);
                      }}
                    >
                      <span className="watch-sidebar-num">{ep.episode}</span>
                      <span className="watch-sidebar-label">Episode {ep.episode}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showControls && (
            <motion.footer
              className="watch-footer"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="watch-ep-nav">
                <button disabled={epIndex === 0} onClick={goPrev}>
                  <ChevronLeft size={16} /> Prev
                </button>
                <div className="watch-ep-select-wrap">
                  <select
                    value={epIndex}
                    onChange={e => { const idx = Number(e.target.value); resetAutoNext(); setEpIndex(idx); if (onEpisodeChange && episodes[idx]) onEpisodeChange(episodes[idx].episode); }}
                  >
                    {episodes.map((ep, i) => (
                      <option key={i} value={i}>Episode {ep.episode}</option>
                    ))}
                  </select>
                </div>
                <button disabled={epIndex >= episodes.length - 1} onClick={goNext}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
              {servers.length > 1 && (
                <div className="watch-servers">
                  <span className="watch-servers-label">Server</span>
                  <div className="watch-servers-list">
                    {servers.map((s, i) => (
                      <button
                        key={i}
                        className={`watch-server-btn ${i === serverIndex ? "active" : ""}`}
                        onClick={() => switchServer(i)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.footer>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
