import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { searchAnime, getAllGenres } from "../data/animeData";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Background from "../components/Background";
import "./SearchPage.css";

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [activeGenre, setActiveGenre] = useState("All");
  const genres = ["All", ...getAllGenres()];

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    let filtered = searchAnime(query);
    if (activeGenre !== "All") {
      filtered = filtered.filter((a) =>
        a.genres.some((g) => g.toLowerCase() === activeGenre.toLowerCase())
      );
    }
    setResults(filtered);
  }, [query, activeGenre]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalf = rating % 2 >= 1;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    return (
      <>
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="star full">★</span>
        ))}
        {hasHalf && <span className="star half">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="star empty">★</span>
        ))}
      </>
    );
  };

  return (
    <div className="search-page">
      <Background />
      <Header />

      <div className="search-hero">
        <h1>Search Anime</h1>
        <p>Find your next obsession from our collection</p>
        <form className="search-hero-form" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <ion-icon name="search-outline"></ion-icon>
            <input
              type="text"
              placeholder="Search by title, genre, studio..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button type="button" className="clear-btn" onClick={() => setQuery("")}>
                <ion-icon name="close-circle"></ion-icon>
              </button>
            )}
          </div>
          <button type="submit" className="search-submit-btn">Search</button>
        </form>
      </div>

      <div className="genre-filter">
        {genres.map((genre) => (
          <button
            key={genre}
            className={`genre-pill ${activeGenre === genre ? "active" : ""}`}
            onClick={() => setActiveGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      <div className="results-info">
        <span>{results.length} anime found</span>
        {query && <span className="results-query">for "{query}"</span>}
      </div>

      {results.length > 0 ? (
        <div className="search-results-grid">
          {results.map((anime) => (
            <div
              className="search-result-card"
              key={anime.id}
              onClick={() => navigate(`/anime/${anime.id}`)}
            >
              <div className="result-img-wrap">
                <img src={anime.img} alt={anime.name} />
                <div className="result-overlay">
                  <span className={`result-status ${anime.status.toLowerCase()}`}>
                    {anime.status}
                  </span>
                </div>
              </div>
              <div className="result-content">
                <h3>{anime.name}</h3>
                <div className="result-meta">
                  <span>{anime.year}</span>
                  <span>•</span>
                  <span>{anime.episodes} eps</span>
                </div>
                <div className="result-rating">
                  <div className="stars">{renderStars(anime.rating)}</div>
                  <span className="rating-val">{anime.rating}</span>
                </div>
                <div className="result-genres">
                  {anime.genres.slice(0, 2).map((g) => (
                    <span key={g} className="mini-genre">{g}</span>
                  ))}
                </div>
                <p className="result-desc">{anime.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <ion-icon name="search-outline"></ion-icon>
          <h3>No anime found</h3>
          <p>Try a different search term or browse by genre</p>
        </div>
      )}

      <Footer />
    </div>
  );
}
