import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  ChevronDown,
  Dices,
  Globe,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Star,
  Sun,
  Users,
  Video,
  X,
} from 'lucide-react';
import { getAllAnime } from '../data/animeData';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [feedsOpen, setFeedsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [randomPick, setRandomPick] = useState(null);
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('userAvatar') || '');
  const [isDark, setIsDark] = useState(true);

  const feedsRef = useRef(null);
  const exploreRef = useRef(null);
  const profileRef = useRef(null);
  const randomTimeoutRef = useRef(null);

  const username = localStorage.getItem('username') || 'zabi';

  const feedItems = useMemo(
    () => [
      { label: 'Global Feed', path: '/feeds/global', icon: Globe },
      { label: 'Following', path: '/feeds/following', icon: Users },
      { label: 'Trending Discussions', path: '/feeds/trending', icon: MessageSquare },
      { label: 'Fan Art & Reviews', path: '/feeds/fanart', icon: Star },
      { label: 'Watch Together', path: '/watch-together', icon: Video, description: 'Watch with friends in real-time' },
    ],
    []
  );

  useEffect(() => {
    const closeOnClickOutside = (event) => {
      if (feedsRef.current && !feedsRef.current.contains(event.target)) setFeedsOpen(false);
      if (exploreRef.current && !exploreRef.current.contains(event.target)) setExploreOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
    };

    document.addEventListener('click', closeOnClickOutside);
    return () => document.removeEventListener('click', closeOnClickOutside);
  }, []);

  useEffect(() => {
    const syncAvatar = () => setProfileImage(localStorage.getItem('userAvatar') || '');
    window.addEventListener('storage', syncAvatar);
    window.addEventListener('profile-avatar-updated', syncAvatar);
    return () => {
      window.removeEventListener('storage', syncAvatar);
      window.removeEventListener('profile-avatar-updated', syncAvatar);
    };
  }, []);

  const navigateTo = (path) => {
    navigate(path);
    setMobileOpen(false);
    setExploreOpen(false);
    setFeedsOpen(false);
    setProfileOpen(false);
  };

  const handleSearch = () => {
    const query = searchTerm.trim();
    if (!query) return;
    navigateTo(`/search?q=${encodeURIComponent(query)}`);
  };

  const pickRandomAnime = () => {
    const allAnime = getAllAnime();
    if (!allAnime.length) return;
    const item = allAnime[Math.floor(Math.random() * allAnime.length)];
    setRandomPick(item);
    clearTimeout(randomTimeoutRef.current);
    randomTimeoutRef.current = setTimeout(() => setRandomPick(null), 4000);
  };

  const toggleTheme = () => {
    setIsDark((value) => !value);
    setProfileOpen(false);
  };

  const navLinkClass = (path) =>
    `nav-link ${location.pathname === path ? 'active' : ''}`;

  return (
    <header className="header">
      <div className="header-shell">
        <button className="mobile-toggle" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <button className="brand" onClick={() => navigateTo('/home')} aria-label="AnimeWch home">
          <span className="brand-icon">
            <img className="brand-logo" src="/logo.png" alt="AnimeWch" />
          </span>
          <span className="brand-text">AnimeWch</span>
        </button>

        <div className={`header-panel ${mobileOpen ? 'open' : ''}`}>
          <nav className="header-nav" aria-label="Primary">
            <div className="explore-dropdown-container" ref={exploreRef}>
              <button
                className={`${navLinkClass('/seasonal')} explore-button`}
                onClick={() => setExploreOpen((value) => !value)}
                aria-expanded={exploreOpen}
                aria-haspopup="true"
              >
                Explore <ChevronDown size={14} />
              </button>
              {exploreOpen && (
                <div className="explore-dropdown">
                  <button className="explore-item" onClick={() => navigateTo('/seasonal')}>
                    <span className="explore-item-label">Release Schedule</span>
                    <span className="explore-item-description">See upcoming episodes and seasonal drops</span>
                  </button>
                  <button className="explore-item" onClick={() => navigateTo('/seasonal/charts')}>
                    <span className="explore-item-label">Seasonal Charts</span>
                    <span className="explore-item-description">Track top titles by season</span>
                  </button>
                </div>
              )}
            </div>

            <button className={navLinkClass('/browse')} onClick={() => navigateTo('/browse')}>
              Browse
            </button>

            <div className="explore-dropdown-container" ref={feedsRef}>
              <button
                className={navLinkClass('/feeds/global')}
                onClick={() => setFeedsOpen((value) => !value)}
                aria-expanded={feedsOpen}
                aria-haspopup="true"
              >
                Feeds <ChevronDown size={14} />
              </button>

              {feedsOpen && (
                <div className="feeds-dropdown">
                  {feedItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.path} className="feeds-item" onClick={() => navigateTo(item.path)}>
                        <span className="feeds-item-icon">
                          <Icon size={16} />
                        </span>
                        <span>
                          <span className="feeds-item-label">{item.label}</span>
                          {item.description ? <span className="feeds-item-description">{item.description}</span> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          <form className="search-form" onSubmit={(event) => { event.preventDefault(); handleSearch(); }}>
            <span className="search-icon">
              <Search size={16} />
            </span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search anime"
              aria-label="Search anime"
            />
            <button type="submit">Go</button>
            <button type="button" className="action-icon" onClick={pickRandomAnime} aria-label="Random anime">
              <Dices size={16} />
            </button>
          </form>

          <div className="header-actions">
            <button className="action-icon" onClick={() => navigateTo('/watch-together')} aria-label="Watch Together">
              <Video size={16} />
            </button>

            <button className="action-icon notifications-btn" onClick={() => navigateTo('/watchlist')} aria-label="Watchlist">
              <Bookmark size={16} />
            </button>

            <button className="action-icon notifications-btn" onClick={() => navigateTo('/notifications')} aria-label="Notifications">
              <Bell size={16} />
              <span className="notification-badge">3</span>
            </button>

            <div className="profile-dropdown-container" ref={profileRef}>
              <button className="profile-button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}>
                <span className="profile-avatar">
                  {profileImage ? <img className="profile-picture" src={profileImage} alt={username} /> : username.slice(0, 2).toUpperCase()}
                </span>
                <span className="profile-username">{username}</span>
                <ChevronDown size={14} />
              </button>

              {profileOpen && (
                <div className="feeds-dropdown" style={{ right: 0, left: 'auto', minWidth: '220px' }}>
                  <button className="feeds-item" onClick={() => navigateTo('/profile')}>
                    <span className="feeds-item-icon">
                      <Users size={16} />
                    </span>
                    <span>
                      <span className="feeds-item-label">Profile</span>
                      <span className="feeds-item-description">View or edit your account</span>
                    </span>
                  </button>

                  <button className="feeds-item" onClick={toggleTheme}>
                    <span className="feeds-item-icon">
                      {isDark ? <Moon size={16} /> : <Sun size={16} />}
                    </span>
                    <span>
                      <span className="feeds-item-label">Toggle Theme</span>
                      <span className="feeds-item-description">Switch between light and dark</span>
                    </span>
                  </button>

                  <button className="feeds-item" onClick={() => window.location.reload()}>
                    <span className="feeds-item-icon">
                      <Globe size={16} />
                    </span>
                    <span>
                      <span className="feeds-item-label">Translate</span>
                      <span className="feeds-item-description">Language and translation options</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {randomPick ? (
          <div className="feeds-dropdown" style={{ right: 18, left: 'auto', top: 'calc(100% + 10px)', minWidth: '280px' }}>
            <button className="feeds-item" onClick={() => navigateTo(`/anime/${randomPick.id}`)}>
              <span className="feeds-item-icon">
                <Dices size={16} />
              </span>
              <span>
                <span className="feeds-item-label">Random pick: {randomPick.name}</span>
                <span className="feeds-item-description">Open the anime details page</span>
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}