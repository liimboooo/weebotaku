import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Loader } from "lucide-react";
import { getAnimeEpisodes, getAnitakuEpisodes, getAnitakuStreamUrls } from "../../services/animeApi";
import "./AnimeWatch.css";

export default function AnimeWatch({ anime, animeName, onClose, startEp = 1 }) {
  const [episodes, setEpisodes] = useState([]);
  const [epIndex, setEpIndex] = useState(Math.max(0, startEp - 1));
  const [loading, setLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(false);
  const [servers, setServers] = useState([]);
  const [serverIndex, setServerIndex] = useState(0);
  const [streamUrl, setStreamUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, [anime.id, anime.slug, anime.source, startEp]);

  const episode = episodes[epIndex];

  useEffect(() => {
    if (!episode) return;
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
  }, [episode, anime.source]);

  const switchServer = (idx) => {
    if (servers[idx]) {
      setServerIndex(idx);
      setStreamUrl(servers[idx].url);
    }
  };

  const goPrev = () => setEpIndex(i => Math.max(0, i - 1));
  const goNext = () => setEpIndex(i => Math.min(episodes.length - 1, i + 1));

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
          {error && <div className="watch-error">{error}</div>}
          {!loading && !error && streamUrl && !streamLoading && (
            <div className="watch-player-wrap">
              <iframe
                key={`${episode.episode}-${serverIndex}`}
                className="watch-player"
                src={streamUrl}
                title={`Episode ${episode.episode}`}
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
          {!loading && !error && !streamLoading && !streamUrl && episode && (
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
                onChange={e => setEpIndex(Number(e.target.value))}
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
