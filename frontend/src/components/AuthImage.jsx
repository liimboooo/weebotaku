import React, { useState, useEffect } from "react";
import { Film, Users, TrendingUp, Trophy } from "lucide-react";
import configService from "../services/configService";

const ICON_MAP = { Film, Users, TrendingUp, Trophy };

export default function AuthImage() {
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    configService.getFeatures().then(res => {
      if (res.success) setFeatures(res.data);
    }).catch(err => console.error('[AnimeWch] Failed to load auth page features:', err));
  }, []);

  return (
    <div className="auth-image">
      <img src="/beta-1.jpg" alt="" aria-hidden />
      <div className="auth-image-overlay" />
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
          {features.map((f) => {
            const Icon = ICON_MAP[f.icon] || Film;
            return (
              <div key={f.title} className="auth-image-feature">
                <span className="aif-emoji"><Icon size={20} /></span>
                <div className="aif-text">
                  <strong>{f.title}</strong>
                  <span>{f.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="auth-image-cta-row">
          <span className="trending-pill">Anime streaming platform</span>
          <span className="trending-pill">Live rooms active</span>
        </div>

        <div className="auth-image-footer">
          <div className="aif-dots">
            <span className="aif-dot active" />
            <span className="aif-dot" />
            <span className="aif-dot" />
          </div>
          <span className="aif-stat">Join the community</span>
        </div>
      </div>
    </div>
  );
}
