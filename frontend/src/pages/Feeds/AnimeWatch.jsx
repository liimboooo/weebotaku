import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Loader, Play, Monitor, Maximize2, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimeEpisodes, getAnitakuEpisodes, getAnitakuStreamUrls, getWitanimeEpisodes, getWitanimeStreamUrl, getAnime3rbEpisodes, getAnime3rbStreamUrl } from "../../services/animeApi";
import "./AnimeWatch.css";

function replaceEpInUrl(url, animeId, newEp) {
  let result = url.replace(new RegExp(`/${animeId}/(\\d+)`), `/${animeId}/${newEp}`);
  result = result.replace(/([?&]ep=)\d+/g, `$1${newEp}`);
  return result;
}

const MAX_EMBED_EPISODES = 50;

export default function AnimeWatch({ anime, animeName, onClose, startEp = 1, onEpisodeChange, totalEpisodes = 12 }) {
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
  const scrollRef = useRef(null);

  const isEmbedSource = ["embed"].includes(anime.source);

  useEffect(() => {
    if (isEmbedSource) {
      setLoading(false);
      if (!anime.embedProviders?.length) { setError("No streaming source found."); return; }
      const epCount = Math.min(totalEpisodes, MAX_EMBED_EPISODES);
      const virtualEps = Array.from({ length: epCount }, (_, i) => ({ episode: i + 1, id: i + 1 }));
      setEpisodes(virtualEps);
      const providers = anime.embedProviders.map(p => ({ label: p.name, url: p.url }));
      setServers(providers);
      setServerIndex(0);
      const initialEp = Math.min(Math.max(1, startEp), totalEpisodes);
      setEpIndex(initialEp - 1);
      setStreamUrl(replaceEpInUrl(providers[0].url, anime.id, initialEp));
      return;
    }
    (async () => {
      setLoading(true); setError("");
      try {
        let eps = [];
        if (anime.source === "anitaku") eps = await getAnitakuEpisodes(anime.slug);
        else if (anime.source === "witanime") eps = await getWitanimeEpisodes(anime.slug);
        else if (anime.source === "anime3rb") eps = await getAnime3rbEpisodes(anime.slug);
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
    setStreamUrl(replaceEpInUrl(servers[serverIndex].url, anime.id, ep));
  }, [epIndex, serverIndex, isEmbedSource, servers, anime.id]);

  useEffect(() => {
    if (!episode || isEmbedSource) return;
    if (anime.source === "anitaku") {
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
        setError(""); setStreamLoading(true); setStreamUrl("");
        try {
          const url = await getWitanimeStreamUrl(episode.url);
          if (url) setStreamUrl(url);
          else setError("No stream URL found.");
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

  const switchServer = (idx) => { if (servers[idx]) { setServerIndex(idx); if (!isEmbedSource) setStreamUrl(servers[idx].url); } };
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
            <span className="watch-source-badge">{anime.source}</span>
          </div>
          <div className="watch-topbar-right">
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
                  <button className="watch-btn watch-btn-ghost" onClick={() => {
                    if (episodes.length === 0) setRetryCount(c => c + 1);
                    else setStreamRetryCount(c => c + 1);
                  }}>Retry</button>
                </div>
              )}
              {!loading && !error && streamUrl && !streamLoading && (
                <iframe key={`${episode?.episode || 0}-${serverIndex}`}
                  className="watch-frame"
                  src={streamUrl}
                  title={`Episode ${episode?.episode || ""}`}
                  allow="autoplay; fullscreen; encrypted-media"
                  allowFullScreen
                />
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
                    className={`watch-ep-item ${i === epIndex ? "active" : ""}`}
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
