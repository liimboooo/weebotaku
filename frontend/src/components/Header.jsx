import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, LogIn, Menu, Search, Star, TrendingUp } from 'lucide-react';
import { fetchSearchAnime } from '../services/anilistApi';
import SpotlightSearch from './SpotlightSearch';
import authService from '../services/authService';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from '../services/notificationService';
import './Header.css';

function formatTime(ts) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function Header({ isHome = false }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchPopout, setShowSearchPopout] = useState(false);
  const [showNotifPopout, setShowNotifPopout] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(authService.isLoggedIn());
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  const inputRef = useRef(null);
  const searchPopoutRef = useRef(null);
  const notifPopoutRef = useRef(null);
  const notifBtnRef = useRef(null);
  const debounceRef = useRef(null);

  const refreshNotifs = useCallback(() => {
    setNotifs(getNotifications());
    setUnread(getUnreadCount());
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const SHOW_THRESHOLD = 8;
    const HIDE_THRESHOLD = 80;

    const update = () => {
      const y = window.scrollY;
      setScrolled(y > SHOW_THRESHOLD);

      // Always show near the top
      if (y <= HIDE_THRESHOLD) {
        setHidden(false);
      } else if (y > lastY + 4) {
        // Scrolling down past threshold → hide
        setHidden(true);
      } else if (y < lastY - 4) {
        // Scrolling up → show
        setHidden(false);
      }

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowSearchPopout(false);
        setShowNotifPopout(false);
        setShowSpotlight(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (
        searchPopoutRef.current &&
        !searchPopoutRef.current.contains(e.target) &&
        e.target !== inputRef.current
      ) {
        setShowSearchPopout(false);
      }
      if (
        notifPopoutRef.current &&
        !notifPopoutRef.current.contains(e.target) &&
        notifBtnRef.current &&
        !notifBtnRef.current.contains(e.target)
      ) {
        setShowNotifPopout(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    refreshNotifs();
    const onUpdate = () => refreshNotifs();
    const onLogout = () => setIsLoggedIn(false);
    const onLogin = () => setIsLoggedIn(authService.isLoggedIn());
    window.addEventListener('notification-added', onUpdate);
    window.addEventListener('auth-logout', onLogout);
    window.addEventListener('auth-login', onLogin);
    return () => {
      window.removeEventListener('notification-added', onUpdate);
      window.removeEventListener('auth-logout', onLogout);
      window.removeEventListener('auth-login', onLogin);
    };
  }, [refreshNotifs]);

  const toggleSidebar = () => window.dispatchEvent(new CustomEvent('sidebar-toggle'));

  const doSearch = (q) => {
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setSearchQuery('');
      setShowSearchPopout(false);
      inputRef.current?.blur();
    }
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') doSearch(searchQuery);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); setShowSearchPopout(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetchSearchAnime(val, 1);
        setSearchResults(res.data.slice(0, 8));
        setShowSearchPopout(true);
      } catch { setSearchResults([]); }
    }, 300);
  };

  const handleSearchFocus = () => {
    if (searchResults.length > 0) setShowSearchPopout(true);
  };

  const handleSpotlightOpen = () => {
    setShowSearchPopout(false);
    setShowNotifPopout(false);
    setShowSpotlight(true);
  };

  const toggleNotifPopout = () => {
    setShowNotifPopout(v => !v);
    setShowSearchPopout(false);
    setShowSpotlight(false);
  };

  const handleNotifClick = async (n) => {
    if (!n.read) await markRead(n.id);
    setShowNotifPopout(false);
    if (n.link) navigate(n.link);
    refreshNotifs();
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    refreshNotifs();
  };

  return (
    <>
      <nav className={`top-nav${scrolled ? ' is-scrolled' : ''}${isHome ? ' is-home' : ' is-subpage'}${hidden ? ' is-hidden' : ''}`}>
        <div className="top-nav-bg" />

        <div className="top-nav-left">
          <button className="top-nav-hamburger" onClick={toggleSidebar} aria-label="Toggle navigation">
            <Menu size={17} strokeWidth={1.75} />
          </button>
          <span className="top-nav-divider" />
          <button className="top-nav-brand" onClick={() => navigate('/home')} aria-label="Home">
            <span className="brand-dot" />
            <span className="brand-text">AnimeWch</span>
          </button>
        </div>

        <div className="top-nav-right">
          <div className="top-nav-search" onClick={handleSpotlightOpen} style={{ cursor: 'pointer' }}>
            <Search size={13} className="top-nav-search-icon" strokeWidth={1.75} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKey}
              onFocus={handleSearchFocus}
            />
            <span className="search-kbd">⌘K</span>
          </div>

          {showSearchPopout && searchResults.length > 0 && (
            <div className="search-popout" ref={searchPopoutRef}>
              <div className="search-popout-header">
                <TrendingUp size={12} strokeWidth={2} />
                <span>Results</span>
                <button
                  className="search-popout-esc"
                  onClick={() => { setShowSearchPopout(false); inputRef.current?.blur(); }}
                  aria-label="Close"
                >
                  Esc
                </button>
              </div>
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  className="search-popout-item"
                  onClick={() => { navigate(`/anime/${item.id}?ep=1`); setShowSearchPopout(false); setSearchQuery(''); inputRef.current?.blur(); }}
                >
                  <div className="spi-img">
                    <img src={item.img} alt={item.name} />
                  </div>
                  <div className="spi-info">
                    <span className="spi-title">{item.name}</span>
                    <span className="spi-meta">
                      {item.rating && (
                        <span className="spi-rating"><Star size={10} strokeWidth={0} fill="#ffffff" /> {item.rating.toFixed(1)}</span>
                      )}
                      {item.episodes && <span>{item.episodes} EP</span>}
                      {item.year && <span>{item.year}</span>}
                    </span>
                  </div>
                </button>
              ))}
              <button className="search-popout-footer" onClick={() => doSearch(searchQuery)}>
                <Search size={12} strokeWidth={2} />
                <span>View all results for "{searchQuery}"</span>
                <span className="search-popout-footer-arrow">→</span>
              </button>
            </div>
          )}

          {/* Login CTA OR Notification bell */}
          {!isLoggedIn ? (
            <button className="top-nav-signin" onClick={() => navigate('/auth')}>
              <LogIn size={13} strokeWidth={2} />
              <span>Sign in</span>
            </button>
          ) : (
            <div className="top-nav-notif-wrap">
              <button
                ref={notifBtnRef}
                className={`top-nav-notif${showNotifPopout ? ' is-open' : ''}`}
                onClick={toggleNotifPopout}
                aria-label="Notifications"
              >
                <Bell size={15} strokeWidth={1.75} />
                {unread > 0 && (
                  <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
                )}
              </button>

              {showNotifPopout && (
                <div className="notif-popout" ref={notifPopoutRef}>
                  <div className="notif-popout-header">
                    <span className="notif-popout-title">
                      Notifications
                      {unread > 0 && <span className="notif-popout-count">{unread}</span>}
                    </span>
                    {notifs.length > 0 && unread > 0 && (
                      <button className="notif-mark-all" onClick={handleMarkAllRead}>
                        Mark all read
                      </button>
                    )}
                    <button
                      className="search-popout-esc"
                      onClick={() => setShowNotifPopout(false)}
                      aria-label="Close"
                    >
                      Esc
                    </button>
                  </div>

                  <div className="notif-popout-list">
                    {notifs.length === 0 ? (
                      <div className="notif-empty">
                        <BellOff size={18} strokeWidth={1.5} />
                        <span>You're all caught up</span>
                        <small>New notifications will show up here.</small>
                      </div>
                    ) : (
                      notifs.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          className={`notif-item${n.read ? '' : ' is-unread'}`}
                          onClick={() => handleNotifClick(n)}
                        >
                          <span className="notif-dot" />
                          <div className="notif-info">
                            <span className="notif-title">{n.title}</span>
                            {n.body && <span className="notif-body">{n.body}</span>}
                            <span className="notif-time">{formatTime(n.time)}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    className="search-popout-footer"
                    onClick={() => { setShowNotifPopout(false); navigate('/settings'); }}
                  >
                    <Bell size={12} strokeWidth={2} />
                    <span>Notification settings</span>
                    <span className="search-popout-footer-arrow">→</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <SpotlightSearch open={showSpotlight} onClose={() => setShowSpotlight(false)} />
    </>
  );
}
