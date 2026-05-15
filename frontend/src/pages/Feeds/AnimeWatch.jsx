import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Loader, Play, Monitor } from "lucide-react";
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

  const isEmbedSource = ["embed"].includes(anime.source);

  useEffect(() => {
    if (isEmbedSource) {
      setLoading(false);
      if (!anime.embedProviders?.length) {
        setError("No streaming source found.");
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
        if (eps.length === 0) { setError("No streaming links available."); return; }
        setEpisodes(eps);
        setEpIndex(Math.min(Math.max(0, startEp - 1), eps.length - 1));
      } catch { setError("Failed to load episodes."); }
      finally { setLoading(false); }
    })();
  }, [anime.id, anime.slug, anime.source, startEp, isEmbedSource, anime.embedProviders, retryCount]);

  const episode = episodes[epIndex];

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
    } else if (anime.source === "consumet" || anime.source === "gogoanime") {
      (async () => {
        setError(""); setStreamLoading(true); setStreamUrl("");
        try {
          const url = await consumetGetStreamUrl(episode.id, episode.provider || anime.provider || "gogoanime");
          if (url) setStreamUrl(url);
          else setError("No stream URL found.");
        } catch { setError("Failed to load stream."); }
        finally { setStreamLoading(false); }
      })();
    } else {
      setStreamUrl(episode.url);
    }
  }, [episode, anime.source, isEmbedSource, streamRetryCount]);

  const switchServer = (idx) => {
    if (servers[idx]) { setServerIndex(idx); setStreamUrl(servers[idx].url); }
  };

  const goPrev = () => setEpIndex(i => {
    const next = Math.max(0, i - 1);
    if (onEpisodeChange && episodes[next]) onEpisodeChange(episodes[next].episode);
    return next;
  });

  const goNext = () => setEpIndex(i => {
    const next = Math.min(episodes.length - 1, i + 1);
    if (onEpisodeChange && episodes[next]) onEpisodeChange(episodes[next].episode);
    return next;
  });

  return (
    <div className="watch-overlay" onClick={onClose}>
      <div className="watch-shell" onClick={e => e.stopPropagation()}>
        <header className="watch-topbar">
          <button className="watch-back" onClick={onClose}>
            <ChevronLeft size={18} />
            <span>{animeName || anime.title}</span>
          </button>
          <div className="watch-topbar-right">
            <span className="watch-ep-label">{episode ? `Ep. ${episode.episode}` : ""}</span>
            <button className="watch-close" onClick={onClose}><X size={18} /></button>
          </div>
        </header>

        <div className="watch-main">
          <div className="watch-pane">
            {loading && (
              <div className="watch-center">
                <Loader size={28} className="watch-spin" />
                <p>Loading episodes...</p>
              </div>
            )}
            {!loading && error && (
              <div className="watch-center">
                <div className="watch-err-icon">!</div>
                <p>{error}</p>
                <button className="watch-retry" onClick={() => {
                  if (episodes.length === 0) setRetryCount(c => c + 1);
                  else setStreamRetryCount(c => c + 1);
                }}>Retry</button>
              </div>
            )}
            {!loading && !error && streamUrl && !streamLoading && (
              <iframe
                key={`${episode?.episode || 0}-${serverIndex}`}
                className="watch-frame"
                src={streamUrl}
                title={`Episode ${episode?.episode || ""}`}
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
              />
            )}
            {!loading && !error && streamLoading && (
              <div className="watch-center">
                <Loader size={28} className="watch-spin" />
                <p>Loading stream...</p>
              </div>
            )}
            {!loading && !error && !streamLoading && !streamUrl && !isEmbedSource && episode && (
              <div className="watch-center"><p>Preparing stream...</p></div>
            )}

            {servers.length > 1 && (
              <div className="watch-servers-bar">
                <span className="watch-servers-lbl">Source</span>
                {servers.map((s, i) => (
                  <button key={i} className={`watch-server-pill ${i === serverIndex ? "active" : ""}`} onClick={() => switchServer(i)}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="watch-list-pane">
            <div className="watch-list-header">
              <Monitor size={14} />
              <span>Episodes</span>
              <span className="watch-list-count">{episodes.length}</span>
            </div>
            <div className="watch-list-scroll">
              {loading ? (
                <div className="watch-center" style={{ padding: 40 }}><Loader size={20} className="watch-spin" /></div>
              ) : episodes.length === 0 ? (
                <div className="watch-center" style={{ padding: 40 }}><p>No episodes</p></div>
              ) : (
                episodes.map((ep, i) => (
                  <button
                    key={i}
                    className={`watch-ep-card ${i === epIndex ? "active" : ""} ${i > epIndex ? "upcoming" : ""}`}
                    onClick={() => { setEpIndex(i); if (onEpisodeChange) onEpisodeChange(ep.episode); }}
                  >
                    <div className="watch-ep-card-left">
                      <div className="watch-ep-card-num">{ep.episode}</div>
                      <div className="watch-ep-card-info">
                        <span className="watch-ep-card-title">Episode {ep.episode}</span>
                      </div>
                    </div>
                    {i === epIndex && <Play size={12} className="watch-ep-card-play" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <footer className="watch-bottombar">
          <button disabled={epIndex === 0} onClick={goPrev}>
            <ChevronLeft size={16} /> Previous
          </button>
          <div className="watch-bottombar-center">
            <span>{episode ? `Episode ${episode.episode}` : ""}</span>
          </div>
          <button disabled={epIndex >= episodes.length - 1} onClick={goNext}>
            Next <ChevronRight size={16} />
          </button>
        </footer>
      </div>
    </div>
  );
}
