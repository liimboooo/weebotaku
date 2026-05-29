import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Clock, Film, Home, LogOut, Settings, User } from 'lucide-react';
import authService from '../services/authService';
import './Sidebar.css';

const TOP_ITEMS = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Film, label: 'Browse', path: '/browse/anime' },
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
            Anime<span className="brand-dim">Wch</span>
          </button>
        </div>

        <nav className="sd-nav">
          {TOP_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className={`sd-item${isActive(item.path) ? ' active' : ''}`}
                onClick={() => go(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sd-divider" />

        <div className="sd-bottom">
          {BOTTOM_ITEMS.map(item => {
            const Icon = item.icon;
            if (item.auth && !authService.isLoggedIn()) return null;
            return (
              <button
                key={item.path}
                className={`sd-item${isActive(item.path) ? ' active' : ''}`}
                onClick={() => go(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
          {authService.isLoggedIn() && (
            <>
              <div className="sd-divider" />
              <button
                className="sd-item sd-item--danger"
                onClick={async () => { await authService.logout(); setOpen(false); navigate('/home'); }}
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
