import React from "react";
import { useNavigate } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <strong>AnimeWch</strong>
          <span>Your ultimate anime destination</span>
        </div>
        <div className="footer-links">
          <button onClick={() => navigate("/browse/anime")}>Browse Anime</button>
          <button onClick={() => navigate("/browse/manga")}>Manga</button>
          <button onClick={() => navigate("/news")}>News</button>
          <button onClick={() => navigate("/settings")}>Settings</button>
        </div>
        <p className="footer-copy">&copy; {new Date().getFullYear()} AnimeWch. Not affiliated with any studios.</p>
      </div>
    </footer>
  );
}
