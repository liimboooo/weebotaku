import React from "react";
import { useNavigate } from "react-router-dom";
import AnimatedPage from "../components/AnimatedPage";

import Background from "../components/Background";
import { Home, Search, Play, ArrowLeft } from "lucide-react";
import { loadWatchHistory } from "../services/storage";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./NotFound.css";

export default function NotFound() {
  useDocumentTitle("Page Not Found");
  const navigate = useNavigate();
  const lastWatched = loadWatchHistory()[0] || null;

  return (
    <AnimatedPage>
      <div className="nf-page">
        <Background />
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
          {lastWatched && (
            <button
              className="nf-btn nf-btn-primary"
              style={{ marginBottom: 16, justifyContent: 'center' }}
              onClick={() => navigate(`/anime/${lastWatched.animeId}?ep=${lastWatched.episode || 1}`)}
            >
              <Play size={16} fill="currentColor" /> Continue {lastWatched.animeName || 'Last Watched'} – Ep {lastWatched.episode}
            </button>
          )}
          <div className="nf-actions">
            <button className="nf-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Go Back
            </button>
            <button className="nf-btn" onClick={() => navigate("/home")}>
              <Home size={16} /> Home
            </button>
            <button className="nf-btn" onClick={() => navigate("/browse/anime")}>
              <Search size={16} /> Browse Anime
            </button>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
