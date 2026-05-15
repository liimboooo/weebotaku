import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  Bookmark,
  ChevronDown,
  LogOut,
  PenLine,
  Globe,
  Menu,
  MessageSquare,
  Newspaper,
  Search,
  Settings,
  Star,
  Swords,
  Users,
  Video,
  X,
} from 'lucide-react';
import { getNotifications, getUnreadCount, markRead, markAllRead, clearNotifications } from '../services/notificationService';
import authService from '../services/authService';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [feedsOpen, setFeedsOpen] = useState(false);
  const [arenaOpen, setArenaOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('userAvatar') || '');
  const [statusMessage, setStatusMessage] = useState(() => localStorage.getItem('userStatusMessage') || 'Watching One Piece...');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState(getNotifications());
  const [previewOpen, setPreviewOpen] = useState(false);
  const notifRef = useRef(null);
  const notifCount = notifList.filter(n => !n.read).length;

  useEffect(() => {
    const handler = () => setNotifList(getNotifications());
    window.addEventListener("notification-added", handler);
    window.addEventListener("storage", handler);
    handler();
    return () => {
      window.removeEventListener("notification-added", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const feedsRef = useRef(null);
  const exploreRef = useRef(null);
  const arenaRef = useRef(null);
  const profileRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const statusInputRef = useRef(null);
  const statusSaveTimeoutRef = useRef(null);
  const headerPanelRef = useRef(null);
  const searchRef = useRef(null);

  const username = localStorage.getItem('username') || 'zabi';
  const episodesWatched = Number(localStorage.getItem('userEpisodesWatched') || 128);
  const hasUnclaimedRewards = localStorage.getItem('userUnclaimedRewards') === 'true';

  const feedItems = useMemo(
    () => [
      { label: 'AMVs & Edits', path: '/feeds/amvs', icon: Star, description: 'High-energy AMVs and creative edits from the community' },
      { label: 'Live Rooms', path: '/watch-together', icon: Video, description: 'Jump into live rooms and sync the next episode together' },
      { label: 'Anime News', path: '/news', icon: Newspaper, description: 'Trending, new episodes & announcements' },
    ],
    []
  );


  function formatTimeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }

  useEffect(() => {
    const closeOnClickOutside = (event) => {
      if (feedsRef.current && !feedsRef.current.contains(event.target)) setFeedsOpen(false);
      if (exploreRef.current && !exploreRef.current.contains(event.target)) setExploreOpen(false);
      if (arenaRef.current && !arenaRef.current.contains(event.target)) setArenaOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) setMoreDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    };
    document.addEventListener('click', closeOnClickOutside);
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', closeOnClickOutside);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    const syncAvatar = () => setProfileImage(localStorage.getItem('userAvatar') || '');
    const syncStatus = () => setStatusMessage(localStorage.getItem('userStatusMessage') || 'Watching One Piece...');
    const syncOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('storage', syncAvatar);
    window.addEventListener('profile-avatar-updated', syncAvatar);
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    window.addEventListener('user-status-updated', syncStatus);
    return () => {
      window.removeEventListener('storage', syncAvatar);
      window.removeEventListener('profile-avatar-updated', syncAvatar);
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
      window.removeEventListener('user-status-updated', syncStatus);
    };
  }, []);

  const navigateTo = (path) => {
    navigate(path);
    setMobileOpen(false);
    setExploreOpen(false);
    setFeedsOpen(false);
    setArenaOpen(false);
    setProfileOpen(false);
    setMoreDropdownOpen(false);
    setNotifOpen(false);
  };

  const handleSearch = (term) => {
    const query = (term || searchTerm).trim();
    if (!query) return;
    const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    const next = [query, ...recent.filter(s => s !== query)].slice(0, 8);
    localStorage.setItem("recentSearches", JSON.stringify(next));
    navigateTo(`/search?q=${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    if (profileOpen && isEditingStatus && statusInputRef.current) {
      statusInputRef.current.focus();
      statusInputRef.current.select();
    }
  }, [profileOpen, isEditingStatus]);

  useEffect(() => () => clearTimeout(statusSaveTimeoutRef.current), []);

  const saveStatusMessage = (nextStatus) => {
    const value = nextStatus.trim() || 'Watching One Piece...';
    localStorage.setItem('userStatusMessage', value);
    window.dispatchEvent(new Event('user-status-updated'));
    setStatusMessage(value);
    setIsEditingStatus(false);
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-shell">
        <button className="mobile-toggle" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
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
                className={`nav-link ${exploreOpen ? 'active' : ''}`}
                onClick={() => setExploreOpen((value) => !value)}
                aria-expanded={exploreOpen}
                aria-haspopup="true"
              >
                <Globe size={16} />
                <span>Explore</span>
                <ChevronDown size={14} className="nav-chevron" />
              </button>
              {exploreOpen && (
                <motion.div 
                  className="explore-dropdown"
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.9, 0.2, 1] }}
                >
                  <motion.button className="explore-item" onClick={() => navigateTo('/browse/anime')}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                    <span className="explore-item-icon">🎬</span>
                    <div>
                      <span className="explore-item-label">Browse Anime</span>
                      <span className="explore-item-description">All anime, filters & tags</span>
                    </div>
                  </motion.button>
                  <motion.button className="explore-item" onClick={() => navigateTo('/browse/manga')}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <span className="explore-item-icon">📚</span>
                    <div>
                      <span className="explore-item-label">Browse Manga</span>
                      <span className="explore-item-description">Manga vault & chapters</span>
                    </div>
                  </motion.button>
                </motion.div>
              )}
            </div>

            <div className="feeds-dropdown-container" ref={feedsRef}>
              <button
                className={`nav-link ${feedsOpen ? 'active' : ''}`}
                onClick={() => setFeedsOpen((value) => !value)}
                aria-expanded={feedsOpen}
                aria-haspopup="true"
              >
                <MessageSquare size={16} />
                <span>Feeds</span>
                <ChevronDown size={14} className="nav-chevron" />
              </button>
              {feedsOpen && (
                <motion.div className="feeds-dropdown"
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.9, 0.2, 1] }}
                >
                  {feedItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <motion.button key={item.path} className="feeds-item" onClick={() => navigateTo(item.path)}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                        <span className="feeds-item-icon"><Icon size={16} /></span>
                        <div>
                          <span className="feeds-item-label">{item.label}</span>
                          {item.description ? <span className="feeds-item-description">{item.description}</span> : null}
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </div>

            <div className="arena-dropdown-container" ref={arenaRef}>
              <button
                className={`nav-link arena-link ${arenaOpen ? 'active' : ''}`}
                onClick={() => setArenaOpen((value) => !value)}
                aria-expanded={arenaOpen}
                aria-haspopup="true"
              >
                <Swords size={16} className="arena-icon-shimmer" />
                <span>The Arena</span>
                <ChevronDown size={14} className="nav-chevron" />
              </button>
              {arenaOpen && (
                <motion.div className="arena-mega-menu"
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.9, 0.2, 1] }}
                >
                  <div className="arena-mega-menu-glow" />
                  <div className="arena-grid">
                    <div className="arena-column">
                      <div className="column-header"><Star size={14} /> Community Tiers</div>
                      <div className="column-items">
                        <button className="arena-item" onClick={() => navigateTo('/arena/tier-lists')}>
                          <span className="arena-item-icon">📊</span>
                          <span className="arena-item-label">View Tier Lists</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="more-dropdown-container" ref={moreDropdownRef}>
              <button className="more-button" onClick={() => setMoreDropdownOpen((value) => !value)}
                aria-expanded={moreDropdownOpen} aria-haspopup="true">
                More <ChevronDown size={14} />
              </button>
              {moreDropdownOpen && (
                <div className="more-dropdown">
                  <button className="more-item" onClick={() => navigateTo('/settings')}>
                    <Settings size={16} /> <span>Settings</span>
                  </button>
                  <button className="more-item" onClick={() => navigateTo('/help')}>
                    <MessageSquare size={16} /> <span>Help & Support</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        <form className="search-form" onSubmit={(event) => { event.preventDefault(); handleSearch(searchTerm); }}>
          <span className="search-icon"><Search size={16} /></span>
          <input
            ref={searchRef}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search anime...  (Ctrl+K)"
            aria-label="Search anime"
          />
        </form>

        <div className="header-actions">

          <div className="notif-dropdown-container" ref={notifRef}>
            <button className={`icon-button${notifCount > 0 ? " badge" : ""}`} data-badge={notifCount > 0 ? notifCount : undefined} onClick={() => setNotifOpen(v => !v)} title="Notifications">
              <Bell size={16} />
            </button>
            {notifOpen && (
              <div className="notif-dropdown">
                <div className="notif-dropdown-header">
                  <span>Notifications</span>
                  {notifCount > 0 && <button className="notif-mark-all-btn" onClick={() => { markAllRead(); setNotifList(getNotifications()); }}>Mark all read</button>}
                </div>
                <div className="notif-dropdown-list">
                  {notifList.length === 0 ? (
                    <div className="notif-dropdown-empty">No notifications yet</div>
                  ) : (
                    notifList.slice(0, 10).map(n => (
                      <div key={n.id} className={`notif-item${!n.read ? " unread" : ""}`} onClick={() => { if (!n.read) { markRead(n.id); setNotifList(getNotifications()); } }}>
                        <div className="notif-item-dot" />
                        <div className="notif-item-body">
                          <div className="notif-item-title">{n.title}</div>
                          {n.body && <div className="notif-item-text">{n.body}</div>}
                          <div className="notif-item-time">{formatTimeAgo(n.time)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifList.length > 0 && (
                  <div className="notif-dropdown-footer">
                    <button className="notif-clear-btn" onClick={() => { clearNotifications(); setNotifList([]); }}>Clear all</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="profile-dropdown-container" ref={profileRef}>
            <button className="profile-button" onClick={() => setProfileOpen((value) => !value)}
              aria-expanded={profileOpen} aria-haspopup="true">
              <span className="profile-avatar-shell">
                {profileImage ? (
                  <img src={profileImage} alt={username} className="profile-avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }} />
                ) : (
                  <span className="profile-avatar">{username.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <span className="profile-copy">
                <span className="profile-username">{username}</span>
                <span className="profile-status-line">{statusMessage}</span>
              </span>
            </button>
            {profileOpen && (
              <div className="profile-mini-card">
                <div className="profile-mini-card-glow" />
                <div className="profile-mini-card-header">
                  <div className="profile-mini-summary">
                    <span className="profile-avatar-shell profile-avatar-shell--compact">
                      {profileImage ? (
                        <img src={profileImage} alt={username} className="profile-avatar--compact" style={{ width: '100%', height: '100%', borderRadius: '50%', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }} />
                      ) : (
                        <span className="profile-avatar--compact">{username.charAt(0).toUpperCase()}</span>
                      )}
                    </span>
                    <div>
                      <div className="profile-mini-name">{username}</div>
                      <div className="profile-mini-meta">
                        <span className={`profile-mini-meta-pill ${isOnline ? 'online' : 'offline'}`}>
                          {isOnline ? '🟢 Online' : '⚫ Offline'}
                        </span>
                        {hasUnclaimedRewards && <span className="profile-mini-meta-pill profile-mini-meta-pill--glow">🎁 Rewards</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="profile-stats-grid">
                  <div className="profile-stat-card">
                    <span className="profile-stat-value">{episodesWatched}</span>
                    <span className="profile-stat-label">Episodes</span>
                  </div>
                </div>
                <div className="profile-status-edit">
                  {isEditingStatus ? (
                    <div className="profile-status-input-group">
                      <input ref={statusInputRef} type="text" value={statusMessage}
                        onChange={(e) => setStatusMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { saveStatusMessage(statusMessage); clearTimeout(statusSaveTimeoutRef.current); statusSaveTimeoutRef.current = setTimeout(() => setIsEditingStatus(false), 1500); }
                          if (e.key === 'Escape') { setIsEditingStatus(false); setStatusMessage(localStorage.getItem('userStatusMessage') || 'Watching One Piece...'); }
                        }}
                        className="profile-status-input" placeholder="Update your status..." />
                      <button className="profile-status-button" onClick={() => { saveStatusMessage(statusMessage); clearTimeout(statusSaveTimeoutRef.current); statusSaveTimeoutRef.current = setTimeout(() => setIsEditingStatus(false), 1500); }}>Save</button>
                    </div>
                  ) : (
                    <button className="profile-status-button" onClick={() => setIsEditingStatus(true)}><PenLine size={12} /> Edit Status</button>
                  )}
                </div>
                <div className="profile-actions-grid">
                  <button className="profile-action-card" onClick={() => navigateTo('/profile')}><Settings size={16} /> <span>Profile</span></button>
                  <button className="profile-action-card" onClick={() => navigateTo('/watchlist')}><Bookmark size={16} /> <span>Watchlist</span></button>
                  <button className="profile-action-card profile-action-card--danger" onClick={async () => { await authService.logout(); navigateTo('/'); }}>
                    <LogOut size={16} /> <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewOpen && profileImage && (
        <div className="profile-preview-overlay" onClick={() => setPreviewOpen(false)}>
          <button className="profile-preview-close" onClick={() => setPreviewOpen(false)}>✕</button>
          <img src={profileImage} alt={username} className="profile-preview-img" />
        </div>
      )}
    </header>
  );
}
