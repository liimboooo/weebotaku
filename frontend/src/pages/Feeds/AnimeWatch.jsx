import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Loader } from "lucide-react";
import { getAnimeEpisodes, getAnimeInfo } from "../../services/animeApi";
import "./AnimeWatch.css";

export default function AnimeWatch({ anime, onClose }) {
  const [info, setInfo] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [epIndex, setEpIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const results = await getAnimeEpisodes(anime.id);
        if (results.length === 0) {
          setError("No streaming links available.");
          return;
        }
        setEpisodes(results);
        let anilistId = null;
        try {
          const meta = await getAnimeInfo(anime.id);
          setInfo(meta);
        } catch (e) {}
      } catch (e) {
        setError("Failed to load episodes.");
      } finally {
        setLoading(false);
      }
    })();
  }, [anime.id]);

  const episode = episodes[epIndex];

  const goPrev = () => setEpIndex(i => Math.max(0, i - 1));
  const goNext = () => setEpIndex(i => Math.min(episodes.length - 1, i + 1));

  return (
    <div className="watch-overlay" onClick={onClose}>
      <div className="watch-shell" onClick={e => e.stopPropagation()}>
        <header className="watch-header">
          <div className="watch-header-left">
            <button className="watch-back-btn" onClick={onClose}>
              <ChevronLeft size={22} /> {anime.title || "Back"}
            </button>
          </div>
          <div className="watch-header-center">
            {episode && <span className="watch-title">Episode {episode.episode}</span>}
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
              <p>Loading stream...</p>
            </div>
          )}
          {error && <div className="watch-error">{error}</div>}
          {!loading && !error && episode && (
            <div className="watch-player-wrap">
              <iframe
                key={episode.url}
                className="watch-player"
                src={episode.url}
                title={`Episode ${episode.episode}`}
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
              />
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
        </footer>
      </div>
    </div>
  );
}
