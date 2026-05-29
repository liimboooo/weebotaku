import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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

  return (
    <nav className={`top-nav${scrolled ? ' is-scrolled' : ''}`}>
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
        <div className="top-nav-search">
          <Search size={13} className="top-nav-search-icon" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
          <span className="search-kbd">⌘K</span>
        </div>
      </div>
    </nav>
  );
}
