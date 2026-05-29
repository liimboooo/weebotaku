import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Clock, Film, Home, LogOut, Settings, Sparkles, User } from 'lucide-react';
import authService from '../services/authService';
import './Sidebar.css';

const TOP_ITEMS = [
  { icon: Home, label: 'Home', path: '/home', accent: 'purple' },
  { icon: Film, label: 'Browse', path: '/browse/anime', accent: 'pink' },
];

const BOTTOM_ITEMS = [
  { icon: User, label: 'Profile', path: '/profile', auth: true, accent: 'cyan' },
  { icon: Clock, label: 'History', path: '/history', accent: 'purple' },
  { icon: Bookmark, label: 'Watchlist', path: '/watchlist', accent: 'pink' },
  { icon: Settings, label: 'Settings', path: '/settings', accent: 'blue' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isLoggedIn = authService.isLoggedIn();

  useEffect(() => {
    const onToggle = () => setOpen(v => !v);
    window.addEventListener('sidebar-toggle', onToggle);
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('sidebar-toggle', onToggle);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const go = (path) => { navigate(path); setOpen(false); };

  const isActive = (p) => {
    if (p === '/home') return location.pathname === '/home';
    return location.pathname.startsWith(p);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="sd-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`sd-drawer${open ? ' open' : ''}`}>
        <div className="sd-ambient sd-ambient--top" />
        <div className="sd-ambient sd-ambient--bottom" />

        <div className="sd-header">
          <button className="sd-brand" onClick={() => go('/home')}>
            <span className="sd-brand-mark">
              <Sparkles size={14} strokeWidth={2.5} />
            </span>
            <span className="sd-brand-text">
              Anime<span className="brand-dim">Wch</span>
            </span>
          </button>
          <span className="sd-brand-badge">PREMIUM</span>
        </div>

        <div className="sd-section-label">Discover</div>
        <nav className="sd-nav">
          {TOP_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                className={`sd-item sd-item--${item.accent}${active ? ' active' : ''}`}
                onClick={() => go(item.path)}
              >
                <span className="sd-item-indicator" />
                <span className="sd-item-icon-wrap">
                  <Icon size={17} strokeWidth={2.1} />
                </span>
                <span className="sd-item-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sd-divider" />

        <div className="sd-section-label">Library</div>
        <div className="sd-bottom">
          {BOTTOM_ITEMS.map(item => {
            const Icon = item.icon;
            if (item.auth && !isLoggedIn) return null;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                className={`sd-item sd-item--${item.accent}${active ? ' active' : ''}`}
                onClick={() => go(item.path)}
              >
                <span className="sd-item-indicator" />
                <span className="sd-item-icon-wrap">
                  <Icon size={17} strokeWidth={2.1} />
                </span>
                <span className="sd-item-label">{item.label}</span>
              </button>
            );
          })}

          {isLoggedIn && (
            <>
              <div className="sd-divider sd-divider--tight" />
              <button
                className="sd-item sd-item--danger"
                onClick={async () => { await authService.logout(); setOpen(false); navigate('/home'); }}
              >
                <span className="sd-item-indicator" />
                <span className="sd-item-icon-wrap">
                  <LogOut size={17} strokeWidth={2.1} />
                </span>
                <span className="sd-item-label">Sign Out</span>
              </button>
            </>
          )}

          <div className="sd-footer">
            <span className="sd-footer-dot" />
            <span className="sd-footer-text">v2.0 · All systems normal</span>
          </div>
        </div>
      </aside>
    </>
  );
}
