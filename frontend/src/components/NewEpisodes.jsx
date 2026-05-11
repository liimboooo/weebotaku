import React from "react";
import { useNavigate } from "react-router-dom";
import "./NewEpisodes.css";

export default function NewEpisodes() {
  const navigate = useNavigate();

  const episodes = [
    { id: 6, name: "Jujutsu Kaisen", ep: "Episode 48", img: "/beta-3.jpg" },
    { id: 3, name: "Demon Slayer", ep: "Episode 55", img: "/beta-3.jpg" },
    { id: 2, name: "One Piece", ep: "Episode 1100", img: "/beta-2.jpg" },
    { id: 7, name: "My Hero Academia", ep: "Episode 138", img: "/beta-1.jpg" },
  ];

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
            <img src={ep.img} alt={ep.name} />
            <div className="new-ep-overlay">
              <span className="new-ep-play">▶</span>
            </div>
          </div>
          <div className="new-ep-info">
            <h4>{ep.name}</h4>
            <span>{ep.ep}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
