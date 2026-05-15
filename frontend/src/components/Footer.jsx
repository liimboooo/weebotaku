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
          <div className="footer-links-col">
            <span className="footer-links-title">Browse</span>
            <button onClick={() => navigate("/browse/anime")}>Anime</button>
            <button onClick={() => navigate("/browse/manga")}>Manga</button>
            <button onClick={() => navigate("/news")}>News</button>
            <button onClick={() => navigate("/arena/tier-lists")}>Rankings</button>
          </div>
          <div className="footer-links-col">
            <span className="footer-links-title">Community</span>
            <button onClick={() => navigate("/profile")}>Profile</button>
            <button onClick={() => navigate("/watchlist")}>Watchlist</button>
            <button onClick={() => navigate("/history")}>History</button>
            <button onClick={() => navigate("/watch-together")}>Watch Together</button>
          </div>
          <div className="footer-links-col">
            <span className="footer-links-title">Support</span>
            <button onClick={() => navigate("/settings")}>Settings</button>
            <button onClick={() => navigate("/help")}>Help</button>
            <button onClick={() => navigate("/system/rules")}>Rules</button>
            <button onClick={() => navigate("/report")}>Report</button>
          </div>
        </div>
        <p className="footer-copy">&copy; {new Date().getFullYear()} AnimeWch. Not affiliated with any studios.</p>
      </div>
    </footer>
  );
}
