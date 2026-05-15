import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Loader } from "lucide-react";
import { getAnimeEpisodes, getAnitakuEpisodes, getAnitakuStreamUrls } from "../../services/animeApi";
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

  const isEmbedSource = ["embedomega", "kwik"].includes(anime.source);

  useEffect(() => {
    if (isEmbedSource) {
      setLoading(false);
      setStreamUrl(anime.embedUrl || "");
      return;
    }
    (async () => {
      setLoading(true);
      setError("");
      try {
        let eps = [];
        if (anime.source === "anitaku") {
          eps = await getAnitakuEpisodes(anime.slug);
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
  }, [anime.id, anime.slug, anime.source, startEp, isEmbedSource, anime.embedUrl, retryCount]);

  const episode = episodes[epIndex];

  useEffect(() => {
    if (!episode || isEmbedSource) return;
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

  const goPrev = () => setEpIndex(i => { const next = Math.max(0, i - 1); if (onEpisodeChange && episodes[next]) onEpisodeChange(episodes[next].episode); return next; });
  const goNext = () => setEpIndex(i => { const next = Math.min(episodes.length - 1, i + 1); if (onEpisodeChange && episodes[next]) onEpisodeChange(episodes[next].episode); return next; });

  return (
    <div className="watch-overlay" onClick={onClose}>
      <div className="watch-shell" onClick={e => e.stopPropagation()}>
        <header className="watch-header">
          <div className="watch-header-left">
            <button className="watch-back-btn" onClick={onClose}>
              <ChevronLeft size={22} /> Back
            </button>
          </div>
          <div className="watch-header-center">
            {episode && <span className="watch-title">{animeName || anime.title} — Episode {episode.episode}</span>}
          </div>
          <div className="watch-header-right">
            <button className="watch-close-btn" onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </header>

        <div className="watch-body">
          {loading && (
            <div className="watch-loading">
              <Loader size={32} className="watch-spinner" />
              <p>Loading episodes...</p>
            </div>
          )}
          {!loading && error && (
            <div className="watch-error">
              <p>{error}</p>
              <button className="watch-retry-btn" onClick={() => {
                if (episodes.length === 0) {
                  setRetryCount(c => c + 1);
                } else {
                  setStreamRetryCount(c => c + 1);
                }
              }}>
                Retry
              </button>
            </div>
          )}
          {!loading && !error && streamUrl && !streamLoading && (
            <div className="watch-player-wrap">
              <iframe
                key={`${episode?.episode || 0}-${serverIndex}`}
                className="watch-player"
                src={streamUrl}
                title={`Episode ${episode?.episode || ""}`}
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
              />
            </div>
          )}
          {!loading && !error && streamLoading && (
            <div className="watch-loading">
              <Loader size={32} className="watch-spinner" />
              <p>Loading stream...</p>
            </div>
          )}
          {!loading && !error && !streamLoading && !streamUrl && !isEmbedSource && episode && (
            <div className="watch-loading">
              <Loader size={32} className="watch-spinner" />
              <p>Preparing stream...</p>
            </div>
          )}
        </div>

        <footer className="watch-footer">
          <div className="watch-ep-nav">
            <button disabled={epIndex === 0} onClick={goPrev}>
              <ChevronLeft size={18} /> Prev
            </button>
            <div className="watch-ep-select-wrap">
              <select
                value={epIndex}
                onChange={e => { const idx = Number(e.target.value); setEpIndex(idx); if (onEpisodeChange && episodes[idx]) onEpisodeChange(episodes[idx].episode); }}
              >
                {episodes.map((ep, i) => (
                  <option key={i} value={i}>
                    Episode {ep.episode}
                  </option>
                ))}
              </select>
            </div>
            <button disabled={epIndex >= episodes.length - 1} onClick={goNext}>
              Next <ChevronRight size={18} />
            </button>
          </div>
          {servers.length > 1 && (
            <div className="watch-servers">
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
          )}
        </footer>
      </div>
    </div>
  );
}
