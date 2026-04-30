import React from "react";
import { useNavigate } from "react-router-dom";
import { getAllAnime } from "../data/animeData";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="home-header">
      <div className="logo-container" onClick={() => navigate("/home")}>
        <h1>Anime<span>Watch</span></h1>
      </div>
      <nav className="header-nav">
        <button onClick={() => navigate("/home")}>Home</button>
        <button onClick={() => navigate("/search")}>Search</button>
        <button onClick={() => navigate("/history")}>History</button>
        <button onClick={() => navigate("/watchlist")}>Watchlist</button>
        <button onClick={() => navigate("/profile")}>Profile</button>
        <button className="logout-btn" onClick={() => navigate("/")}>Logout</button>
      </nav>
    </header>
  );
}
