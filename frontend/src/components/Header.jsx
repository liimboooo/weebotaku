import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  Bookmark,
  ChevronDown,
  LogOut,
  Flame,
  PenLine,
  Globe,
  Menu,
  MessageSquare,
  Newspaper,
  Search,
  Settings,
  Star,
  Swords,
  Trophy,
  Users,
  Video,
  X,
} from 'lucide-react';
import { getAllAnime } from '../data/animeData';
import { fetchTopAnime } from '../services/jikanApi';
import { getNotifications, getUnreadCount, markRead, markAllRead, clearNotifications } from '../services/notificationService';
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
  const [searchTrendingFocused, setSearchTrendingFocused] = useState(false);
  const [trendingData, setTrendingData] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [randomPick, setRandomPick] = useState(null);
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('userAvatar') || '');
  const [statusMessage, setStatusMessage] = useState(() => localStorage.getItem('userStatusMessage') || 'Watching One Piece...');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState(getNotifications());
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
  const navRef = useRef(null);
  const randomTimeoutRef = useRef(null);
  const statusInputRef = useRef(null);
  const statusSaveTimeoutRef = useRef(null);
  const headerPanelRef = useRef(null);

  const username = localStorage.getItem('username') || 'zabi';
  const episodesWatched = Number(localStorage.getItem('userEpisodesWatched') || 128);
  const currentStreak = Number(localStorage.getItem('userCurrentStreak') || 12);
  const bountyValue = Number(localStorage.getItem('userBountyValue') || 1500000000);
  const hasUnclaimedRewards = localStorage.getItem('userUnclaimedRewards') === 'true';

  const feedItems = useMemo(
    () => [
      { label: 'AMVs & Edits', path: '/feeds/amvs', icon: Star, description: 'High-energy AMVs and creative edits from the community' },
      { label: 'Live Rooms', path: '/watch-together', icon: Video, description: 'Jump into live rooms and sync the next episode together' },
      { label: 'Anime News', path: '/news', icon: Newspaper, description: 'Trending, new episodes & announcements' },
    ],
    []
  );

  const questTemplates = useMemo(
    () => [
      { title: 'Watch 20 mins', icon: '📺', target: '20 mins', type: 'watch' },
      { title: 'Rate an Anime', icon: '⭐', target: '1 Rating', type: 'rate' },
      { title: 'Comment on Thread', icon: '💬', target: '1 Comment', type: 'comment' },
      { title: 'Follow a User', icon: '👥', target: '1 Follow', type: 'follow' },
      { title: 'Complete Profile', icon: '📝', target: '100%', type: 'profile' },
    ],
    []
  );

  const battleArenaData = useMemo(
    () => ({
      character: {
        left: { name: 'Luffy', anime: 'One Piece', icon: '🏴‍☠️' },
        right: { name: 'Naruto', anime: 'Naruto', icon: '🍃' },
        leftVotes: 5230,
        rightVotes: 4892,
      },
      animeOfWeek: {
        title: 'Jujutsu Kaisen vs Attack on Titan',
        endsIn: '2 days',
      },
      isLive: true,
    }),
    []
  );

  const hallOfFameLinks = useMemo(
    () => [
      { label: 'Arena Hub', path: '/arena', icon: '⚔️' },
      { label: 'Arena Overview', path: '/arena/overview', icon: '📡' },
      { label: 'Top 100 Anime', path: '/rankings/anime', icon: '🏆' },
      { label: 'Top 100 Manga', path: '/rankings/manga', icon: '📚' },
    ],
    []
  );

  useEffect(() => {
    setTrendingLoading(true);
    fetchTopAnime(1, "airing").then(r => {
      setTrendingData(r.data.slice(0, 5));
    }).catch(() => {
      setTrendingData([]);
    }).finally(() => {
      setTrendingLoading(false);
    });
  }, []);

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

  function getTrend(item) {
    const score = item.rating || 0;
    if (score > 8.0) {
      const num = 50 + (item.id % 200);
      return { arrow: '↑', value: `+${num}`, cls: 'up' };
    } else if (score >= 7.5) {
      return { arrow: '→', value: `${10 + (item.id % 40)}`, cls: 'neutral' };
    } else {
      const num = 10 + (item.id % 50);
      return { arrow: '↓', value: `-${num}`, cls: 'down' };
    }
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
    return () => {
      document.removeEventListener('click', closeOnClickOutside);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const rankTrack = useMemo(
    () => [
      { name: 'Rookie', min: 0, max: 100000000 },
      { name: 'Veteran', min: 100000000, max: 500000000 },
      { name: 'Legend', min: 500000000, max: 1500000000 },
      { name: 'Infinite', min: 1500000000, max: Infinity },
    ],
    []
  );

  const rankState = useMemo(() => {
    const current = [...rankTrack].reverse().find((entry) => bountyValue >= entry.min) || rankTrack[0];
    const currentIndex = rankTrack.findIndex((entry) => entry.name === current.name);
    const next = rankTrack[currentIndex + 1] || null;
    const span = next ? next.max - current.min : 0;
    const progress = next ? Math.max(0, Math.min(100, ((bountyValue - current.min) / span) * 100)) : 100;
    const remaining = next ? Math.max(0, next.max - bountyValue) : 0;
    return { current, next, progress, remaining, isMaxed: !next };
  }, [rankTrack, bountyValue]);

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
                      <div className="column-header"><Trophy size={14} /> Rankings</div>
                      <div className="column-items">
                        {hallOfFameLinks.map((link, idx) => (
                          <motion.button key={link.path} className="arena-item" onClick={() => navigateTo(link.path)}
                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }}>
                            <span className="arena-item-icon">{link.icon}</span>
                            <span className="arena-item-label">{link.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    <div className="arena-column">
                      <div className="column-header"><Swords size={14} /> Live Battles</div>
                      <div className="column-items">
                        <motion.button className="arena-item battle-item-live" onClick={() => navigateTo('/arena/character-battle')}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
                          <span className="vs-badge">VS</span>
                          <div className="battle-content">
                            <div className="battle-title">{battleArenaData.character.left.name} vs {battleArenaData.character.right.name}</div>
                            <div className="battle-subtitle">
                              <span className="live-indicator"><span className="live-pulse" /> LIVE NOW</span>
                            </div>
                          </div>
                        </motion.button>
                      </div>
                    </div>
                    <div className="arena-column">
                      <div className="column-header"><Star size={14} /> Tier Lists</div>
                      <div className="column-items">
                        <button className="arena-item" onClick={() => navigateTo('/arena/tier-lists')}>
                          <span className="arena-item-icon">📊</span>
                          <span className="arena-item-label">Community Tiers</span>
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

        <form className="search-form" onSubmit={(event) => { event.preventDefault(); handleSearch(); }}>
          <span className="search-icon"><Search size={16} /></span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setSearchTrendingFocused(true)}
            onBlur={() => setTimeout(() => setSearchTrendingFocused(false), 150)}
            placeholder="Search anime..."
            aria-label="Search anime"
          />
          {searchTrendingFocused && (
            <div className="search-trending">
              <div className="search-trending-header">Trending Now</div>
              <div className="search-trending-pills">
                {trendingLoading ? (
                  [1,2,3,4,5].map(i => <div key={i} className="search-trending-skeleton" />)
                ) : trendingData.length === 0 ? (
                  <div className="search-trending-empty">No trending data</div>
                ) : (
                  trendingData.map((anime) => {
                    const t = getTrend(anime);
                    const label = anime.name && anime.name.length > 28 ? anime.name.slice(0, 26) + '...' : (anime.name || 'Unknown');
                    return (
                      <button key={anime.id} className="search-trending-pill"
                        onClick={() => { setSearchTerm(anime.name); handleSearch(); }}>
                        <span>{label}</span>
                        <span className={`trending-indicator ${t.cls}`}>{t.arrow} {t.value}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </form>

        <div className="header-actions">
          <button className="icon-button" onClick={pickRandomAnime} title="Random anime">
            🎲
          </button>

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
              <span className="profile-avatar-shell" style={{ '--xp-progress': `${rankState.progress}%` }}>
                {profileImage ? (
                  <img src={profileImage} alt={username} className="profile-avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
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
                    <span className="profile-avatar-shell profile-avatar-shell--compact" style={{ '--xp-progress': `${rankState.progress}%` }}>
                      {profileImage ? (
                        <img src={profileImage} alt={username} className="profile-avatar--compact" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
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
                  <div className="profile-stat-card">
                    <span className="profile-stat-value"><Flame size={14} /> {currentStreak}</span>
                    <span className="profile-stat-label">Streak</span>
                  </div>
                </div>
                <div className="profile-bounty-section">
                  <div className="profile-bounty-title">Bounty Rank: <strong>{rankState.current.name}</strong></div>
                  <div className="profile-bounty-value">
                    <span className="bounty-icon">🎯</span>
                    <span className="bounty-amount">฿{(bountyValue / 1000000000).toFixed(1)}B</span>
                  </div>
                  <div className="profile-bounty-bar">
                    <div className="profile-bounty-bar-fill" style={{ width: `${rankState.progress}%` }} />
                  </div>
                  <div className="profile-bounty-meta">
                    {rankState.next ? <span>฿{(rankState.remaining / 1000000000).toFixed(1)}B to {rankState.next.name}</span> : <span>🏆 Infinite Bounty!</span>}
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
                  <button className="profile-action-card profile-action-card--danger" onClick={() => { localStorage.removeItem('username'); localStorage.removeItem('isLoggedIn'); localStorage.removeItem('userAvatar'); localStorage.removeItem('userStatusMessage'); localStorage.removeItem('userEpisodesWatched'); localStorage.removeItem('userCurrentStreak'); localStorage.removeItem('userBountyValue'); localStorage.removeItem('userUnclaimedRewards'); navigateTo('/home'); }}>
                    <LogOut size={16} /> <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {randomPick && (
          <div className="feeds-dropdown" style={{ right: 18, left: 'auto', top: 'calc(100% + 10px)', minWidth: '280px' }}>
            <button className="feeds-item" onClick={() => navigateTo(`/anime/${randomPick.id}`)}>
              <span className="feeds-item-icon">🎲</span>
              <div>
                <span className="feeds-item-label">Random pick: {randomPick.name}</span>
                <span className="feeds-item-description">Open the anime details page</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
