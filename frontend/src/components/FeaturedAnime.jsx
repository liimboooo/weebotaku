import React from "react";
import { useNavigate } from "react-router-dom";
import "./FeaturedAnime.css";

export default function FeaturedAnime({ animeList }) {
  const navigate = useNavigate();

  return (
    <section className="featured-section">
      <h2>Featured Anime</h2>
      <div className="anime-grid">
        {animeList.map((anime) => (
          <div
            className="anime-card"
            key={anime.id}
            onClick={() => navigate(`/anime/${anime.id}`)}
          >
            <img src={anime.img} alt={anime.name} />
            <p>{anime.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
