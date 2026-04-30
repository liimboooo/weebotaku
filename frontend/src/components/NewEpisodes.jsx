import React from "react";
import { useNavigate } from "react-router-dom";
import { getNewEpisodes } from "../data/animeData";
import "./NewEpisodes.css";

export default function NewEpisodes() {
  const navigate = useNavigate();
  const episodes = getNewEpisodes();

  return (
    <section className="new-episodes-section">
      <h2>📺 New Episodes</h2>
      <p className="section-subtitle">Upcoming episodes you won't want to miss</p>
      <div className="episodes-list">
        {episodes.map((anime) => (
          <div
            className="episode-card"
            key={anime.id}
            onClick={() => navigate(`/anime/${anime.id}`)}
          >
            <div className="episode-img-wrap">
              <img src={anime.img} alt={anime.name} />
              <div className="episode-overlay">
                <ion-icon name="play-circle" className="play-icon"></ion-icon>
              </div>
            </div>
            <div className="episode-info">
              <h3>{anime.name}</h3>
              <p className="ep-number">Episode {anime.currentEp + 1}</p>
              <div className="ep-date">
                <ion-icon name="calendar-outline"></ion-icon>
                <span>{anime.nextEpDate}</span>
              </div>
              <span className={`ep-status ${anime.status.toLowerCase()}`}>
                {anime.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
