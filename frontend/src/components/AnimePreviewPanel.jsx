import React from "react";
import { motion } from "framer-motion";
import { X, Play, Bookmark, ThumbsUp, Film, Calendar, Monitor } from "lucide-react";
import "./AnimePreviewPanel.css";

export default function AnimePreviewPanel({ anime, onClose, onPlay, onWatchlist, onLike }) {
  if (!anime) return null;

  const meta = [
    { label: "Year", value: anime.year || anime.seasonYear, icon: Calendar },
    { label: "Rating", value: anime.rating ? `${anime.rating.toFixed(1)} / 10` : "N/A", icon: Monitor },
    { label: "Episodes", value: `${anime.episodes || "?"} EP`, icon: Film },
    { label: "Quality", value: "HD", icon: Monitor, accent: true },
  ].filter(m => m.value && m.value !== "N/A");

  const hasTrailer = anime.trailerUrl && anime.trailerUrl.includes("youtube");
  const hasBanner = anime.bannerImage || anime.backdrop;

  return (
    <motion.div
      className="preview-panel"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
      layout
    >
      <div className="preview-panel-left">
        <button className="preview-panel-close" onClick={onClose} aria-label="Close preview">
          <X size={16} />
        </button>

        <h2 className="preview-panel-title">{anime.name || anime.title?.romaji}</h2>

        <div className="preview-panel-stats">
          {meta.map((m, i) => (
            <span key={i} className={`preview-panel-stat${m.accent ? " accent" : ""}`}>
              {m.icon && <m.icon size={11} style={{ display: "inline", marginRight: 4 }} />}
              {m.value}
            </span>
          ))}
        </div>

        <p className="preview-panel-synopsis">
          {anime.synopsis || anime.description || "No synopsis available."}
        </p>

        <div className="preview-panel-actions">
          <button className="preview-panel-btn primary" onClick={onPlay}>
            <Play size={16} fill="currentColor" /> Watch Now
          </button>
          <button className="preview-panel-btn secondary" onClick={onWatchlist}>
            <Bookmark size={14} /> Add to Watchlist
          </button>
          <button className="preview-panel-btn icon" onClick={onLike} aria-label="Like">
            <ThumbsUp size={14} />
          </button>
        </div>

        <div className="preview-panel-details">
          <div className="preview-panel-detail-item">
            <span className="preview-panel-detail-label">Cast</span>
            <span className="preview-panel-detail-value">
              {anime.studios?.length ? anime.studios.join(", ") : "Various"}
            </span>
          </div>
          <div className="preview-panel-detail-item">
            <span className="preview-panel-detail-label">Genres</span>
            <span className="preview-panel-detail-value">
              {anime.genres?.length ? anime.genres.join(", ") : "N/A"}
            </span>
          </div>
        </div>
      </div>

      <div className="preview-panel-right">
        {hasTrailer ? (
          <div className="preview-panel-media">
            <iframe
              src={anime.trailerUrl}
              title={anime.name}
              allow="autoplay; encrypted-media"
              style={{ border: 0 }}
            />
          </div>
        ) : hasBanner ? (
          <div className="preview-panel-media">
            <img src={anime.bannerImage || anime.backdrop} alt="" />
          </div>
        ) : (
          <div className="preview-panel-media">
            <img src={anime.img} alt="" style={{ objectFit: "cover" }} />
          </div>
        )}
        <div className="preview-panel-fade" />
      </div>
    </motion.div>
  );
}
