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
      <div className="auth-image-brand">
        <span className="auth-image-tagline">The social platform for anime fans.</span>

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