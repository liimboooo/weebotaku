import React, { useState } from 'react';
import './PremiumProfileDropdown.css';

export default function PremiumProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const username = localStorage.getItem('username') || 'load C';
  const episodesWatched = Number(localStorage.getItem('userEpisodesWatched') || 128);
  const currentStreak = Number(localStorage.getItem('userCurrentStreak') || 12);
  const bountyValue = Number(localStorage.getItem('userBountyValue') || 1500000000);
  const rankState = calculateRank(bountyValue);

  const calculateRank = (bounty) => {
    const rankTrack = [
      { name: 'Rookie', min: 0, max: 100000000 },
      { name: 'Veteran', min: 100000000, max: 500000000 },
      { name: 'Legend', min: 500000000, max: 1500000000 },
      { name: 'Infinite', min: 1500000000, max: Infinity },
    ];

    const current = [...rankTrack].reverse().find((entry) => bounty >= entry.min) || rankTrack[0];
    const currentIndex = rankTrack.findIndex((entry) => entry.name === current.name);
    const next = rankTrack[currentIndex + 1] || null;
    const span = next ? next.max - current.min : 0;
    const progress = next ? Math.max(0, Math.min(100, ((bounty - current.min) / span) * 100)) : 100;
    const remaining = next ? Math.max(0, next.max - bounty) : 0;
    return { current, next, progress, remaining, isMaxed: !next };
  };

  return (
    <div className="premium-profile-dropdown-wrapper">
      <button 
        className="premium-profile-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open profile menu"
      >
        <div className="premium-avatar-wrapper">
          <img 
            src={localStorage.getItem('userAvatar') || ''} 
            alt={username} 
            className="premium-avatar"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff5959"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"/></svg>';
            }}
          />
          <div className="premium-status-ring"></div>
        </div>
        <div className="premium-profile-info">
          <div className="premium-username">{username}</div>
          <div className="premium-rank-title">{rankState.current.name}</div>
        </div>
        <span className="premium-dropdown-chevron">▼</span>
      </button>

      {isOpen && (
        <div className="premium-profile-dropdown">
          <div className="premium-dropdown-header">
            <div className="premium-avatar-large">
              <img 
                src={localStorage.getItem('userAvatar') || ''} 
                alt={username} 
                className="premium-avatar-large-img"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff5959"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"/></svg>';
                }}
              />
              <div className="premium-status-ring-large"></div>
            </div>
            <div className="premium-profile-details">
              <div className="premium-username-large">{username}</div>
              <div className="premium-rank-title-large">{rankState.current.name}</div>
              <div className="premium-bounty-value">
                <span className="bounty-icon">🎯</span>
                <span className="bounty-amount">฿{(bountyValue / 1000000000).toFixed(1)}B</span>
              </div>
            </div>
          </div>

          <div className="premium-stats-grid">
            <div className="premium-stat-card">
              <div className="premium-stat-icon">▶️</div>
              <div className="premium-stat-info">
                <div className="premium-stat-value">{episodesWatched}</div>
                <div className="premium-stat-label">Episodes Watched</div>
              </div>
            </div>
            <div className="premium-stat-card">
              <div className="premium-stat-icon">🔥</div>
              <div className="premium-stat-info">
                <div className="premium-stat-value">{currentStreak}</div>
                <div className="premium-stat-label">Day Streak</div>
              </div>
            </div>
          </div>

          <div className="premium-nav-menu">
            <button className="premium-nav-item" onClick={() => {/* navigate to profile */}}>
              <span className="premium-nav-icon">⚙️</span>
              <span className="premium-nav-text">My Profile</span>
            </button>
            <button className="premium-nav-item" onClick={() => {/* navigate to watchlist */}}>
              <span className="premium-nav-icon">📋</span>
              <span className="premium-nav-text">Watchlist</span>
            </button>
            <button className="premium-nav-item" onClick={() => {/* navigate to settings */}}>
              <span className="premium-nav-icon">🔧</span>
              <span className="premium-nav-text">Settings</span>
            </button>
          </div>

          <div className="premium-divider"></div>

          <button className="premium-logout-btn" onClick={() => {
            localStorage.removeItem('username');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userAvatar');
            localStorage.removeItem('userStatusMessage');
            localStorage.removeItem('userEpisodesWatched');
            localStorage.removeItem('userCurrentStreak');
            localStorage.removeItem('userBountyValue');
            localStorage.removeItem('userUnclaimedRewards');
            // navigate to home
          }}>
            <span className="premium-logout-icon">🚪</span>
            <span className="premium-logout-text">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}