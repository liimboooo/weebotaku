import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Sparkles } from 'lucide-react';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleSidebar = () => window.dispatchEvent(new CustomEvent('sidebar-toggle'));

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      inputRef.current?.blur();
    }
  };

  const isHome = location.pathname === '/home' || location.pathname === '/';

  return (
    <nav className={`top-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="top-nav-bg" />
      <div className="top-nav-accent-line" />

      <div className="top-nav-left">
        <button className="top-nav-hamburger" onClick={toggleSidebar} aria-label="Toggle navigation">
          <span className="hamburger-glow" />
          <Menu size={18} strokeWidth={2.2} />
        </button>

        <button className="top-nav-brand" onClick={() => navigate('/home')} aria-label="Home">
          <span className="brand-mark">
            <span className="brand-mark-inner">
              <Sparkles size={12} strokeWidth={2.5} />
            </span>
          </span>
          <span className="brand-text">
            Anime<span className="brand-highlight">Wch</span>
          </span>
        </button>
      </div>

      <div className="top-nav-right">
        <div className={`top-nav-search${searchFocused ? ' is-focused' : ''}`}>
          <div className="search-glow" />
          <Search size={14} className="top-nav-search-icon" strokeWidth={2.2} />
          <input
            ref={inputRef}
            type="text"
            placeholder={isHome ? 'Search anime, characters...' : 'Search anime...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <span className="search-kbd">⌘K</span>
        </div>
      </div>
    </nav>
  );
}
