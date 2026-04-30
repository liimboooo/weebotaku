import React from "react";
import { useNavigate } from "react-router-dom";
import "./Categories.css";

export default function Categories({ categories }) {
  const navigate = useNavigate();

  return (
    <section className="categories-section">
      <div className="section-title">
        <h2>🎭 Browse by Genre</h2>
        <p>Find your next favorite anime</p>
      </div>
      <div className="categories-grid">
        {categories.map((cat) => (
          <div 
            key={cat} 
            className="category-card"
            onClick={() => navigate(`/search?genre=${cat}`)}
          >
            <h3>{cat}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}
