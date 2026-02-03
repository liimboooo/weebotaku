import React from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="home-header">
      <h1 >Anime Watch</h1>
      <nav>
        <button onClick={() => navigate("/profile")}>Profile</button>
        <button onClick={() => navigate("/watchlist")}>Watchlist</button>
        <button onClick={() => navigate("/login")}>Logout</button>
      </nav>
    </header>
  );
}
