import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Bookmark,
  Film,
  Gift,
  Home,
  LogOut,
  Settings,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import authService from '../services/authService';
import { loadWatchHistory } from '../services/storage';
import { formatTimeAgo } from '../utils/helpers';
import { getNotifications, getUnreadCount, markRead, markAllRead, clearNotifications, fetchServerNotifications, seedBroadcastNotifications, handleSocketNotification, startPolling, stopPolling } from '../services/notificationService';
import { connectSocket, disconnectSocket } from '../services/socket';
import { fetchAggregatedNews } from '../services/newsAggregator';
import FastSearch from './FastSearch';
import './Sidebar.css';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Film, label: 'Browse', path: '/browse/anime' },
  { icon: Bookmark, label: 'Watchlist', path: '/watchlist' },
  { icon: Clock, label: 'History', path: '/history' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);

  const [collapsed, setCollapsed] = useState(() => {
    return window.innerWidth < 1024;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const path = location.pathname;
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('userAvatar') || '');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
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
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const username = localStorage.getItem('username') || 'Guest';
  const [episodesWatched, setEpisodesWatched] = useState(() => loadWatchHistory().length);
  const hasUnclaimedRewards = localStorage.getItem('userUnclaimedRewards') === 'true';

  const isCollapsed = collapsed && !hovered;

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
      else setCollapsed(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const closeOnClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener('click', closeOnClickOutside);
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', closeOnClickOutside);
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

  const navigateTo = (path) => {
    navigate(path);
    setNotifOpen(false);
    setProfileOpen(false);
    setMobileOpen(false);
  };

  const isActive = (itemPath) => {
    if (itemPath === '/home') return path === '/home';
    return path.startsWith(itemPath);
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="sidebar-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        ref={sidebarRef}
        className={`sidebar${isCollapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setNotifOpen(false); setProfileOpen(false); }}
      >
        <div className="sidebar-bg" />
        <div className="sidebar-bg-accent" />

        {/* Logo */}
        <div className="sidebar-logo">
          <button className="sidebar-brand" onClick={() => navigateTo('/home')} aria-label="AnimeWch home">
            <span className="sidebar-brand-icon">
              <img className="sidebar-brand-logo" src="/logo.png" alt="AnimeWch" />
            </span>
            <span className="sidebar-brand-text">AnimeWch</span>
          </button>
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(v => !v)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                className={`sidebar-nav-item${active ? ' active' : ''}`}
                onClick={() => navigateTo(item.path)}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="sidebar-nav-icon">
                  <Icon size={18} />
                </span>
                <span className="sidebar-nav-label">{item.label}</span>
                {active && <span className="sidebar-nav-indicator" />}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="sidebar-spacer" />

        {/* Search trigger */}
        <div className={`sidebar-search${isCollapsed ? ' collapsed' : ''}`}>
          <FastSearch />
        </div>

        {/* User section */}
        <div className="sidebar-footer">
          {authService.isLoggedIn() ? (
            <>
              {/* Notifications */}
              <div className="sidebar-notif-wrap" ref={notifRef}>
                <button
                  className="sidebar-icon-btn"
                  onClick={() => setNotifOpen(v => !v)}
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="sidebar-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <div className="sidebar-notif-dropdown">
                    <div className="sidebar-notif-header">
                      <span>Notifications</span>
                      <button className="sidebar-notif-mark-btn" onClick={async () => {
                        let s;
                        try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
                        await markAllRead();
                        setNotifications(getNotifications(s));
                        setUnreadCount(getUnreadCount(s));
                      }}>
                        Mark all read
                      </button>
                    </div>
                    <div className="sidebar-notif-list">
                      {notifications.length === 0 && (
                        <div className="sidebar-notif-empty">No notifications yet</div>
                      )}
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`sidebar-notif-item${n.read ? '' : ' unread'}`}
                          onClick={async () => {
                            let s;
                            try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
                            await markRead(n.id);
                            setNotifications(getNotifications(s));
                            setUnreadCount(getUnreadCount(s));
                            if (n.link) navigateTo(n.link);
                          }}
                        >
                          <span className="sidebar-notif-dot" />
                          <div className="sidebar-notif-body">
                            <div className="sidebar-notif-title">{n.title}</div>
                            {n.body && <div className="sidebar-notif-text">{n.body}</div>}
                            <div className="sidebar-notif-time">{formatTimeAgo(n.time)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {notifications.length > 0 && (
                      <div className="sidebar-notif-footer">
                        <button className="sidebar-notif-clear-btn" onClick={async () => {
                          await clearNotifications();
                          setNotifications([]);
                          setUnreadCount(0);
                        }}>
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="sidebar-profile-wrap" ref={profileRef}>
                <button
                  className="sidebar-profile-btn"
                  onClick={() => setProfileOpen(v => !v)}
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  title={isCollapsed ? username : undefined}
                >
                  <span className="sidebar-avatar-shell">
                    {profileImage ? (
                      <img src={profileImage} alt={username} className="sidebar-avatar" />
                    ) : (
                      <span className="sidebar-avatar sidebar-avatar--text">{username.charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  {!isCollapsed && <span className="sidebar-username">{username}</span>}
                </button>
                {profileOpen && (
                  <div className="sidebar-profile-dropdown">
                    <div className="sidebar-profile-card">
                      <div className="sidebar-profile-card-banner" />
                      <div className="sidebar-profile-card-body">
                        <div className="sidebar-profile-summary">
                          <span className="sidebar-profile-avatar-big">
                            {profileImage ? (
                              <img src={profileImage} alt={username} />
                            ) : (
                              <span>{username.charAt(0).toUpperCase()}</span>
                            )}
                          </span>
                          <div>
                            <div className="sidebar-profile-name">{username}</div>
                            <div className="sidebar-profile-meta">
                              <span className={`sidebar-profile-pill ${isOnline ? 'online' : 'offline'}`}>
                                <span className={`sidebar-status-dot ${isOnline ? 'online' : 'offline'}`} />
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                              {hasUnclaimedRewards && (
                                <span className="sidebar-profile-pill sidebar-profile-pill--glow">
                                  <Gift size={10} /> Rewards
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="sidebar-profile-stats">
                          <div className="sidebar-profile-stat">
                            <span className="sidebar-profile-stat-value">{episodesWatched}</span>
                            <span className="sidebar-profile-stat-label">Episodes</span>
                          </div>
                        </div>
                        <div className="sidebar-profile-actions">
                          <button className="sidebar-profile-action" onClick={() => navigateTo('/profile')}>
                            Profile
                          </button>
                          <button className="sidebar-profile-action sidebar-profile-action--danger" onClick={async () => {
                            await authService.logout();
                            navigateTo('/home');
                          }}>
                            <LogOut size={14} /> Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button className="sidebar-login-btn" onClick={() => navigateTo('/auth')}>
              Log In
            </button>
          )}
        </div>
      </aside>

      {/* Mobile toggle */}
      <button className="sidebar-mobile-toggle" onClick={() => setMobileOpen(v => !v)} aria-label="Toggle navigation">
        {mobileOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        )}
      </button>
    </>
  );
}
