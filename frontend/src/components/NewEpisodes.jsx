import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNewEpisodes } from "../data/animeData";
import "./NewEpisodes.css";

export default function NewEpisodes() {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getNewEpisodes().then(setEpisodes).catch((err) => setError(err.message || "Failed to load episodes"));
  }, []);

  if (error) return <div className="new-episodes-error">Could not load new episodes.</div>;
  if (episodes.length === 0) return null;

  return (
    <div className="new-episodes-grid">
      {episodes.map((ep, i) => (
        <div
          key={ep.id}
          className="new-ep-card"
          onClick={() => navigate(`/anime/${ep.id}`)}
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="new-ep-img">
            <img src={ep.img} alt={ep.name} loading="lazy" />
            <div className="new-ep-overlay">
              <span className="new-ep-play">▶</span>
            </div>
          </div>
          <div className="new-ep-info">
            <div className="new-ep-title">{ep.name}</div>
            <div className="new-ep-number">Episode {ep.currentEp || "?"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
