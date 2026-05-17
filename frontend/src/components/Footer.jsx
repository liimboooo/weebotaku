import React from "react";
import { useNavigate } from "react-router-dom";
import { Film, Users, Settings } from "lucide-react";
import "./Footer.css";

export default function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="footer">
      <div className="footer-glow" />
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand-row">
              <span className="footer-brand-icon">
                <img src="/logo.png" alt="AnimeWch" className="footer-logo" />
              </span>
              <strong>AnimeWch</strong>
            </div>
            <span>Your ultimate anime community.</span>
          </div>
          <div className="footer-links">
            <div className="footer-links-col">
              <span className="footer-links-title"><Film size={12} /> Browse</span>
              <button onClick={() => navigate("/browse/anime")}>Anime</button>
              <button onClick={() => navigate("/browse/manga")}>Manga</button>
              <button onClick={() => navigate("/news")}>News</button>
              <button onClick={() => navigate("/arena/tier-lists")}>Rankings</button>
            </div>
            <div className="footer-links-col">
              <span className="footer-links-title"><Users size={12} /> Community</span>
              <button onClick={() => navigate("/profile")}>Profile</button>
              <button onClick={() => navigate("/watchlist")}>Watchlist</button>
              <button onClick={() => navigate("/history")}>History</button>
              <button onClick={() => navigate("/watch-together")}>Watch Together</button>
            </div>
            <div className="footer-links-col">
              <span className="footer-links-title"><Settings size={12} /> Support</span>
              <button onClick={() => navigate("/settings")}>Settings</button>
              <button onClick={() => navigate("/help")}>Help</button>
              <button onClick={() => navigate("/system/rules")}>Rules</button>
              <button onClick={() => navigate("/report")}>Report</button>
            </div>
          </div>
        </div>
        <div className="footer-divider" />
        <div className="footer-bottom">
          <p className="footer-copy">&copy; {new Date().getFullYear()} AnimeWch. Not affiliated with any studios.</p>
          <div className="footer-badges">
            <span className="footer-badge">React</span>
            <span className="footer-badge">Jikan API</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
