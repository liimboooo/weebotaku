import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Calendar, Clock, Film, Home, LogOut, Settings, User } from 'lucide-react';
import authService from '../services/authService';
import './Sidebar.css';

const TOP_ITEMS = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Film, label: 'Browse', path: '/browse/anime' },
  { icon: Calendar, label: 'Schedule', path: '/schedule' },
];

const BOTTOM_ITEMS = [
  { icon: User, label: 'Profile', path: '/profile', auth: true },
  { icon: Clock, label: 'History', path: '/history' },
  { icon: Bookmark, label: 'Watchlist', path: '/watchlist' },
  { icon: Settings, label: 'Settings', path: '/settings' },
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
        <div className="sd-header">
          <button className="sd-brand" onClick={() => go('/home')}>
            <span className="sd-brand-dot" />
            <span className="sd-brand-text">AnimeWch</span>
          </button>
        </div>

        <nav className="sd-nav">
          {TOP_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                className={`sd-item${active ? ' active' : ''}`}
                onClick={() => go(item.path)}
              >
                <Icon size={16} strokeWidth={1.75} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sd-rule" />

        <div className="sd-bottom">
          {BOTTOM_ITEMS.map(item => {
            const Icon = item.icon;
            if (item.auth && !isLoggedIn) return null;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                className={`sd-item${active ? ' active' : ''}`}
                onClick={() => go(item.path)}
              >
                <Icon size={16} strokeWidth={1.75} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {isLoggedIn && (
            <>
              <div className="sd-rule" />
              <button
                className="sd-item sd-item--danger"
                onClick={async () => { await authService.logout(); setOpen(false); navigate('/home'); }}
              >
                <LogOut size={16} strokeWidth={1.75} />
                <span>Sign out</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
