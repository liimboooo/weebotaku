import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Film, Home, Settings, Clock } from 'lucide-react';
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
  const path = location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  const navigateTo = (p) => { navigate(p); setMobileOpen(false); };

  const isActive = (itemPath) => {
    if (itemPath === '/home') return path === '/home';
    return path.startsWith(itemPath);
  };

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="sidebar-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-bg" />
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button key={item.path} className={`sidebar-item${active ? ' active' : ''}`} onClick={() => navigateTo(item.path)} title={item.label}>
                <span className="sidebar-item-icon"><Icon size={20} /></span>
                <span className="sidebar-item-label">{item.label}</span>
                {active && <span className="sidebar-item-glow" />}
              </button>
            );
          })}
        </nav>
      </aside>

      <button className="sidebar-toggle" onClick={() => setMobileOpen(v => !v)} aria-label="Toggle navigation">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {mobileOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
        </svg>
      </button>
    </>
  );
}
