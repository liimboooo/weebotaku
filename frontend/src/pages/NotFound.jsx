import React from "react";
import { useNavigate } from "react-router-dom";
import AnimatedPage from "../components/AnimatedPage";
import Header from "../components/Header";
import Background from "../components/Background";
import { Home, Search, BookOpen } from "lucide-react";
import "./NotFound.css";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <AnimatedPage>
      <div className="nf-page">
        <Background />
        <Header />
        <div className="nf-container">
          <div className="nf-code">
            <span className="nf-char nf-char-1">4</span>
            <span className="nf-char nf-char-2">0</span>
            <span className="nf-char nf-char-3">4</span>
          </div>
          <div className="nf-divider" />
          <h1 className="nf-title">Page Not Found</h1>
          <p className="nf-desc">
            This page doesn't exist or has been moved to another dimension.
          </p>
          <div className="nf-actions">
            <button className="nf-btn nf-btn-primary" onClick={() => navigate("/home")}>
              <Home size={16} /> Go Home
            </button>
            <button className="nf-btn" onClick={() => navigate("/browse/anime")}>
              <Search size={16} /> Browse Anime
            </button>
            <button className="nf-btn" onClick={() => navigate("/browse/manga")}>
              <BookOpen size={16} /> Browse Manga
            </button>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
