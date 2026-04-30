import React from "react";
import { useNavigate } from "react-router-dom";
import "./FeaturedAnime.css";

export default function FeaturedAnime({ animeList }) {
  const navigate = useNavigate();

  return (
    <section className="featured-section">
      <div className="anime-grid">
        {animeList.map((anime) => (
          <div
            className="anime-card"
            key={anime.id}
            onClick={() => navigate(`/anime/${anime.id}`)}
          >
            <div className="card-img-wrapper">
              <img src={anime.img} alt={anime.name} />
              <div className="card-overlay">
                <ion-icon name="play-circle"></ion-icon>
              </div>
              <div className="card-badges">
                {anime.rating && <span className="badge rating">★ {anime.rating}</span>}
                {anime.episodes && <span className="badge eps">{anime.episodes} EP</span>}
              </div>
            </div>
            <div className="card-info">
              <h3>{anime.name}</h3>
              <p className="card-genres">
                {anime.genres ? anime.genres.slice(0, 2).join(", ") : "Anime"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
