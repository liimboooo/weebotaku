import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Gift, LogOut } from 'lucide-react';
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
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    let s; try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
    return getNotifications(s);
  });
  const [unreadCount, setUnreadCount] = useState(() => {
    let s; try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
    return getUnreadCount(s);
  });
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('userAvatar') || '');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const username = localStorage.getItem('username') || 'Guest';
  const [episodesWatched, setEpisodesWatched] = useState(() => loadWatchHistory().length);
  const hasUnclaimedRewards = localStorage.getItem('userUnclaimedRewards') === 'true';

  useEffect(() => {
    const close = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('click', close);
    const esc = (e) => { if (e.key === 'Escape') { setNotifOpen(false); setProfileOpen(false); } };
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', esc); };
  }, []);

  useEffect(() => {
    const syncAvatar = () => setProfileImage(localStorage.getItem('userAvatar') || '');
    const syncOnline = () => setIsOnline(navigator.onLine);
    const refreshNotifs = () => {
      let s; try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
      const all = getNotifications(s); setNotifications(all); setUnreadCount(all.filter(n => !n.read).length);
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
      let s; try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
      setNotifications(getNotifications(s)); setUnreadCount(getUnreadCount(s));
    });
    startPolling(30000);
    connectSocket();
    const onServerNotif = (e) => {
      handleSocketNotification(e.detail);
      let s; try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
      setNotifications(getNotifications(s)); setUnreadCount(getUnreadCount(s));
    };
    window.addEventListener('server-notification', onServerNotif);
    return () => { stopPolling(); disconnectSocket(); window.removeEventListener('server-notification', onServerNotif); };
  }, []);

  const navigateTo = (path) => { navigate(path); setNotifOpen(false); setProfileOpen(false); };

  return (
    <header className="header">
      <div className="header-bg" />

      {/* ─── Left: Brand ─── */}
      <div className="header-left">
        <button className="header-brand" onClick={() => navigateTo('/home')} aria-label="Re:ANIME home">
          <span className="brand-re">Re:</span>
          <span className="brand-anime">ANIME</span>
          <span className="brand-bolt">⚡</span>
          <span className="brand-star">✦</span>
        </button>
        <span className="header-tagline">REWATCH. RELIVE. RE:EXPERIENCE.</span>
      </div>

      {/* ─── Center: Search ─── */}
      <div className="header-center">
        <FastSearch />
      </div>

      {/* ─── Right: Actions ─── */}
      <div className="header-right">
        {authService.isLoggedIn() ? (
          <>
            {/* Notifications */}
            <div className="header-notif-wrap" ref={notifRef}>
              <button className="header-icon-btn" onClick={() => setNotifOpen(v => !v)} aria-label="Notifications" aria-expanded={notifOpen}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="header-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="header-notif-dropdown">
                  <div className="header-notif-header">
                    <span>Notifications</span>
                    <button className="header-notif-mark-btn" onClick={async () => {
                      let s; try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
                      await markAllRead(); setNotifications(getNotifications(s)); setUnreadCount(getUnreadCount(s));
                    }}>Mark all read</button>
                  </div>
                  <div className="header-notif-list">
                    {notifications.length === 0 && <div className="header-notif-empty">No notifications yet</div>}
                    {notifications.map((n) => (
                      <div key={n.id} className={`header-notif-item${n.read ? '' : ' unread'}`} onClick={async () => {
                        let s; try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
                        await markRead(n.id); setNotifications(getNotifications(s)); setUnreadCount(getUnreadCount(s));
                        if (n.link) navigateTo(n.link);
                      }}>
                        <span className="header-notif-dot" />
                        <div className="header-notif-body">
                          <div className="header-notif-title">{n.title}</div>
                          {n.body && <div className="header-notif-text">{n.body}</div>}
                          <div className="header-notif-time">{formatTimeAgo(n.time)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {notifications.length > 0 && (
                    <div className="header-notif-footer">
                      <button className="header-notif-clear-btn" onClick={async () => { await clearNotifications(); setNotifications([]); setUnreadCount(0); }}>Clear all</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="header-profile-wrap" ref={profileRef}>
              <button className="header-avatar-btn" onClick={() => setProfileOpen(v => !v)} aria-expanded={profileOpen} aria-haspopup="true">
                <span className="header-avatar-shell">
                  {profileImage ? (
                    <img src={profileImage} alt={username} className="header-avatar-img" />
                  ) : (
                    <span className="header-avatar-letter">{username.charAt(0).toUpperCase()}</span>
                  )}
                </span>
              </button>
              {profileOpen && (
                <div className="header-profile-dropdown">
                  <div className="header-profile-banner" />
                  <div className="header-profile-body">
                    <div className="header-profile-summary">
                      <span className="header-profile-avatar-big">
                        {profileImage ? <img src={profileImage} alt={username} /> : <span>{username.charAt(0).toUpperCase()}</span>}
                      </span>
                      <div>
                        <div className="header-profile-name">{username}</div>
                        <div className="header-profile-meta">
                          <span className={`header-profile-pill ${isOnline ? 'online' : 'offline'}`}>
                            <span className={`header-status-dot ${isOnline ? 'online' : 'offline'}`} /> {isOnline ? 'Online' : 'Offline'}
                          </span>
                          {hasUnclaimedRewards && <span className="header-profile-pill header-profile-pill--glow"><Gift size={10} /> Rewards</span>}
                        </div>
                      </div>
                    </div>
                    <div className="header-profile-stat-row">
                      <div className="header-profile-stat">
                        <span className="header-profile-stat-value">{episodesWatched}</span>
                        <span className="header-profile-stat-label">Episodes</span>
                      </div>
                    </div>
                    <div className="header-profile-actions">
                      <button className="header-profile-action" onClick={() => navigateTo('/profile')}>Profile</button>
                      <button className="header-profile-action header-profile-action--danger" onClick={async () => { await authService.logout(); navigateTo('/home'); }}>
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <button className="header-login-btn" onClick={() => navigateTo('/auth')}>Log In</button>
        )}
      </div>
    </header>
  );
}
