import React from "react";
import { useNavigate } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="site-footer">
      <div className="footer-glow"></div>
      <div className="footer-content">
        <div className="footer-brand">
          <h2 onClick={() => navigate("/home")}>AnimeWatch</h2>
          <p>Your gateway to the best anime experience. Discover, track, and binge your favorite series.</p>
          <div className="footer-socials">
            <a href="#!" aria-label="Twitter"><ion-icon name="logo-twitter"></ion-icon></a>
            <a href="#!" aria-label="Discord"><ion-icon name="logo-discord"></ion-icon></a>
            <a href="#!" aria-label="Instagram"><ion-icon name="logo-instagram"></ion-icon></a>
            <a href="#!" aria-label="YouTube"><ion-icon name="logo-youtube"></ion-icon></a>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h3>Browse</h3>
            <button onClick={() => navigate("/home")}>Home</button>
            <button onClick={() => navigate("/history")}>History</button>
            <button onClick={() => navigate("/watchlist")}>Watchlist</button>
          </div>
          <div className="footer-col">
            <h3>Genres</h3>
            <button onClick={() => navigate("/search?q=action")}>Action</button>
            <button onClick={() => navigate("/search?q=romance")}>Romance</button>
            <button onClick={() => navigate("/search?q=fantasy")}>Fantasy</button>
            <button onClick={() => navigate("/search?q=mystery")}>Mystery</button>
          </div>
          <div className="footer-col">
            <h3>Account</h3>
            <button onClick={() => navigate("/profile")}>Profile</button>
            <button onClick={() => navigate("/watchlist")}>My Watchlist</button>
            <button onClick={() => navigate("/")}>Sign Out</button>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 AnimeWatch. All rights reserved.</p>
        <p className="footer-tagline">Made with ❤️ for anime fans</p>
      </div>
    </footer>
  );
}
