import React from "react";

export default function AuthImage() {
  return (
    <div className="auth-image">
      <img src="/beta-1.jpg" alt="Anime backdrop" />
      <div className="auth-image-overlay" />
      <div className="auth-image-brand">
        <h2>
          AnimeWch
          <span>Discover your next obsession</span>
        </h2>
        <p>Thousands of anime & manga titles at your fingertips.</p>
      </div>
    </div>
  );
}
