import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  Bookmark,
  ChevronDown,
  Film,
  Gift,
  BookOpen,
  LogOut,
  Globe,
  Menu,
  Settings,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import authService from '../services/authService';
import { loadWatchHistory } from '../services/storage';
import { formatTimeAgo } from '../utils/helpers';
import { getNotifications, getUnreadCount, markRead, markAllRead, clearNotifications, fetchServerNotifications, seedBroadcastNotifications, handleSocketNotification, startPolling, stopPolling } from '../services/notificationService';
import { connectSocket, disconnectSocket } from '../services/socket';
import { fetchAggregatedNews } from '../services/newsAggregator';
import FastSearch from './FastSearch';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const path = location.pathname;

  const isExploreActive = path.startsWith('/browse/');
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('userAvatar') || '');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    let s;
    try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
    return getNotifications(s);
  });
  const [unreadCount, setUnreadCount] = useState(() => {
    let s;
    try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
    return getUnreadCount(s);
  });

  const notifRef = useRef(null);
  const exploreRef = useRef(null);
  const profileRef = useRef(null);

  const username = localStorage.getItem('username') || 'Guest';
  const [episodesWatched, setEpisodesWatched] = useState(() => loadWatchHistory().length);
  const hasUnclaimedRewards = localStorage.getItem('userUnclaimedRewards') === 'true';

  useEffect(() => {
    const closeOnClickOutside = (event) => {
      if (exploreRef.current && !exploreRef.current.contains(event.target)) setExploreOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    };
    document.addEventListener('click', closeOnClickOutside);
    const onScroll = () => setScrollProgress(Math.min(1, window.scrollY / 120));
    window.addEventListener('scroll', onScroll, { passive: true });
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false); setExploreOpen(false); setProfileOpen(false); setNotifOpen(false);
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', closeOnClickOutside);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  useEffect(() => {
    const syncAvatar = () => setProfileImage(localStorage.getItem('userAvatar') || '');
    const syncOnline = () => setIsOnline(navigator.onLine);
    const refreshNotifs = () => {
      let s;
      try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
      const all = getNotifications(s);
      setNotifications(all);
      setUnreadCount(all.filter(n => !n.read).length);
    };
    const refreshEps = () => setEpisodesWatched(loadWatchHistory().length);
    window.addEventListener('storage', syncAvatar);
    window.addEventListener('profile-avatar-updated', syncAvatar);
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    window.addEventListener('notification-added', refreshNotifs);
    window.addEventListener('settings-changed', refreshNotifs);
    window.addEventListener('profile-data-changed', refreshEps);
    return () => {
      window.removeEventListener('storage', syncAvatar);
      window.removeEventListener('profile-avatar-updated', syncAvatar);
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
      window.removeEventListener('notification-added', refreshNotifs);
      window.removeEventListener('settings-changed', refreshNotifs);
      window.removeEventListener('profile-data-changed', refreshEps);
    };
  }, []);

  useEffect(() => {
    seedBroadcastNotifications();
    fetchAggregatedNews().catch(() => {});
    fetchServerNotifications().then(() => {
      let s;
      try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
      setNotifications(getNotifications(s));
      setUnreadCount(getUnreadCount(s));
    });
    startPolling(30000);
    connectSocket();

    const onServerNotif = (e) => {
      handleSocketNotification(e.detail);
      let s;
      try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
      setNotifications(getNotifications(s));
      setUnreadCount(getUnreadCount(s));
    };
    window.addEventListener('server-notification', onServerNotif);
    return () => {
      stopPolling();
      disconnectSocket();
      window.removeEventListener('server-notification', onServerNotif);
    };
  }, []);

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) AnimeWch` : 'AnimeWch';
  }, [unreadCount]);

  const navigateTo = (path) => {
    navigate(path);
    setMobileOpen(false);
    setExploreOpen(false);
    setProfileOpen(false);
    setNotifOpen(false);
  };

  return (
    <header ref={headerRef} className={`header${scrollProgress > 0.15 ? ' scrolled' : ''}`}>
      <div className="header-bg" />
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
                className={`nav-link ${exploreOpen || isExploreActive ? 'active' : ''}`}
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
                    <span className="explore-item-icon"><Film size={16} /></span>
                    <div>
                      <span className="explore-item-label">Browse Anime</span>
                      <span className="explore-item-description">All anime, filters & tags</span>
                    </div>
                  </motion.button>
                  <motion.button className="explore-item" onClick={() => navigateTo('/browse/manga')}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <span className="explore-item-icon"><BookOpen size={16} /></span>
                    <div>
                      <span className="explore-item-label">Browse Manga</span>
                      <span className="explore-item-description">Manga vault & chapters</span>
                    </div>
                  </motion.button>
                </motion.div>
              )}
            </div>

            <button className={`nav-link ${path === '/friends' ? 'active' : ''}`} onClick={() => navigateTo('/friends')}>
              <Users size={16} />
              <span>Friends</span>
            </button>

            <button className={`nav-link ${path === '/leaderboard' ? 'active' : ''}`} onClick={() => navigateTo('/leaderboard')}>
              <Trophy size={16} />
              <span>Leaderboard</span>
            </button>

            <button className={`nav-link ${path === '/settings' ? 'active' : ''}`} onClick={() => navigateTo('/settings')}>
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        <FastSearch />

        <div className="header-actions">

          {authService.isLoggedIn() ? (<>
          <div className="notif-dropdown-container" ref={notifRef}>
            <button className="notif-bell" onClick={() => setNotifOpen((v) => !v)} aria-label="Notifications" aria-expanded={notifOpen} aria-haspopup="true">
              <Bell size={18} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            {notifOpen && (
              <div className="notif-dropdown">
                <div className="notif-dropdown-header">
                  <span>Notifications</span>
                  <button className="notif-mark-all-btn" onClick={async () => { let s; try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {} await markAllRead(); setNotifications(getNotifications(s)); setUnreadCount(getUnreadCount(s)); }}>
                    Mark all read
                  </button>
                </div>
                <div className="notif-dropdown-list">
                  {notifications.length === 0 && <div className="notif-dropdown-empty">No notifications yet</div>}
                  {notifications.map((n) => (
                    <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`} onClick={async () => {
                      let s;
                      try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
                      await markRead(n.id);
                      setNotifications(getNotifications(s));
                      setUnreadCount(getUnreadCount(s));
                      if (n.link) navigateTo(n.link);
                    }}>
                      <span className="notif-item-dot" />
                      <div className="notif-item-body">
                        <div className="notif-item-title">{n.title}</div>
                        {n.body && <div className="notif-item-text">{n.body}</div>}
                        <div className="notif-item-time">{formatTimeAgo(n.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {notifications.length > 0 && (
                  <div className="notif-dropdown-footer">
                    <button className="notif-clear-btn" onClick={async () => { await clearNotifications(); setNotifications([]); setUnreadCount(0); }}>
                      Clear all
                    </button>
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
                  <img src={profileImage} alt={username} className="profile-avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  <span className="profile-avatar">{username.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <span className="profile-copy">
                <span className="profile-username">{username}</span>
              </span>
            </button>
            {profileOpen && (
              <div className="profile-mini-card">
                <div className="profile-mini-card-glow" />
                <div className="profile-mini-card-banner" />
                <div className="profile-mini-card-header">
                  <div className="profile-mini-summary">
                    <span className="profile-avatar-shell profile-avatar-shell--compact">
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
                          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} /> {isOnline ? 'Online' : 'Offline'}
                        </span>
                        {hasUnclaimedRewards && <span className="profile-mini-meta-pill profile-mini-meta-pill--glow"><Gift size={12} /> Rewards</span>}
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
                <div className="profile-actions-grid">
                  <button className="profile-action-card" onClick={() => navigateTo('/profile')}><Settings size={16} /> <span>Profile</span></button>
                  <button className="profile-action-card" onClick={() => navigateTo('/watchlist')}><Bookmark size={16} /> <span>Watchlist</span></button>
                  <button className="profile-action-card" onClick={() => navigateTo('/settings')}><Settings size={16} /> <span>Settings</span></button>
                  <button className="profile-action-card profile-action-card--danger" onClick={async () => { await authService.logout(); navigateTo('/home'); }}>
                    <LogOut size={16} /> <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          </>) : (
            <button className="header-login-btn" onClick={() => navigateTo('/auth')}>
              Log In
            </button>
          )}
        </div>
      </div>

    </header>
  );
}
