import React from "react";

const features = [
  { emoji: "🎬", title: "Join Watch Parties", desc: "Synchronized rooms with live chat & reactions" },
  { emoji: "👥", title: "Meet Anime Fans", desc: "Match profiles by taste, build your community" },
  { emoji: "📊", title: "Track Everything", desc: "Watchlist, ratings, history — all synced" },
  { emoji: "🏆", title: "Earn Your Aura", desc: "Levels, badges, streaks, and reputation" },
];

export default function AuthImage() {
  return (
    <div className="auth-image">
      <img src="/beta-1.jpg" alt="" aria-hidden />
      <div className="auth-image-overlay" />
      <div className="auth-image-glow-orb auth-image-glow-orb--1" />
      <div className="auth-image-glow-orb auth-image-glow-orb--2" />
      <div className="auth-image-brand">
        <div className="auth-image-logo-row">
          <div className="auth-image-logo-mark">
            <span className="auth-image-logo-letter">A</span>
          </div>
          <div className="auth-image-logo-text">
            <span className="auth-image-logo-title">AnimeWch</span>
            <span className="auth-image-logo-badge">SOCIAL</span>
          </div>
        </div>

        <h1 className="auth-image-tagline">
          The social platform for <span className="text-gradient-neon">anime fans</span>.
        </h1>

        <p className="auth-image-description">
          Watch together, track your journey, earn your aura — everything anime, one community.
        </p>

        <div className="auth-image-features">
          {features.map((f) => (
            <div key={f.title} className="auth-image-feature">
              <span className="aif-emoji">{f.emoji}</span>
              <div className="aif-text">
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="auth-image-cta-row">
          <span className="trending-pill">1.2K watching now</span>
          <span className="trending-pill">Live rooms active</span>
        </div>

        <div className="auth-image-footer">
          <div className="aif-dots">
            <span className="aif-dot active" />
            <span className="aif-dot" />
            <span className="aif-dot" />
          </div>
          <span className="aif-stat">Join 10,000+ anime fans</span>
        </div>
      </div>
    </div>
  );
}
